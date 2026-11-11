package app.simper.tvplayer.domain

import android.content.Context
import android.net.Uri
import android.util.Log
import android.view.View
import android.widget.ImageView
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem as ExoMediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import app.simper.tvplayer.SimperApplication
import app.simper.tvplayer.data.local.LocalMediaCacheManager
import app.simper.tvplayer.data.model.MediaItem
import app.simper.tvplayer.data.model.PlaylistItem
import coil.load
import kotlinx.coroutines.*

/**
 * Motor de reprodução contínua otimizado para Smart TVs (Aiwa 32" HD).
 * Suporta transições em tempo real (fade, cut, slide, zoom), controle remoto e pause.
 */
class PlaybackEngine(
    private val context: Context,
    private val playerView: PlayerView,
    private val imageView: ImageView,
    private val cacheManager: LocalMediaCacheManager,
    private val onProofOfPlay: (mediaItem: MediaItem, durationSeconds: Int) -> Unit
) {

    private var exoPlayer: ExoPlayer? = null
    private var playlistItems: List<PlaylistItem> = emptyList()
    private var currentIndex = 0
    private var isPlaying = false
    var isPaused: Boolean = false
        private set

    var currentTransition: String = "fade"
        private set

    val currentMediaIndex: Int
        get() = currentIndex

    private val engineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var imageTimerJob: Job? = null

    init {
        initExoPlayer()
    }

    @OptIn(UnstableApi::class)
    private fun initExoPlayer() {
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                2000,  // minBufferMs
                10000, // maxBufferMs
                1000,  // bufferForPlaybackMs
                2000   // bufferForPlaybackAfterRebufferMs
            )
            .build()

        exoPlayer = ExoPlayer.Builder(context)
            .setLoadControl(loadControl)
            .build()
            .apply {
                playerView.player = this
                playerView.useController = false
                repeatMode = Player.REPEAT_MODE_OFF

                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                    .build()
                setAudioAttributes(audioAttributes, false)

                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        when (playbackState) {
                            Player.STATE_READY -> {
                                imageView.visibility = View.GONE
                                playerView.visibility = View.VISIBLE
                            }
                            Player.STATE_ENDED -> {
                                Log.d(SimperApplication.TAG, "Vídeo finalizado com sucesso.")
                                handleItemCompleted()
                            }
                        }
                    }

                    override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                        Log.e(SimperApplication.TAG, "ExoPlayer erro: ${error.message}. Pulando...")
                        handleItemCompleted()
                    }
                })
            }
    }

    fun setPlaylist(items: List<PlaylistItem>) {
        this.playlistItems = items
        if (currentIndex >= items.size) {
            currentIndex = 0
        }
    }

    fun setTransition(transition: String) {
        val clean = transition.trim().lowercase()
        if (clean in listOf("fade", "cut", "slide", "zoom")) {
            this.currentTransition = clean
            Log.i(SimperApplication.TAG, "Estilo de transição aplicado: $clean")
        }
    }

    fun start() {
        if (playlistItems.isEmpty()) return
        isPlaying = true
        isPaused = false
        playCurrentItem()
    }

    fun stop() {
        isPlaying = false
        imageTimerJob?.cancel()
        exoPlayer?.stop()
    }

    fun pause() {
        isPaused = true
        imageTimerJob?.cancel()
        exoPlayer?.pause()
        Log.i(SimperApplication.TAG, "Reprodução pausada.")
    }

    fun resume() {
        if (!isPaused) return
        isPaused = false
        val currentItem = playlistItems.getOrNull(currentIndex)
        if (currentItem?.mediaItem?.type == "video") {
            exoPlayer?.play()
        } else {
            val duration = currentItem?.customDurationSeconds ?: currentItem?.mediaItem?.durationSeconds ?: 10
            imageTimerJob?.cancel()
            imageTimerJob = engineScope.launch {
                delay(duration * 1000L)
                handleItemCompleted()
            }
        }
        Log.i(SimperApplication.TAG, "Reprodução retomada.")
    }

    fun togglePlayPause(): Boolean {
        if (isPaused) {
            resume()
            return true
        } else {
            pause()
            return false
        }
    }

    fun skipToIndex(index: Int) {
        if (playlistItems.isEmpty()) return
        currentIndex = (index % playlistItems.size + playlistItems.size) % playlistItems.size
        playCurrentItem()
    }

    fun next() {
        if (playlistItems.isEmpty()) return
        currentIndex = (currentIndex + 1) % playlistItems.size
        playCurrentItem()
    }

    fun previous() {
        if (playlistItems.isEmpty()) return
        currentIndex = (currentIndex - 1 + playlistItems.size) % playlistItems.size
        playCurrentItem()
    }

    private fun playCurrentItem() {
        if (!isPlaying || playlistItems.isEmpty()) return

        if (currentIndex >= playlistItems.size) {
            currentIndex = 0
        }

        val item = playlistItems[currentIndex]
        val media = item.mediaItem
        val duration = item.customDurationSeconds ?: media.durationSeconds

        Log.i(SimperApplication.TAG, "Reproduzindo [${currentIndex + 1}/${playlistItems.size}]: ${media.title} (${duration}s, transição: $currentTransition)")

        val localFile = cacheManager.getLocalFile(media)

        if (media.type == "video") {
            playVideo(localFile?.toURI()?.toString() ?: media.url)
        } else {
            playImage(localFile ?: media.url, duration)
        }
    }

    private fun playVideo(uriString: String) {
        imageTimerJob?.cancel()

        exoPlayer?.let { player ->
            player.stop()
            player.clearMediaItems()
            val exoItem = ExoMediaItem.fromUri(Uri.parse(uriString))
            player.setMediaItem(exoItem)
            player.prepare()
            if (!isPaused) {
                player.play()
            }
        }
    }

    private fun playImage(source: Any, durationSeconds: Int) {
        exoPlayer?.stop()
        playerView.visibility = View.GONE
        imageView.visibility = View.VISIBLE

        // Reset de transformações anteriores
        imageView.animate().cancel()
        imageView.scaleX = 1.0f
        imageView.scaleY = 1.0f
        imageView.translationX = 0f
        imageView.translationY = 0f
        imageView.alpha = 1.0f

        when (currentTransition) {
            "cut" -> {
                // Corte seco: troca instantânea
                imageView.load(source) {
                    crossfade(false)
                }
            }
            "zoom" -> {
                // Zoom Suave (Ken Burns Effect)
                imageView.load(source) {
                    crossfade(300)
                }
                imageView.animate()
                    .scaleX(1.08f)
                    .scaleY(1.08f)
                    .setDuration(durationSeconds * 1000L)
                    .start()
            }
            "slide" -> {
                // Deslize suave horizontal
                imageView.translationX = 120f
                imageView.alpha = 0.6f
                imageView.load(source) {
                    crossfade(200)
                }
                imageView.animate()
                    .translationX(0f)
                    .alpha(1.0f)
                    .setDuration(450)
                    .start()
            }
            else -> { // "fade"
                // Desvanecer suave
                imageView.load(source) {
                    crossfade(600)
                }
            }
        }

        imageTimerJob?.cancel()
        if (!isPaused) {
            imageTimerJob = engineScope.launch {
                delay(durationSeconds * 1000L)
                handleItemCompleted()
            }
        }
    }

    private fun handleItemCompleted() {
        if (!isPlaying || playlistItems.isEmpty() || isPaused) return

        val currentItem = playlistItems.getOrNull(currentIndex)
        if (currentItem != null) {
            val duration = currentItem.customDurationSeconds ?: currentItem.mediaItem.durationSeconds
            onProofOfPlay(currentItem.mediaItem, duration)
        }

        currentIndex = (currentIndex + 1) % playlistItems.size
        playCurrentItem()
    }

    fun release() {
        stop()
        engineScope.cancel()
        exoPlayer?.release()
        exoPlayer = null
    }
}
