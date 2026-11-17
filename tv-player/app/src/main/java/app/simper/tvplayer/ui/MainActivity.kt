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
import app.simper.tvplayer.data.remote.ServerConfig
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
    private var lastMediaFetchMs = 0L
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
        val savedRotation = prefs.getInt("rotation_degrees", 0)

        // Aplica rotação salva imediatamente no boot da TV (sem esperar internet)
        if (savedRotation != 0) {
            currentRotation = savedRotation
            OrientationController.applyOrientation(this, binding.rootContainer, savedRotation)
        }

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
        apiClient = TvApiClient(this)
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
     * Sincronização da TV: consulta Supabase e Servidor Local para comandos em tempo real
     * (Rotação 90°, Play/Pause, Novas Mídias e Heartbeat).
     */
    private fun startCloudSyncWorkflow() {
        cloudSyncJob?.cancel()
        cloudSyncJob = lifecycleScope.launch(Dispatchers.IO) {
            val code = syncManager.pairingCode
            val fingerprint = syncManager.deviceFingerprint
            val prefs = getSharedPreferences("simper_prefs", Context.MODE_PRIVATE)

            // 0. Busca o servidor Supabase atual no tv-config.json remoto (troca sem reinstalar APK)
            ServerConfig.refreshFromRemote(this@MainActivity)
            var lastConfigCheckMs = System.currentTimeMillis()
            var lastRegisterTryMs = 0L
            var deviceJson: JSONObject? = null
            var attempts = 0
            while (isActive && deviceJson == null && attempts < 2) {
                attempts++
                deviceJson = apiClient.getOrRegisterDevice(code, fingerprint)
                if (deviceJson == null) {
                    delay(1500L)
                }
            }

            if (deviceJson == null) {
                val savedRot = prefs.getInt("rotation_degrees", currentRotation)
                deviceJson = JSONObject().apply {
                    put("id", "tv_$code")
                    put("pairing_code", code)
                    put("rotation_degrees", savedRot)
                    put("status", "online")
                    put("is_playing", true)
                }
                Log.w(SimperApplication.TAG, "Usando perfil local da TV enquanto Supabase sincroniza.")
            }

            currentDeviceId = deviceJson.optString("id", "tv_$code")
            val initialRotation = deviceJson.optInt("rotation_degrees", currentRotation)
            if (initialRotation != currentRotation) {
                currentRotation = initialRotation
            }

            withContext(Dispatchers.Main) {
                OrientationController.applyOrientation(this@MainActivity, binding.rootContainer, currentRotation)
                binding.statusText.text = "TV Conectada ao Sistema!\nCódigo: $code\nSincronizando mídias e comandos..."
            }

            // Inicia Heartbeat
            currentDeviceId?.let { syncManager.startHeartbeat(it) }

            // 2. Loop de verificação de comandos remotos (Rotação, Play/Pause) e mídias
            while (isActive) {
                try {
                    // 0. A cada 10 min confere se o servidor foi trocado no tv-config.json
                    val loopNow = System.currentTimeMillis()
                    if (loopNow - lastConfigCheckMs >= 600_000L) {
                        lastConfigCheckMs = loopNow
                        if (ServerConfig.refreshFromRemote(this@MainActivity)) {
                            Log.i(SimperApplication.TAG, "Servidor alterado remotamente. Reconectando...")
                            withContext(Dispatchers.Main) { startCloudSyncWorkflow() }
                            return@launch
                        }
                    }

                    // 0.1 Se ainda está com perfil local (cadastro falhou), tenta cadastrar de novo a cada 30s
                    if (currentDeviceId?.startsWith("tv_") == true && loopNow - lastRegisterTryMs >= 30_000L) {
                        lastRegisterTryMs = loopNow
                        apiClient.getOrRegisterDevice(code, fingerprint)?.optString("id", "")?.takeIf { it.isNotEmpty() }?.let { realId ->
                            currentDeviceId = realId
                            syncManager.startHeartbeat(realId)
                            Log.i(SimperApplication.TAG, "TV cadastrada no Supabase: $realId")
                        }
                    }

                    // A. Sincroniza configurações da TV (Rotação, Transição, Play/Pause, Próximo/Anterior)
                    val dev = apiClient.fetchDevice(code)
                    if (dev != null) {
                        // 1. Rotação em tempo real (0°, 90°, 180°, 270°)
                        val rotation = dev.optInt("rotation_degrees", currentRotation)
                        if (rotation != currentRotation) {
                            currentRotation = rotation
                            prefs.edit().putInt("rotation_degrees", rotation).apply()
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
                    // (a cada ~30s para não estourar a cota de tráfego do Supabase)
                    val nowMs = System.currentTimeMillis()
                    val mediaList = if (!isPlayingMode || nowMs - lastMediaFetchMs >= 30_000L) {
                        lastMediaFetchMs = nowMs
                        apiClient.fetchActiveMedia()
                    } else emptyList()
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
        // Configuração do servidor: botão VERMELHO, tecla SETTINGS, ou MENU na tela de pareamento
        if (keyCode == KeyEvent.KEYCODE_PROG_RED || keyCode == KeyEvent.KEYCODE_SETTINGS ||
            (keyCode == KeyEvent.KEYCODE_MENU && !isPlayingMode)
        ) {
            showServerConfigDialog()
            return true
        }
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

        // Controle Remoto Físico da TV: Girar Tela 90° com a Seta para CIMA ou Tecla AMARELA
        if (keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_PROG_YELLOW) {
            val nextRot = when (currentRotation) {
                0 -> 90
                90 -> 270
                270 -> 180
                else -> 0
            }
            currentRotation = nextRot
            val prefs = getSharedPreferences("simper_prefs", Context.MODE_PRIVATE)
            prefs.edit().putInt("rotation_degrees", nextRot).apply()
            OrientationController.applyOrientation(this, binding.rootContainer, nextRot)
            android.widget.Toast.makeText(this, "Rotação da Tela: $nextRot°", android.widget.Toast.LENGTH_SHORT).show()
            Log.i(SimperApplication.TAG, "Controle Remoto TV: Tela girada para $nextRot°")
            return true
        }

        // Controle Remoto Físico da TV: Girar Tela com a Seta para BAIXO ou Tecla AZUL
        if (keyCode == KeyEvent.KEYCODE_DPAD_DOWN || keyCode == KeyEvent.KEYCODE_PROG_BLUE) {
            val nextRot = when (currentRotation) {
                0 -> 270
                270 -> 90
                90 -> 0
                else -> 0
            }
            currentRotation = nextRot
            val prefs = getSharedPreferences("simper_prefs", Context.MODE_PRIVATE)
            prefs.edit().putInt("rotation_degrees", nextRot).apply()
            OrientationController.applyOrientation(this, binding.rootContainer, nextRot)
            android.widget.Toast.makeText(this, "Rotação da Tela: $nextRot°", android.widget.Toast.LENGTH_SHORT).show()
            Log.i(SimperApplication.TAG, "Controle Remoto TV: Tela girada para $nextRot°")
            return true
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

    /** Tela para trocar o servidor Supabase pelo controle remoto, sem reinstalar o APK. */
    private fun showServerConfigDialog() {
        val pad = (24 * resources.displayMetrics.density).toInt()
        val urlInput = android.widget.EditText(this).apply {
            hint = "https://xxxx.supabase.co"
            setText(ServerConfig.url(this@MainActivity))
            isSingleLine = true
        }
        val keyInput = android.widget.EditText(this).apply {
            hint = "anon key (eyJ...)"
            setText(ServerConfig.key(this@MainActivity))
            isSingleLine = true
        }
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(pad, pad / 2, pad, 0)
            addView(android.widget.TextView(context).apply { text = "URL do Supabase" })
            addView(urlInput)
            addView(android.widget.TextView(context).apply { text = "Anon key" })
            addView(keyInput)
        }

        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Servidor Simper")
            .setView(layout)
            .setPositiveButton("Salvar") { _, _ ->
                val u = urlInput.text.toString().trim()
                val k = keyInput.text.toString().trim()
                if (!ServerConfig.isValid(u, k)) {
                    android.widget.Toast.makeText(this, "URL ou chave inválida", android.widget.Toast.LENGTH_LONG).show()
                } else {
                    ServerConfig.save(this, u, k)
                    android.widget.Toast.makeText(this, "Servidor salvo. Reconectando...", android.widget.Toast.LENGTH_SHORT).show()
                    currentDeviceId = null
                    startCloudSyncWorkflow()
                }
            }
            .setNeutralButton("Atualizar da nuvem") { _, _ ->
                lifecycleScope.launch {
                    val changed = ServerConfig.refreshFromRemote(this@MainActivity)
                    android.widget.Toast.makeText(
                        this@MainActivity,
                        if (changed) "Servidor atualizado. Reconectando..." else "Configuração já está atualizada",
                        android.widget.Toast.LENGTH_SHORT
                    ).show()
                    startCloudSyncWorkflow()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    override fun onDestroy() {
        super.onDestroy()
        cloudSyncJob?.cancel()
        overlayHideJob?.cancel()
        playbackEngine?.release()
        syncManager.stop()
    }
}
