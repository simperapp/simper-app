package app.simper.tvplayer.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import app.simper.tvplayer.R
import app.simper.tvplayer.SimperApplication
import app.simper.tvplayer.ui.MainActivity

/**
 * Serviço em Primeiro Plano persistente (Kiosk Service) para Smart TV.
 * Mantém o processo do Simper TV vivo e monitora quando a TV liga da suspensão (Standby / Tela Ligada).
 */
class KioskService : Service() {

    private var screenReceiver: BroadcastReceiver? = null
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        const val CHANNEL_ID = "simper_kiosk_service"
        const val NOTIFICATION_ID = 2001
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(SimperApplication.TAG, "KioskService iniciado.")

        acquireWakeLock()
        startForegroundNotification()
        registerScreenStateReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Garante que o serviço reinicie caso o sistema Android TV libere memória
        return START_STICKY
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "SimperTV:KioskWakeLock"
            ).apply {
                setReferenceCounted(false)
                acquire(10 * 60 * 1000L /* 10 min fallback */)
            }
        } catch (e: Exception) {
            Log.w(SimperApplication.TAG, "Falha ao adquirir WakeLock: ${e.message}")
        }
    }

    private fun startForegroundNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Simper Kiosk Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitoramento do reprodutor Simper TV"
                setShowBadge(false)
                setSound(null, null)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.simper_logo)
            .setContentTitle("Simper TV Player")
            .setContentText("Reprodução contínua ativa")
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun registerScreenStateReceiver() {
        if (screenReceiver != null) return

        screenReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val action = intent.action
                Log.i(SimperApplication.TAG, "Evento de tela detectado: $action")

                if (action == Intent.ACTION_SCREEN_ON ||
                    action == Intent.ACTION_USER_PRESENT ||
                    action == "android.intent.action.DREAMING_STOPPED"
                ) {
                    bringPlayerToFront()
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
            addAction("android.intent.action.DREAMING_STOPPED")
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenReceiver, filter)
        }
    }

    private fun bringPlayerToFront() {
        try {
            Log.i(SimperApplication.TAG, "Trazendo Simper TV para o primeiro plano...")
            val intent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(SimperApplication.TAG, "Erro ao abrir MainActivity pela tela ligada: ${e.message}")
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        screenReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: Exception) {}
            screenReceiver = null
        }
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        Log.i(SimperApplication.TAG, "KioskService destruído.")
    }
}
