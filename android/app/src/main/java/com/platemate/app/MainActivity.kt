package com.platemate.app

import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.os.Bundle
import android.view.View
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Add mic icon animation
        val micIcon: ImageView = findViewById(R.id.micIcon)
        val scaleUp = ObjectAnimator.ofPropertyValuesHolder(
            micIcon,
            PropertyValuesHolder.ofFloat(View.SCALE_X, 1.2f),
            PropertyValuesHolder.ofFloat(View.SCALE_Y, 1.2f)
        )
        scaleUp.duration = 800
        scaleUp.repeatCount = ValueAnimator.INFINITE
        scaleUp.repeatMode = ValueAnimator.REVERSE
        scaleUp.start()

        // Add barcode scan line animation
        val scanLine: View = findViewById(R.id.scanLine)
        val barcodeButton: FrameLayout = findViewById(R.id.barcodeButton)

        barcodeButton.post {
            val height = barcodeButton.height - scanLine.height

            val animator = ObjectAnimator.ofFloat(scanLine, "translationY", 0f, height.toFloat())
            animator.duration = 1500
            animator.repeatCount = ValueAnimator.INFINITE
            animator.repeatMode = ValueAnimator.REVERSE
            animator.interpolator = LinearInterpolator()
            animator.start()
        }
    }
}