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
        billingManager = BillingManager(activity) { success, error ->
            // Notify the web layer of purchase updates
            notifyPurchaseUpdate(success, error)
        }
    }

    @PluginMethod
    fun checkSubscriptionStatus(call: PluginCall) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val result = billingManager?.checkSubscriptionStatus()
                if (result != null) {
                    call.resolve(result)
                } else {
                    call.reject("Billing manager not initialized")
                }
            } catch (e: Exception) {
                call.reject("Error checking subscription: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun launchSubscriptionFlow(call: PluginCall) {
        billingManager?.launchSubscriptionFlow { success, error ->
            if (success) {
                call.resolve()
            } else {
                call.reject(error ?: "Unknown error launching subscription flow")
            }
        } ?: call.reject("Billing manager not initialized")
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
