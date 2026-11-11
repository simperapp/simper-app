# Regras Proguard para Simper TV Player
-keep class androidx.media3.** { *; }
-keep class app.simper.tvplayer.data.model.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.SerialName <fields>;
}
