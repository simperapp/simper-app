package app.simper.tvplayer

import android.app.Application
import android.util.Log

class SimperApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Simper TV Player iniciado. Versão: 1.0.0")
    }

    companion object {
        const val TAG = "SimperTV"
    }
}
