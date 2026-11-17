package app.simper.tvplayer.data.remote

import android.content.Context
import android.util.Log
import app.simper.tvplayer.SimperApplication
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Configuração do servidor (Supabase) SEM precisar reinstalar o APK.
 *
 * Ordem de prioridade:
 * 1. Arquivo remoto tv-config.json (GitHub) -> trocar o Supabase de TODAS as TVs editando 1 arquivo.
 * 2. Valor digitado manualmente na TV (tecla MENU na tela de pareamento).
 * 3. Valor padrão embutido no APK.
 */
object ServerConfig {

    const val DEFAULT_URL = "https://teuedvbusvtelecxsrhp.supabase.co"
    const val DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldWVkdmJ1c3Z0ZWxlY3hzcmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5MjU4MjksImV4cCI6MjExMDUwMTgyOX0._kPqAyaAyi9Q_y6QSFfUNuLy8FotXuBQdK9EkPbjmfE"

    /** Arquivos remotos consultados (o primeiro válido vence). */
    private val REMOTE_CONFIG_URLS = listOf(
        "https://raw.githubusercontent.com/simperapp/simper-app/main/admin-web/public/tv-config.json",
        "https://simperapp.github.io/simper-app/tv-config.json"
    )

    private const val PREFS = "simper_server_config"
    private const val K_URL = "supabase_url"
    private const val K_KEY = "supabase_anon_key"

    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    fun url(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(K_URL, null) ?: DEFAULT_URL

    fun key(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(K_KEY, null) ?: DEFAULT_KEY

    /** Salva manualmente. Retorna true se mudou. */
    fun save(context: Context, url: String, key: String): Boolean {
        val cleanUrl = url.trim().trimEnd('/')
        val cleanKey = key.trim()
        if (!isValid(cleanUrl, cleanKey)) return false
        val changed = cleanUrl != url(context) || cleanKey != key(context)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(K_URL, cleanUrl)
            .putString(K_KEY, cleanKey)
            .apply()
        if (changed) Log.i(SimperApplication.TAG, "Servidor Supabase alterado para $cleanUrl")
        return changed
    }

    fun resetToDefault(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }

    fun isValid(url: String, key: String): Boolean =
        url.startsWith("https://") && url.length > 12 && key.length > 20

    /**
     * Baixa o tv-config.json remoto. Formato:
     * { "supabase_url": "https://xxxx.supabase.co", "supabase_anon_key": "eyJ..." }
     * Retorna true se a configuração mudou.
     */
    suspend fun refreshFromRemote(context: Context): Boolean = withContext(Dispatchers.IO) {
        for (remote in REMOTE_CONFIG_URLS) {
            try {
                val req = Request.Builder().url("$remote?t=${System.currentTimeMillis()}").build()
                http.newCall(req).execute().use { resp ->
                    if (resp.isSuccessful) {
                        val json = JSONObject(resp.body?.string() ?: return@use)
                        val u = json.optString("supabase_url", "")
                        val k = json.optString("supabase_anon_key", "")
                        if (isValid(u, k)) {
                            return@withContext save(context, u, k)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(SimperApplication.TAG, "Config remota indisponível ($remote): ${e.message}")
            }
        }
        false
    }
}
