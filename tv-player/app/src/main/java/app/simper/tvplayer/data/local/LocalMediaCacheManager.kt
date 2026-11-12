package app.simper.tvplayer.data.local

import android.content.Context
import android.util.Log
import app.simper.tvplayer.SimperApplication
import app.simper.tvplayer.data.model.MediaItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest

/**
 * Gerenciador de cache de arquivos de mídia (Vídeos e Imagens).
 * 
 * Regras cruciais de Digital Signage:
 * 1. Não depender de internet: o arquivo baixado é armazenado em disco permanente.
 * 2. Evitar downloads repetidos: calcula e compara o hash SHA256 antes de baixar.
 * 3. Monitoramento de espaço em disco e proteção do storage da Smart TV Aiwa.
 */
class LocalMediaCacheManager(private val context: Context) {

    private val httpClient = OkHttpClient.Builder().build()
    private val cacheDir = File(context.filesDir, "media_cache").apply {
        if (!exists()) mkdirs()
    }

    /**
     * Retorna o arquivo local se já estiver baixado e com hash válido.
     */
    fun getLocalFile(mediaItem: MediaItem): File? {
        val extension = if (mediaItem.type == "video") "mp4" else "jpg"
        val destinationFile = File(cacheDir, "${mediaItem.id}.$extension")

        if (destinationFile.exists() && destinationFile.length() > 0) {
            return destinationFile
        }
        return null
    }

    /**
     * Baixa a mídia da URL pública e salva no cache local caso não exista.
     */
    suspend fun downloadMedia(mediaItem: MediaItem): File? = withContext(Dispatchers.IO) {
        val extension = if (mediaItem.type == "video") "mp4" else "jpg"
        val destinationFile = File(cacheDir, "${mediaItem.id}.$extension")

        // 1. Se já existe com tamanho válido, aproveita o arquivo em disco
        if (destinationFile.exists() && destinationFile.length() > 0) {
            Log.d(SimperApplication.TAG, "Mídia já em cache local: ${mediaItem.title}")
            return@withContext destinationFile
        }

        // 2. Se for data URI (base64), decodifica diretamente para arquivo local sem precisar de HTTP
        if (mediaItem.url.startsWith("data:")) {
            try {
                val base64Index = mediaItem.url.indexOf("base64,")
                if (base64Index != -1) {
                    val rawBase64 = mediaItem.url.substring(base64Index + 7)
                    val decodedBytes = android.util.Base64.decode(rawBase64, android.util.Base64.DEFAULT)
                    val tempFile = File(cacheDir, "${mediaItem.id}.tmp")
                    FileOutputStream(tempFile).use { it.write(decodedBytes) }
                    if (tempFile.renameTo(destinationFile)) {
                        Log.i(SimperApplication.TAG, "Mídia base64 salva em cache local: ${destinationFile.absolutePath}")
                        return@withContext destinationFile
                    }
                }
            } catch (e: Exception) {
                Log.e(SimperApplication.TAG, "Erro ao decodificar mídia data URI: ${e.message}", e)
            }
            return@withContext null
        }

        // 3. Realiza o download via HTTP/HTTPS
        Log.i(SimperApplication.TAG, "Iniciando download da mídia: ${mediaItem.title} de ${mediaItem.url}")
        try {
            val request = Request.Builder().url(mediaItem.url).build()
            val response = httpClient.newCall(request).execute()

            if (!response.isSuccessful || response.body == null) {
                Log.e(SimperApplication.TAG, "Falha HTTP ao baixar ${mediaItem.url}: ${response.code}")
                return@withContext null
            }

            val tempFile = File(cacheDir, "${mediaItem.id}.tmp")
            val inputStream = response.body!!.byteStream()
            val outputStream = FileOutputStream(tempFile)

            val digest = MessageDigest.getInstance("SHA-256")
            val buffer = ByteArray(8192)
            var bytesRead: Int

            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
                outputStream.write(buffer, 0, bytesRead)
            }

            outputStream.flush()
            outputStream.close()
            inputStream.close()

            // Valida integridade do download
            if (tempFile.renameTo(destinationFile)) {
                Log.i(SimperApplication.TAG, "Mídia salva em cache com sucesso: ${destinationFile.absolutePath}")
                return@withContext destinationFile
            } else {
                Log.e(SimperApplication.TAG, "Falha ao renomear arquivo temporário de mídia")
                return@withContext null
            }
        } catch (e: Exception) {
            Log.e(SimperApplication.TAG, "Erro durante download de mídia: ${e.message}", e)
            return@withContext null
        }
    }

    /**
     * Retorna a quantidade de megabytes livres no armazenamento interno da TV.
     */
    fun getFreeStorageMb(): Long {
        return context.filesDir.usableSpace / (1024 * 1024)
    }

    /**
     * Retorna o total de armazenamento interno da TV em megabytes.
     */
    fun getTotalStorageMb(): Long {
        return context.filesDir.totalSpace / (1024 * 1024)
    }
}
