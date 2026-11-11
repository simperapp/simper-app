package app.simper.tvplayer.domain

import android.app.Activity
import android.os.Build
import android.util.DisplayMetrics
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import app.simper.tvplayer.SimperApplication

/**
 * Utilitário de gerenciamento de orientação e rotação para Smart TVs e Totens Comerciais.
 * 
 * Regra técnica para TVs Android (ex: Aiwa AWS-TV-32-BL-02-A):
 * - O driver de vídeo / SurfaceFlinger é travado em Landscape (1366x768).
 * - Chamar requestedOrientation causa cortes de janela (pillarboxing) pelo WindowManager.
 * - Para o conteúdo ficar em pé e preencher 100% da tela física vertical sem cortes:
 *   Rotacionamos a View raiz, invertemos a largura e altura para (768 x 1366)
 *   e centralizamos no centro geométrico do display desabilitando o clip dos containers pais.
 */
object OrientationController {

    fun applyOrientation(activity: Activity, targetView: View, rotationDegrees: Int) {
        Log.i(SimperApplication.TAG, "Aplicando rotação de tela para TV: $rotationDegrees°")

        targetView.post {
            try {
                // Desabilita clipping no DecorView e em todos os ancestrais
                activity.window.decorView.let { decor ->
                    if (decor is ViewGroup) {
                        decor.clipChildren = false
                        decor.clipToPadding = false
                    }
                }
                (targetView.parent as? ViewGroup)?.let { parent ->
                    parent.clipChildren = false
                    parent.clipToPadding = false
                }
                if (targetView is ViewGroup) {
                    targetView.clipChildren = false
                    targetView.clipToPadding = false
                }

                // Resolução física real da tela
                val (screenW, screenH) = getRealScreenDimensions(activity)
                val minDim = minOf(screenW, screenH) // Ex: 768 (largura no totem)
                val maxDim = maxOf(screenW, screenH) // Ex: 1366 (altura no totem)

                val params = (targetView.layoutParams as? FrameLayout.LayoutParams)
                    ?: FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )

                when (rotationDegrees) {
                    90, 270 -> {
                        // Modo Vertical / Totem (9:16)
                        params.width = minDim
                        params.height = maxDim
                        params.gravity = Gravity.CENTER
                        targetView.layoutParams = params

                        targetView.pivotX = minDim / 2f
                        targetView.pivotY = maxDim / 2f
                        targetView.rotation = rotationDegrees.toFloat()
                        targetView.translationX = 0f
                        targetView.translationY = 0f
                    }
                    180 -> {
                        // Modo Horizontal Invertido 180°
                        params.width = ViewGroup.LayoutParams.MATCH_PARENT
                        params.height = ViewGroup.LayoutParams.MATCH_PARENT
                        params.gravity = Gravity.CENTER
                        targetView.layoutParams = params

                        targetView.pivotX = screenW / 2f
                        targetView.pivotY = screenH / 2f
                        targetView.rotation = 180f
                        targetView.translationX = 0f
                        targetView.translationY = 0f
                    }
                    else -> {
                        // Modo Horizontal Padrão 0° (16:9)
                        params.width = ViewGroup.LayoutParams.MATCH_PARENT
                        params.height = ViewGroup.LayoutParams.MATCH_PARENT
                        params.gravity = Gravity.CENTER
                        targetView.layoutParams = params

                        targetView.pivotX = screenW / 2f
                        targetView.pivotY = screenH / 2f
                        targetView.rotation = 0f
                        targetView.translationX = 0f
                        targetView.translationY = 0f
                    }
                }
                targetView.requestLayout()
                targetView.invalidate()
            } catch (e: Exception) {
                Log.e(SimperApplication.TAG, "Erro ao aplicar orientação: ${e.message}")
            }
        }
    }

    private fun getRealScreenDimensions(activity: Activity): Pair<Int, Int> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val bounds = activity.windowManager.currentWindowMetrics.bounds
            Pair(bounds.width(), bounds.height())
        } else {
            val dm = DisplayMetrics()
            @Suppress("DEPRECATION")
            activity.windowManager.defaultDisplay.getRealMetrics(dm)
            Pair(dm.widthPixels, dm.heightPixels)
        }
    }
}
