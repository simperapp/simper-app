package app.simper.tvplayer.domain

import android.content.Context
import android.provider.Settings
import android.util.Log
import app.simper.tvplayer.SimperApplication
import app.simper.tvplayer.data.local.LocalMediaCacheManager
import app.simper.tvplayer.data.model.MediaItem
import app.simper.tvplayer.data.model.PlaybackProof
import app.simper.tvplayer.data.model.PlaylistItem
import app.simper.tvplayer.data.remote.TvApiClient
import kotlinx.coroutines.*

class SyncManager(
    private val context: Context,
    private val cacheManager: LocalMediaCacheManager,
    private val apiClient: TvApiClient
) {

    private val syncScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var heartbeatJob: Job? = null

    // Identificador persistente da TV
    val deviceFingerprint: String by lazy {
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "AIWA-SIMPER-DEVICE-01"
    }

    // Código de 6 caracteres gerado para vincular no site
    val pairingCode: String by lazy {
        val prefs = context.getSharedPreferences("simper_prefs", Context.MODE_PRIVATE)
        val saved = prefs.getString("pairing_code", null)
        if (saved != null) return@lazy saved

        val chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        val code = "SMP" + (1..3).map { chars.random() }.joinToString("")
        prefs.edit().putString("pairing_code", code).apply()
        code
    }

    /**
     * Inicia o monitoramento de batimento cardíaco (Heartbeat) a cada 60 segundos.
     */
    fun startHeartbeat(deviceId: String) {
        heartbeatJob?.cancel()
        heartbeatJob = syncScope.launch {
            while (isActive) {
                val freeMb = cacheManager.getFreeStorageMb()
                val totalMb = cacheManager.getTotalStorageMb()
                apiClient.sendHeartbeat(deviceId, freeMb, totalMb, "v1.0.0")
                delay(60_000L) // 60 segundos
            }
        }
    }

    /**
     * Baixa todas as mídias da playlist para o cache local de forma assíncrona.
     */
    suspend fun cachePlaylistMedia(items: List<PlaylistItem>) = withContext(Dispatchers.IO) {
        for (item in items) {
            try {
                cacheManager.downloadMedia(item.mediaItem)
            } catch (e: Exception) {
                Log.e(SimperApplication.TAG, "Erro ao colocar mídia em cache: ${e.message}")
            }
        }
    }

    /**
     * Envia comprovante de reprodução para auditoria comercial.
     */
    fun recordProofOfPlay(deviceId: String, mediaItem: MediaItem, durationSeconds: Int) {
        syncScope.launch {
            val proof = PlaybackProof(
                deviceId = deviceId,
                mediaItemId = mediaItem.id,
                playedAtTimestamp = System.currentTimeMillis(),
                durationSeconds = durationSeconds
            )
            apiClient.sendPlaybackProof(proof)
        }
    }

    fun stop() {
        heartbeatJob?.cancel()
        syncScope.cancel()
    }
}
