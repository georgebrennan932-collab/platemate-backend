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
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.BillingResult

class MainActivity : BridgeActivity(), PurchasesUpdatedListener {

    private lateinit var billingClient: BillingClient
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize Google Play Billing
        billingClient = BillingClient.newBuilder(this)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    // Billing is ready, purchases can be queried in the future.
                }
            }

            override fun onBillingServiceDisconnected() {
                // Will retry connection automatically
            }
        })
        
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

    override fun onPurchasesUpdated(
        billingResult: BillingResult,
        purchases: MutableList<Purchase>?
    ) {
        // Purchase update handling will be implemented later, leave this empty for now.
    }
}