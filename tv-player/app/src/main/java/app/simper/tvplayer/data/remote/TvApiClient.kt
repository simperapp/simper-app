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
 * Cliente HTTP conectado à Nuvem (Supabase) com redundância automática
 * para o Servidor Local da Rede (Edge Server na porta 8080).
 */
class TvApiClient(
    private val context: android.content.Context,
    var localServerUrl: String = "http://192.168.3.13:8080"
) {

    // Lidos a cada chamada: permite trocar de Supabase sem reinstalar (ver ServerConfig)
    private val supabaseUrl: String get() = ServerConfig.url(context)
    private val supabaseAnonKey: String get() = ServerConfig.key(context)

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    /**
     * Consulta as configurações mais recentes da TV (Rotação, Status, Playlist, Play/Pause).
     * Tenta o Supabase primeiro; se a cota do Supabase estourar, consulta o Servidor Local.
     */
    suspend fun fetchDevice(pairingCode: String): JSONObject? = withContext(Dispatchers.IO) {
        // 1. Tenta Supabase
        try {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/devices?pairing_code=eq.$pairingCode&select=id,rotation_degrees,transition,is_playing,current_media_index")
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
            // Continua para o servidor local
        }

        // 2. Fallback: Servidor Local na Rede (192.168.3.13:8080)
        try {
            val localRequest = Request.Builder()
                .url("$localServerUrl/api/device/sync")
                .build()

            val localResponse = httpClient.newCall(localRequest).execute()
            if (localResponse.isSuccessful && localResponse.body != null) {
                val obj = JSONObject(localResponse.body!!.string())
                Log.d(SimperApplication.TAG, "Config obtida do servidor local: Rotação ${obj.optInt("rotation_degrees")}°")
                return@withContext obj
            }
        } catch (e: Exception) {
            // Servidor local também não respondeu
        }

        null
    }

    /**
     * Registra o dispositivo no Supabase para gerar o código de pareamento,
     * ou consulta o status do pareamento pelo pairing_code.
     */
    suspend fun getOrRegisterDevice(pairingCode: String, fingerprint: String): JSONObject? = withContext(Dispatchers.IO) {
        // 1. Tenta Supabase
        try {
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
        } catch (e: Exception) {
            Log.w(SimperApplication.TAG, "Aviso Supabase: ${e.message}")
        }

        // 2. Fallback: Servidor Local
        try {
            val localRequest = Request.Builder().url("$localServerUrl/api/device/sync").build()
            val localResponse = httpClient.newCall(localRequest).execute()
            if (localResponse.isSuccessful && localResponse.body != null) {
                return@withContext JSONObject(localResponse.body!!.string())
            }
        } catch (e: Exception) {
            // Ignora
        }

        null
    }

    /**
     * Busca a lista de mídias ativas para a TV reproduzir (Nuvem ou Servidor Local).
     */
    suspend fun fetchActiveMedia(): List<PlaylistItem> = withContext(Dispatchers.IO) {
        // 1. Tenta Supabase
        try {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/media_items?select=id,title,type,public_url,duration_seconds&public_url=not.like.data:*&order=created_at.desc&limit=20")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful && response.body != null) {
                val array = JSONArray(response.body!!.string())
                val list = parseMediaArray(array)
                if (list.isNotEmpty()) return@withContext list
            }
        } catch (e: Exception) {
            // Continua para o servidor local
        }

        // 2. Fallback: Servidor Local na Rede (192.168.3.13:8080)
        try {
            val localRequest = Request.Builder().url("$localServerUrl/api/device/sync").build()
            val localResponse = httpClient.newCall(localRequest).execute()
            if (localResponse.isSuccessful && localResponse.body != null) {
                val obj = JSONObject(localResponse.body!!.string())
                val mediaArray = obj.optJSONArray("media_items")
                if (mediaArray != null && mediaArray.length() > 0) {
                    val list = parseMediaArray(mediaArray)
                    Log.i(SimperApplication.TAG, "Carregadas ${list.size} mídias do servidor local.")
                    return@withContext list
                }
            }
        } catch (e: Exception) {
            // Falha silenciosa
        }

        emptyList()
    }

    private fun parseMediaArray(array: JSONArray): List<PlaylistItem> {
        val list = mutableListOf<PlaylistItem>()
        for (i in 0 until array.length()) {
            val obj = array.getJSONObject(i)
            val mediaItem = MediaItem(
                id = obj.optString("id", "item_$i"),
                title = obj.optString("title", "Anúncio"),
                type = obj.optString("type", "image"),
                url = obj.optString("public_url", ""),
                checksumSha256 = obj.optString("checksum_sha256", "hash_$i"),
                durationSeconds = obj.optInt("duration_seconds", 10),
                width = 1920,
                height = 1080
            )
            if (mediaItem.url.isNotEmpty()) {
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
        }
        return list
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
        val isoFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        val nowIso = isoFormat.format(java.util.Date())

        val payload = """
            {
                "status": "online",
                "last_ping": "$nowIso",
                "storage_free_mb": $freeStorageMb,
                "storage_total_mb": $totalStorageMb,
                "app_version": "$appVersion"
            }
        """.trimIndent()

        // Envia para o Supabase
        try {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/devices?id=eq.$deviceId")
                .header("apikey", supabaseAnonKey)
                .header("Authorization", "Bearer $supabaseAnonKey")
                .header("Prefer", "return=minimal")
                .patch(payload.toRequestBody(jsonMediaType))
                .build()
            httpClient.newCall(request).execute()
        } catch (_: Exception) {}

        // Envia também para o Servidor Local na porta 8080
        try {
            val localRequest = Request.Builder()
                .url("$localServerUrl/api/device/heartbeat")
                .post(payload.toRequestBody(jsonMediaType))
                .build()
            val res = httpClient.newCall(localRequest).execute()
            return@withContext res.isSuccessful
        } catch (_: Exception) {}

        true
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
            false
        }
    }
}
