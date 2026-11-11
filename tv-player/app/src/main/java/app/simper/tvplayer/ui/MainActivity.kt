package app.simper.tvplayer.ui

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import app.simper.tvplayer.SimperApplication
import app.simper.tvplayer.data.local.LocalMediaCacheManager
import app.simper.tvplayer.data.model.MediaItem
import app.simper.tvplayer.data.model.PlaylistItem
import app.simper.tvplayer.data.remote.TvApiClient
import app.simper.tvplayer.databinding.ActivityMainBinding
import app.simper.tvplayer.domain.OrientationController
import app.simper.tvplayer.domain.PlaybackEngine
import app.simper.tvplayer.domain.SyncManager
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * Activity Principal do Simper TV Player conectada diretamente ao Supabase em nuvem.
 * 
 * Regra de Negócio:
 * - O código de pareamento só é exibido na primeira configuração.
 * - Após pareada, a TV salva o estado localmente e nas próximas inicializações
 *   vai direto para o Player, sem pedir código novamente.
 * - Suporta inicialização offline tocando a última playlist salva no cache local.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var cacheManager: LocalMediaCacheManager
    private lateinit var apiClient: TvApiClient
    private lateinit var syncManager: SyncManager
    private var playbackEngine: PlaybackEngine? = null

    private var isPlayingMode = false
    private var currentDeviceId: String? = null
    private var currentRotation = 0
    private var currentRemoteIndex = -1
    private var currentRemotePlaying = true
    private var currentTransition = "fade"
    private var lastPlaylistFingerprint = ""
    private var cloudSyncJob: Job? = null
    private var overlayHideJob: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        enableKioskFlags()
        startKioskService()
        initServices()

        val prefs = getSharedPreferences("simper_prefs", Context.MODE_PRIVATE)
        val isPaired = prefs.getBoolean("is_paired", false)

        val code = syncManager.pairingCode
        binding.pairingCodeText.text = code
        binding.overlayCodeText.text = code

        if (isPaired) {
            // TV JÁ FOI PAREADA ANTERIORMENTE:
            // Não exibe a tela de pareamento. Inicia direto no modo player!
            val cachedMedia = loadCachedPlaylist()
            if (cachedMedia.isNotEmpty()) {
                startPlayback(cachedMedia)
            } else {
                // Se ainda não tem cache de arquivo, prepara o player e aguarda a nuvem
                isPlayingMode = true
                binding.pairingContainer.visibility = View.GONE
                binding.playerContainer.visibility = View.VISIBLE
            }
        } else {
            // PRIMEIRA INICIALIZAÇÃO:
            showPairingScreen()
        }

        startCloudSyncWorkflow()
    }

    override fun onResume() {
        super.onResume()
        enableKioskFlags()
        if (isPlayingMode) {
            playbackEngine?.start()
        }
    }

    private fun startKioskService() {
        try {
            val serviceIntent = Intent(this, app.simper.tvplayer.service.KioskService::class.java)
            androidx.core.content.ContextCompat.startForegroundService(this, serviceIntent)
        } catch (e: Exception) {
            Log.w(SimperApplication.TAG, "Falha ao iniciar KioskService: ${e.message}")
        }
    }

    private fun enableKioskFlags() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
        }
    }

    private fun initServices() {
        cacheManager = LocalMediaCacheManager(this)
        apiClient = TvApiClient()
        syncManager = SyncManager(this, cacheManager, apiClient)

        playbackEngine = PlaybackEngine(
            context = this,
            playerView = binding.playerView,
            imageView = binding.mediaImageView,
            cacheManager = cacheManager,
            onProofOfPlay = { mediaItem, duration ->
                currentDeviceId?.let { id ->
                    syncManager.recordProofOfPlay(id, mediaItem, duration)
                }
            }
        )
    }

    private fun showPairingScreen() {
        isPlayingMode = false
        playbackEngine?.stop()
        binding.playerContainer.visibility = View.GONE
        binding.pairingContainer.visibility = View.VISIBLE
    }

    private fun startPlayback(mediaList: List<PlaylistItem>) {
        isPlayingMode = true
        binding.pairingContainer.visibility = View.GONE
        binding.playerContainer.visibility = View.VISIBLE
        binding.playerOverlay.visibility = View.GONE
        overlayHideJob?.cancel()

        // Salva que a TV foi pareada com sucesso para nunca mais pedir código ao reiniciar
        saveCachedPlaylist(mediaList)

        playbackEngine?.setPlaylist(mediaList)
        playbackEngine?.start()
    }

    private fun toggleOverlayVisibility() {
        overlayHideJob?.cancel()
        if (binding.playerOverlay.visibility == View.VISIBLE) {
            binding.playerOverlay.visibility = View.GONE
        } else {
            binding.playerOverlay.visibility = View.VISIBLE
            overlayHideJob = lifecycleScope.launch {
                delay(6000L)
                binding.playerOverlay.visibility = View.GONE
            }
        }
    }

    /**
     * Sincronização em nuvem com o Supabase:
     * 1. Registra a TV no banco e obtém status
     * 2. Monitora a adição de novas mídias e rotação
     */
    private fun startCloudSyncWorkflow() {
        cloudSyncJob?.cancel()
        cloudSyncJob = lifecycleScope.launch(Dispatchers.IO) {
            val code = syncManager.pairingCode
            val fingerprint = syncManager.deviceFingerprint

            // 1. Registra no banco para o código aparecer no painel
            var deviceJson: JSONObject? = null
            while (isActive && deviceJson == null) {
                deviceJson = apiClient.getOrRegisterDevice(code, fingerprint)
                if (deviceJson == null) {
                    delay(5000L)
                }
            }

            if (deviceJson != null) {
                currentDeviceId = deviceJson.optString("id", "")
                val rotation = deviceJson.optInt("rotation_degrees", 0)

                withContext(Dispatchers.Main) {
                    OrientationController.applyOrientation(this@MainActivity, binding.rootContainer, rotation)
                    binding.statusText.text = "Conectado ao Supabase!\nCódigo: $code\nSincronizando com o painel web..."
                }
            }

            // Inicia Heartbeat
            currentDeviceId?.let { syncManager.startHeartbeat(it) }

            // 2. Loop de verificação de comandos remotos (Rotação, Play/Pause) e mídias
            while (isActive) {
                try {
                    // A. Sincroniza configurações da TV (Rotação, Transição, Play/Pause, Próximo/Anterior)
                    val dev = apiClient.fetchDevice(code)
                    if (dev != null) {
                        // 1. Rotação em tempo real
                        val rotation = dev.optInt("rotation_degrees", 0)
                        if (rotation != currentRotation) {
                            currentRotation = rotation
                            Log.i(SimperApplication.TAG, "Comando de rotação recebido: $rotation°")
                            withContext(Dispatchers.Main) {
                                OrientationController.applyOrientation(this@MainActivity, binding.rootContainer, rotation)
                            }
                        }

                        // 2. Estilo de Transição (fade, cut, slide, zoom)
                        val transition = dev.optString("transition", "fade")
                        if (transition != currentTransition) {
                            currentTransition = transition
                            withContext(Dispatchers.Main) {
                                playbackEngine?.setTransition(transition)
                            }
                        }

                        // 3. Play / Pause Remoto
                        val isPlayingRemote = dev.optBoolean("is_playing", true)
                        if (isPlayingRemote != currentRemotePlaying) {
                            currentRemotePlaying = isPlayingRemote
                            withContext(Dispatchers.Main) {
                                if (isPlayingRemote) {
                                    playbackEngine?.resume()
                                } else {
                                    playbackEngine?.pause()
                                }
                            }
                        }

                        // 4. Navegação Remota (Próximo / Anterior do Dashboard)
                        if (dev.has("current_media_index")) {
                            val targetIdx = dev.optInt("current_media_index", -1)
                            if (targetIdx >= 0 && targetIdx != currentRemoteIndex) {
                                currentRemoteIndex = targetIdx
                                withContext(Dispatchers.Main) {
                                    playbackEngine?.skipToIndex(targetIdx)
                                }
                            }
                        }
                    }

                    // B. Sincroniza mídias ativas e mudanças de duração
                    val mediaList = apiClient.fetchActiveMedia()
                    if (mediaList.isNotEmpty()) {
                        // Marca como pareada permanentemente
                        val prefs = getSharedPreferences("simper_prefs", Context.MODE_PRIVATE)
                        if (!prefs.getBoolean("is_paired", false)) {
                            prefs.edit().putBoolean("is_paired", true).apply()
                        }

                        // Fingerprint inclui ID, URL e DURAÇÃO para detectar qualquer ajuste de tempo na tela
                        val currentFingerprint = mediaList.joinToString(";") { 
                            "${it.mediaItem.id}_${it.mediaItem.url}_${it.customDurationSeconds ?: it.mediaItem.durationSeconds}" 
                        }
                        if (currentFingerprint != lastPlaylistFingerprint || !isPlayingMode) {
                            lastPlaylistFingerprint = currentFingerprint
                            Log.i(SimperApplication.TAG, "Carregando ${mediaList.size} mídias atualizadas do Supabase!")

                            withContext(Dispatchers.Main) {
                                startPlayback(mediaList)
                            }

                            // Coloca as mídias em cache local
                            syncManager.cachePlaylistMedia(mediaList)
                        }
                    }
                } catch (e: Exception) {
                    Log.w(SimperApplication.TAG, "Falha na sincronização periódica: ${e.message}")
                }
                delay(3000L) // Checa a cada 3 segundos para resposta imediata
            }
        }
    }

    private fun saveCachedPlaylist(mediaList: List<PlaylistItem>) {
        try {
            val jsonArray = JSONArray()
            for (item in mediaList) {
                val obj = JSONObject().apply {
                    put("id", item.mediaItem.id)
                    put("title", item.mediaItem.title)
                    put("type", item.mediaItem.type)
                    put("public_url", item.mediaItem.url)
                    put("duration_seconds", item.mediaItem.durationSeconds)
                    put("checksum_sha256", item.mediaItem.checksumSha256)
                }
                jsonArray.put(obj)
            }
            val prefs = getSharedPreferences("simper_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("cached_playlist_json", jsonArray.toString())
                .putBoolean("is_paired", true)
                .apply()
        } catch (e: Exception) {
            Log.w(SimperApplication.TAG, "Falha ao salvar playlist local: ${e.message}")
        }
    }

    private fun loadCachedPlaylist(): List<PlaylistItem> {
        try {
            val prefs = getSharedPreferences("simper_prefs", Context.MODE_PRIVATE)
            val jsonStr = prefs.getString("cached_playlist_json", null) ?: return emptyList()
            val jsonArray = JSONArray(jsonStr)
            val list = mutableListOf<PlaylistItem>()
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val mediaItem = MediaItem(
                    id = obj.getString("id"),
                    title = obj.getString("title"),
                    type = obj.getString("type"),
                    url = obj.getString("public_url"),
                    checksumSha256 = obj.optString("checksum_sha256", "hash_$i"),
                    durationSeconds = obj.optInt("duration_seconds", 10),
                    width = 1920,
                    height = 1080
                )
                list.add(
                    PlaylistItem(
                        id = "cached_$i",
                        playlistId = "local_cache",
                        mediaItem = mediaItem,
                        displayOrder = i + 1,
                        customDurationSeconds = mediaItem.durationSeconds
                    )
                )
            }
            return list
        } catch (e: Exception) {
            return emptyList()
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || 
            keyCode == KeyEvent.KEYCODE_ENTER || 
            keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER ||
            keyCode == KeyEvent.KEYCODE_BUTTON_A
        ) {
            if (isPlayingMode) {
                toggleOverlayVisibility()
                return true
            } else {
                lifecycleScope.launch(Dispatchers.IO) {
                    val mediaList = apiClient.fetchActiveMedia()
                    withContext(Dispatchers.Main) {
                        if (mediaList.isNotEmpty()) {
                            startPlayback(mediaList)
                        } else {
                            val cached = loadCachedPlaylist()
                            if (cached.isNotEmpty()) {
                                startPlayback(cached)
                            } else {
                                binding.statusText.text = "Nenhuma mídia cadastrada no Supabase ainda.\nEnvie uma foto pelo painel web!"
                            }
                        }
                    }
                }
            }
            return true
        }
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_MENU) {
            if (isPlayingMode) {
                if (binding.playerOverlay.visibility == View.VISIBLE) {
                    binding.playerOverlay.visibility = View.GONE
                    overlayHideJob?.cancel()
                } else {
                    showPairingScreen()
                }
                return true
            }
        }

        // Controle Remoto Físico da TV: Avançar anúncio
        if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT || 
            keyCode == KeyEvent.KEYCODE_MEDIA_NEXT || 
            keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD ||
            keyCode == KeyEvent.KEYCODE_CHANNEL_UP
        ) {
            if (isPlayingMode) {
                playbackEngine?.next()
                return true
            }
        }

        // Controle Remoto Físico da TV: Voltar anúncio
        if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT || 
            keyCode == KeyEvent.KEYCODE_MEDIA_PREVIOUS || 
            keyCode == KeyEvent.KEYCODE_MEDIA_REWIND ||
            keyCode == KeyEvent.KEYCODE_CHANNEL_DOWN
        ) {
            if (isPlayingMode) {
                playbackEngine?.previous()
                return true
            }
        }

        // Controle Remoto Físico da TV: Play / Pause
        if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE || 
            keyCode == KeyEvent.KEYCODE_MEDIA_PLAY || 
            keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE
        ) {
            if (isPlayingMode) {
                playbackEngine?.togglePlayPause()
                return true
            }
        }

        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        cloudSyncJob?.cancel()
        overlayHideJob?.cancel()
        playbackEngine?.release()
        syncManager.stop()
    }
}
