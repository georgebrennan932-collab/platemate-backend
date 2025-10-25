package com.platemate.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@CapacitorPlugin(name = "Subscription")
class SubscriptionPlugin : Plugin() {

    private var billingManager: BillingManager? = null

    override fun load() {
        super.load()
        android.util.Log.d("SubscriptionPlugin", "🚀 SubscriptionPlugin loading...")
        billingManager = BillingManager(activity) { success, error ->
            // Notify the web layer of purchase updates
            notifyPurchaseUpdate(success, error)
        }
        android.util.Log.d("SubscriptionPlugin", "✅ SubscriptionPlugin loaded successfully with BillingManager")
    }

    @PluginMethod
    fun checkSubscriptionStatus(call: PluginCall) {
        android.util.Log.d("SubscriptionPlugin", "📱 checkSubscriptionStatus called from web layer")
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val result = billingManager?.checkSubscriptionStatus()
                if (result != null) {
                    android.util.Log.d("SubscriptionPlugin", "✅ Subscription check result: ${result.toString()}")
                    call.resolve(result)
                } else {
                    android.util.Log.e("SubscriptionPlugin", "❌ Billing manager not initialized")
                    call.reject("Billing manager not initialized")
                }
            } catch (e: Exception) {
                android.util.Log.e("SubscriptionPlugin", "❌ Error checking subscription: ${e.message}", e)
                call.reject("Error checking subscription: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun launchSubscriptionFlow(call: PluginCall) {
        android.util.Log.d("SubscriptionPlugin", "🛒 launchSubscriptionFlow called from web layer")
        billingManager?.launchSubscriptionFlow { success, error ->
            if (success) {
                android.util.Log.d("SubscriptionPlugin", "✅ Subscription flow completed successfully")
                call.resolve()
            } else {
                android.util.Log.e("SubscriptionPlugin", "❌ Subscription flow error: $error")
                call.reject(error ?: "Unknown error launching subscription flow")
            }
        } ?: run {
            android.util.Log.e("SubscriptionPlugin", "❌ Billing manager not initialized")
            call.reject("Billing manager not initialized")
        }
    }

    private fun notifyPurchaseUpdate(success: Boolean, error: String?) {
        val data = com.getcapacitor.JSObject()
        data.put("success", success)
        data.put("error", error)
        notifyListeners("purchaseUpdate", data)
    }

    override fun handleOnDestroy() {
        billingManager?.endConnection()
        super.handleOnDestroy()
    }
}
