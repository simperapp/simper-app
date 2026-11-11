package app.simper.tvplayer.receiver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import app.simper.tvplayer.R
import app.simper.tvplayer.SimperApplication
import app.simper.tvplayer.service.KioskService
import app.simper.tvplayer.ui.MainActivity

/**
 * Receptor de evento de inicialização da TV (Cold Boot, Standby Quickboot e Reinício).
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.i(SimperApplication.TAG, "BootReceiver disparado com a ação: $action")

        val validActions = listOf(
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON",
            "android.intent.action.REBOOT"
        )

        if (validActions.contains(action)) {
            try {
                // 1. Inicia o serviço persistente para manter a aplicação ativa
                val serviceIntent = Intent(context, KioskService::class.java)
                ContextCompat.startForegroundService(context, serviceIntent)

                // 2. Dispara a MainActivity diretamente
                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }

                val pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                try {
                    context.startActivity(launchIntent)
                    Log.i(SimperApplication.TAG, "MainActivity disparada diretamente pelo BootReceiver.")
                } catch (e: Exception) {
                    Log.w(SimperApplication.TAG, "startActivity direto bloqueado pelo sistema, disparando via FullScreen: ${e.message}")
                    launchFullScreenNotification(context, pendingIntent)
                }
            } catch (e: Exception) {
                Log.e(SimperApplication.TAG, "Falha geral no BootReceiver: ${e.message}", e)
            }
        }
    }

    private fun launchFullScreenNotification(context: Context, pendingIntent: PendingIntent) {
        try {
            val channelId = "simper_boot_channel"
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "Simper Auto Start",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Canal de inicialização automática ao ligar a TV"
                    setSound(null, null)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.simper_logo)
                .setContentTitle("Simper TV")
                .setContentText("Iniciando anúncios automaticamente...")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(pendingIntent, true)
                .setAutoCancel(true)
                .build()

            notificationManager.notify(1001, notification)
        } catch (e: Exception) {
            Log.e(SimperApplication.TAG, "Erro ao disparar FullScreen notification: ${e.message}")
        }
    }
}
