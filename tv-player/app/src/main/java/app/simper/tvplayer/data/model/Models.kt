package app.simper.tvplayer.data.model

import kotlinx.serialization.Serializable

@Serializable
data class DeviceInfo(
    val id: String,
    val pairingCode: String,
    val name: String,
    val status: String,
    val orientation: String,
    val rotationDegrees: Int,
    val resolution: String
)

@Serializable
data class MediaItem(
    val id: String,
    val title: String,
    val type: String, // "video" ou "image"
    val url: String,
    val localFilePath: String? = null,
    val checksumSha256: String,
    val durationSeconds: Int,
    val width: Int,
    val height: Int
)

@Serializable
data class PlaylistItem(
    val id: String,
    val playlistId: String,
    val mediaItem: MediaItem,
    val displayOrder: Int,
    val customDurationSeconds: Int? = null,
    val isActive: Boolean = true
)

@Serializable
data class Playlist(
    val id: String,
    val name: String,
    val items: List<PlaylistItem> = emptyList()
)

@Serializable
data class PlaybackProof(
    val deviceId: String,
    val mediaItemId: String,
    val campaignId: String? = null,
    val playedAtTimestamp: Long,
    val durationSeconds: Int
)
