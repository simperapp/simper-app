package app.simper.tvplayer.data.remote

import android.util.Log
import app.simper.tvplayer.SimperApplication
import app.simper.tvplayer.data.model.MediaItem
import app.simper.tvplayer.data.model.PlaybackProof
import app.simper.tvplayer.data.model.PlaylistItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Cliente HTTP conectado diretamente à instância de produção do Supabase.
 */
class TvApiClient(
    private val supabaseUrl: String = "https://gnzkagrbdoxmlqawmyrs.supabase.co",
    private val supabaseAnonKey: String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduemthZ3JiZG94bWxxYXdteXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMzQ1MzQsImV4cCI6MjEwOTkxMDUzNH0.kDmLH2kAQx-IB2RPpDhwHbb4rsSrBQC7if3bYkGs5IU"
) {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    /**
     * Consulta as configurações mais recentes da TV (Rotação, Status, Playlist, Play/Pause).
     */
    suspend fun fetchDevice(pairingCode: String): JSONObject? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/devices?pairing_code=eq.$pairingCode&select=*")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful && response.body != null) {
                val array = JSONArray(response.body!!.string())
                if (array.length() > 0) {
                    return@withContext array.getJSONObject(0)
                }
            }
        } catch (e: Exception) {
            Log.w(SimperApplication.TAG, "Erro ao buscar config da TV: ${e.message}")
        }
        null
    }

    /**
     * Registra o dispositivo no Supabase para gerar o código de pareamento,
     * ou consulta o status do pareamento pelo pairing_code.
     */
    suspend fun getOrRegisterDevice(pairingCode: String, fingerprint: String): JSONObject? = withContext(Dispatchers.IO) {
        try {
            // 1. Tenta buscar o dispositivo no banco pelo fingerprint ou código
            val getRequest = Request.Builder()
                .url("$supabaseUrl/rest/v1/devices?pairing_code=eq.$pairingCode&select=*")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .build()

            val getResponse = httpClient.newCall(getRequest).execute()
            if (getResponse.isSuccessful && getResponse.body != null) {
                val array = JSONArray(getResponse.body!!.string())
                if (array.length() > 0) {
                    return@withContext array.getJSONObject(0)
                }
            }

            // 2. Se não existir, insere para que apareça no painel
            val payload = """
                {
                    "pairing_code": "$pairingCode",
                    "device_fingerprint": "$fingerprint",
                    "name": "TV Aiwa 32 ($pairingCode)",
                    "status": "online",
                    "orientation": "landscape",
                    "rotation_degrees": 0,
                    "screen_resolution": "1366x768",
                    "app_version": "v1.0.0",
                    "os_info": "Android TV 14"
                }
            """.trimIndent()

            val insertRequest = Request.Builder()
                .url("$supabaseUrl/rest/v1/devices")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .header("Prefer", "return=representation")
                .post(payload.toRequestBody(jsonMediaType))
                .build()

            val insertResponse = httpClient.newCall(insertRequest).execute()
            if (insertResponse.isSuccessful && insertResponse.body != null) {
                val array = JSONArray(insertResponse.body!!.string())
                if (array.length() > 0) {
                    return@withContext array.getJSONObject(0)
                }
            }
            null
        } catch (e: Exception) {
            Log.e(SimperApplication.TAG, "Erro ao registrar/buscar dispositivo no Supabase: ${e.message}")
            null
        }
    }

    /**
     * Busca a lista de mídias ativas no Supabase para a TV reproduzir.
     */
    suspend fun fetchActiveMedia(): List<PlaylistItem> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/media_items?select=*&order=created_at.desc&limit=20")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful && response.body != null) {
                val array = JSONArray(response.body!!.string())
                val list = mutableListOf<PlaylistItem>()

                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val mediaItem = MediaItem(
                        id = obj.getString("id"),
                        title = obj.getString("title"),
                        type = obj.getString("type"),
                        url = obj.getString("public_url"),
                        checksumSha256 = obj.optString("checksum_sha256", "hash_$i"),
                        durationSeconds = obj.optInt("duration_seconds", 10),
                        width = obj.optInt("width", 1920),
                        height = obj.optInt("height", 1080)
                    )
                    list.add(
                        PlaylistItem(
                            id = "item_$i",
                            playlistId = "main_playlist",
                            mediaItem = mediaItem,
                            displayOrder = i + 1,
                            customDurationSeconds = mediaItem.durationSeconds
                        )
                    )
                }
                return@withContext list
            }
        } catch (e: Exception) {
            Log.e(SimperApplication.TAG, "Erro ao buscar mídias do Supabase: ${e.message}")
        }
        emptyList()
    }

    /**
     * Envia o sinal de vida (Heartbeat / Ping) da Smart TV para o painel de monitoramento.
     */
    suspend fun sendHeartbeat(
        deviceId: String,
        freeStorageMb: Long,
        totalStorageMb: Long,
        appVersion: String
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val payload = """
                {
                    "status": "online",
                    "storage_free_mb": $freeStorageMb,
                    "storage_total_mb": $totalStorageMb,
                    "app_version": "$appVersion"
                }
            """.trimIndent()

            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/devices?id=eq.$deviceId")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .header("Prefer", "return=minimal")
                .patch(payload.toRequestBody(jsonMediaType))
                .build()

            val response = httpClient.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            Log.w(SimperApplication.TAG, "Falha no ping para Supabase: ${e.message}")
            false
        }
    }

    /**
     * Envia comprovação de reprodução (Proof-of-Play) para auditoria comercial.
     */
    suspend fun sendPlaybackProof(proof: PlaybackProof): Boolean = withContext(Dispatchers.IO) {
        try {
            val payload = """
                {
                    "device_id": "${proof.deviceId}",
                    "media_item_id": "${proof.mediaItemId}",
                    "duration_played_seconds": ${proof.durationSeconds}
                }
            """.trimIndent()

            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/playback_proofs")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .header("Prefer", "return=minimal")
                .post(payload.toRequestBody(jsonMediaType))
                .build()

            val response = httpClient.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            Log.w(SimperApplication.TAG, "Falha ao registrar Proof-of-Play: ${e.message}")
            false
        }
    }
}
