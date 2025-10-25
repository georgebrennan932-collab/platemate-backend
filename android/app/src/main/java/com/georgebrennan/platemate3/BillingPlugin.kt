package com.georgebrennan.platemate3

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.*
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Billing")
class BillingPlugin : Plugin() {
    
    companion object {
        private const val TAG = "BillingPlugin"
        private const val PRODUCT_ID = "platemate_pro_monthly"
    }
    
    private var billingClient: BillingClient? = null
    private var isServiceConnected = false
    
    override fun load() {
        super.load()
        Log.d(TAG, "🚀 Billing Plugin loaded")
        initializeBillingClient()
    }
    
    private fun initializeBillingClient() {
        Log.d(TAG, "📦 Initializing BillingClient...")
        
        val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
            handlePurchasesUpdate(billingResult, purchases)
        }
        
        billingClient = BillingClient.newBuilder(context)
            .setListener(purchasesUpdatedListener)
            .enablePendingPurchases()
            .enableAutoServiceReconnection()
            .build()
        
        startConnection()
    }
    
    private fun startConnection() {
        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    isServiceConnected = true
                    Log.d(TAG, "✅ BillingClient connected successfully")
                } else {
                    isServiceConnected = false
                    Log.e(TAG, "❌ BillingClient connection failed: ${billingResult.debugMessage}")
                }
            }
            
            override fun onBillingServiceDisconnected() {
                isServiceConnected = false
                Log.w(TAG, "⚠️ BillingClient disconnected")
            }
        })
    }
    
    @PluginMethod
    fun checkSubscriptionStatus(call: PluginCall) {
        Log.d(TAG, "🔍 Checking subscription status...")
        
        if (!isServiceConnected) {
            Log.w(TAG, "⚠️ BillingClient not connected, attempting reconnection...")
            startConnection()
            call.reject("BillingClient not connected. Please try again.")
            return
        }
        
        // Query active subscriptions
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()
        
        billingClient?.queryPurchasesAsync(params) { billingResult, purchases ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                val activePurchase = purchases.find { purchase ->
                    purchase.products.contains(PRODUCT_ID) && 
                    purchase.purchaseState == Purchase.PurchaseState.PURCHASED
                }
                
                val result = JSObject()
                if (activePurchase != null) {
                    Log.d(TAG, "✅ Active subscription found: $PRODUCT_ID")
                    result.put("isSubscribed", true)
                    result.put("productId", PRODUCT_ID)
                    result.put("purchaseToken", activePurchase.purchaseToken)
                    result.put("purchaseTime", activePurchase.purchaseTime)
                    result.put("isAutoRenewing", activePurchase.isAutoRenewing)
                } else {
                    Log.d(TAG, "ℹ️ No active subscription found")
                    result.put("isSubscribed", false)
                    result.put("productId", PRODUCT_ID)
                }
                call.resolve(result)
            } else {
                Log.e(TAG, "❌ Failed to query purchases: ${billingResult.debugMessage}")
                call.reject("Failed to check subscription status: ${billingResult.debugMessage}")
            }
        }
    }
    
    @PluginMethod
    fun launchSubscriptionFlow(call: PluginCall) {
        Log.d(TAG, "🔄 Launching subscription flow...")
        
        if (!isServiceConnected) {
            Log.w(TAG, "⚠️ BillingClient not connected")
            call.reject("BillingClient not connected. Please try again.")
            return
        }
        
        // Query product details
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        )
        
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()
        
        billingClient?.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && productDetailsList.isNotEmpty()) {
                val productDetails = productDetailsList[0]
                val offerToken = productDetails.subscriptionOfferDetails?.get(0)?.offerToken
                
                if (offerToken != null) {
                    Log.d(TAG, "🚀 Launching purchase flow for $PRODUCT_ID")
                    launchPurchaseFlow(productDetails, offerToken, call)
                } else {
                    Log.e(TAG, "❌ No subscription offers available")
                    call.reject("No subscription offers available")
                }
            } else {
                Log.e(TAG, "❌ Failed to query product details: ${billingResult.debugMessage}")
                call.reject("Failed to load subscription details: ${billingResult.debugMessage}")
            }
        }
    }
    
    private fun launchPurchaseFlow(
        productDetails: ProductDetails,
        offerToken: String,
        call: PluginCall
    ) {
        val productDetailsParamsList = listOf(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .setOfferToken(offerToken)
                .build()
        )
        
        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productDetailsParamsList)
            .build()
        
        val activity: Activity = activity ?: run {
            Log.e(TAG, "❌ No activity available for purchase flow")
            call.reject("No activity available")
            return
        }
        
        val billingResult = billingClient?.launchBillingFlow(activity, billingFlowParams)
        
        if (billingResult?.responseCode == BillingClient.BillingResponseCode.OK) {
            Log.d(TAG, "✅ Purchase flow launched successfully")
            // Don't resolve yet - wait for purchase update callback
            call.resolve()
        } else {
            Log.e(TAG, "❌ Failed to launch purchase flow: ${billingResult?.debugMessage}")
            call.reject("Failed to launch purchase flow")
        }
    }
    
    private fun handlePurchasesUpdate(billingResult: BillingResult, purchases: List<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                    if (!purchase.isAcknowledged) {
                        acknowledgePurchase(purchase)
                    }
                    Log.d(TAG, "✅ Purchase successful: ${purchase.products}")
                }
            }
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.d(TAG, "ℹ️ User cancelled purchase")
        } else {
            Log.e(TAG, "❌ Purchase failed: ${billingResult.debugMessage}")
        }
    }
    
    private fun acknowledgePurchase(purchase: Purchase) {
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()
        
        billingClient?.acknowledgePurchase(params) { billingResult ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "✅ Purchase acknowledged")
            } else {
                Log.e(TAG, "❌ Failed to acknowledge purchase: ${billingResult.debugMessage}")
            }
        }
    }
}
