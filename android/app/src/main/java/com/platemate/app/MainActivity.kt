package com.platemate.app

import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.os.Bundle
import android.view.View
import android.view.animation.LinearInterpolator
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
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
    
    companion object {
        // This token must match APP_ACCESS_TOKEN in your Replit secrets
        private const val APP_ACCESS_TOKEN = "i9wD15teB7oYJLsRzaMBhpAIZG8yUWJnAo0phKwRdn4"
    }
    
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
        
        // Inject custom header into all WebView requests
        setupWebViewHeaderInjection()
        
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
    
    private fun setupWebViewHeaderInjection() {
        try {
            // Set up custom WebViewClient to handle all requests
            val originalWebViewClient = bridge.webView.webViewClient
            bridge.webView.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    // Load URLs with custom headers
                    request?.url?.let { url ->
                        val headers = mutableMapOf<String, String>()
                        headers["X-App-Token"] = APP_ACCESS_TOKEN
                        view?.loadUrl(url.toString(), headers)
                        return true
                    }
                    return false
                }
                
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    // Inject JavaScript AFTER page loads to intercept future fetch/XHR
                    injectHeaderScript(view)
                }
            }
            
            // For the very first page load, we need to set headers directly
            val currentUrl = bridge.webView.url
            if (currentUrl != null && !currentUrl.startsWith("about:")) {
                val headers = mutableMapOf<String, String>()
                headers["X-App-Token"] = APP_ACCESS_TOKEN
                bridge.webView.loadUrl(currentUrl, headers)
            }
            
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Failed to setup WebView header injection", e)
        }
    }
    
    private fun injectHeaderScript(view: WebView?) {
        view?.evaluateJavascript("""
                (function() {
                    const token = '$APP_ACCESS_TOKEN';
                    
                    // Intercept fetch API
                    const originalFetch = window.fetch;
                    window.fetch = function(...args) {
                        if (args[1]) {
                            args[1].headers = args[1].headers || {};
                            if (args[1].headers instanceof Headers) {
                                args[1].headers.append('X-App-Token', token);
                            } else {
                                args[1].headers['X-App-Token'] = token;
                            }
                        } else {
                            args[1] = { headers: { 'X-App-Token': token } };
                        }
                        return originalFetch.apply(this, args);
                    };
                    
                    // Intercept XMLHttpRequest
                    const originalOpen = XMLHttpRequest.prototype.open;
                    const originalSend = XMLHttpRequest.prototype.send;
                    XMLHttpRequest.prototype.open = function(...args) {
                        this._url = args[1];
                        return originalOpen.apply(this, args);
                    };
                    XMLHttpRequest.prototype.send = function(...args) {
                        this.setRequestHeader('X-App-Token', token);
                        return originalSend.apply(this, args);
                    };
                    
                    console.log('🔐 App token injection initialized');
                })();
            """.trimIndent(), null)
    }
}