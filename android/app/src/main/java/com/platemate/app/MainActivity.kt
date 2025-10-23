package com.platemate.app

import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.os.Bundle
import android.view.View
import android.view.animation.LinearInterpolator
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
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
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

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
            bridge.webView.webViewClient = object : WebViewClient() {
                
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    request?.let {
                        // Only intercept requests to our own server
                        val urlString = it.url.toString()
                        if (shouldAddToken(urlString)) {
                            return try {
                                makeRequestWithToken(urlString, it.method, it.requestHeaders)
                            } catch (e: Exception) {
                                android.util.Log.e("MainActivity", "Error intercepting request: $urlString", e)
                                null
                            }
                        }
                    }
                    return super.shouldInterceptRequest(view, request)
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    // Also inject JavaScript as a fallback for fetch/XHR
                    injectHeaderScript(view)
                }
            }
            
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Failed to setup WebView header injection", e)
        }
    }
    
    private fun shouldAddToken(url: String): Boolean {
        // Only add token to requests to our Replit server
        // Avoid intercepting third-party resources
        return url.contains(".replit.dev") || url.contains("replit.app")
    }
    
    private fun makeRequestWithToken(
        urlString: String,
        method: String,
        originalHeaders: Map<String, String>
    ): WebResourceResponse? {
        return try {
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            
            // Set method
            connection.requestMethod = method
            
            // Copy original headers
            originalHeaders.forEach { (key, value) ->
                connection.setRequestProperty(key, value)
            }
            
            // Add our custom token header
            connection.setRequestProperty("X-App-Token", APP_ACCESS_TOKEN)
            
            // Connect and get response
            connection.connect()
            
            val responseCode = connection.responseCode
            val mimeType = connection.contentType?.split(";")?.get(0) ?: "text/html"
            val encoding = connection.contentEncoding ?: "UTF-8"
            val inputStream = if (responseCode >= 400) {
                connection.errorStream
            } else {
                connection.inputStream
            }
            
            // Build response headers
            val responseHeaders = mutableMapOf<String, String>()
            connection.headerFields.forEach { (key, values) ->
                key?.let {
                    responseHeaders[it] = values.joinToString(", ")
                }
            }
            
            WebResourceResponse(mimeType, encoding, responseCode, "OK", responseHeaders, inputStream)
            
        } catch (e: IOException) {
            android.util.Log.e("MainActivity", "Failed to make request with token: $urlString", e)
            null
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
