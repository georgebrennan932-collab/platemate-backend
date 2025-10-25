package com.georgebrennan.platemate3

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.*
import com.getcapacitor.JSObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class BillingManager(
    private val activity: Activity,
    private val onPurchaseUpdated: (Boolean, String?) -> Unit
) : PurchasesUpdatedListener {

    private var billingClient: BillingClient
    private var isConnected = false
    private var pendingPurchaseCallback: ((Boolean, String?) -> Unit)? = null
    
    companion object {
        private const val TAG = "BillingManager"
        const val SUBSCRIPTION_PRODUCT_ID = "platemate_pro_monthly"
    }

    init {
        Log.d(TAG, "🚀 BillingManager initializing...")
        billingClient = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases()
            .build()
            
        startConnection()
        Log.d(TAG, "✅ BillingManager initialized, connecting to Google Play Billing...")
    }

    private fun startConnection() {
        Log.d(TAG, "📡 Connecting to Google Play Billing service...")
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    isConnected = true
                    Log.d(TAG, "✅ Billing client connected successfully - ready for subscriptions!")
                } else {
                    Log.e(TAG, "❌ Billing setup failed: ${billingResult.debugMessage} (Code: ${billingResult.responseCode})")
                }
            }

            override fun onBillingServiceDisconnected() {
                isConnected = false
                Log.w(TAG, "⚠️ Billing service disconnected, will retry on next action")
            }
        })
    }

    fun launchSubscriptionFlow(callback: (Boolean, String?) -> Unit) {
        if (!isConnected) {
            callback(false, "Billing service not connected")
            return
        }

        // Store the callback to be invoked when purchase completes
        pendingPurchaseCallback = callback

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val productList = listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(SUBSCRIPTION_PRODUCT_ID)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )

                val params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build()

                val productDetailsResult = withContext(Dispatchers.IO) {
                    billingClient.queryProductDetails(params)
                }

                if (productDetailsResult.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    val productDetails = productDetailsResult.productDetailsList?.firstOrNull()

                    if (productDetails != null) {
                        val offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken

                        if (offerToken != null) {
                            val productDetailsParamsList = listOf(
                                BillingFlowParams.ProductDetailsParams.newBuilder()
                                    .setProductDetails(productDetails)
                                    .setOfferToken(offerToken)
                                    .build()
                            )

                            val billingFlowParams = BillingFlowParams.newBuilder()
                                .setProductDetailsParamsList(productDetailsParamsList)
                                .build()

                            withContext(Dispatchers.Main) {
                                val result = billingClient.launchBillingFlow(activity, billingFlowParams)
                                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                                    pendingPurchaseCallback?.invoke(false, "Failed to launch billing flow: ${result.debugMessage}")
                                    pendingPurchaseCallback = null
                                }
                            }
                        } else {
                            pendingPurchaseCallback?.invoke(false, "No subscription offers available")
                            pendingPurchaseCallback = null
                        }
                    } else {
                        pendingPurchaseCallback?.invoke(false, "Product not found")
                        pendingPurchaseCallback = null
                    }
                } else {
                    pendingPurchaseCallback?.invoke(false, "Failed to query products: ${productDetailsResult.billingResult.debugMessage}")
                    pendingPurchaseCallback = null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error launching subscription flow", e)
                pendingPurchaseCallback?.invoke(false, "Error: ${e.message}")
                pendingPurchaseCallback = null
            }
        }
    }

    suspend fun checkSubscriptionStatus(): JSObject {
        val result = JSObject()
        
        if (!isConnected) {
            result.put("isSubscribed", false)
            result.put("error", "Billing service not connected")
            return result
        }

        return withContext(Dispatchers.IO) {
            try {
                val params = QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()

                val purchasesResult = billingClient.queryPurchasesAsync(params)

                if (purchasesResult.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    val purchases = purchasesResult.purchasesList
                    
                    val activeSubscription = purchases.firstOrNull { purchase ->
                        purchase.products.contains(SUBSCRIPTION_PRODUCT_ID) &&
                        purchase.purchaseState == Purchase.PurchaseState.PURCHASED
                    }

                    if (activeSubscription != null) {
                        result.put("isSubscribed", true)
                        result.put("productId", SUBSCRIPTION_PRODUCT_ID)
                        result.put("purchaseToken", activeSubscription.purchaseToken)
                        result.put("purchaseTime", activeSubscription.purchaseTime)
                        result.put("isAutoRenewing", activeSubscription.isAutoRenewing)
                    } else {
                        result.put("isSubscribed", false)
                    }
                } else {
                    result.put("isSubscribed", false)
                    result.put("error", "Failed to query purchases: ${purchasesResult.billingResult.debugMessage}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error checking subscription status", e)
                result.put("isSubscribed", false)
                result.put("error", "Error: ${e.message}")
            }
            result
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases?.forEach { purchase ->
                    if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                        if (!purchase.isAcknowledged) {
                            acknowledgePurchase(purchase)
                        }
                        // Notify both the pending callback and global listener
                        pendingPurchaseCallback?.invoke(true, null)
                        pendingPurchaseCallback = null
                        onPurchaseUpdated(true, null)
                    }
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                Log.d(TAG, "User canceled the purchase")
                pendingPurchaseCallback?.invoke(false, "User canceled")
                pendingPurchaseCallback = null
                onPurchaseUpdated(false, "User canceled")
            }
            else -> {
                Log.e(TAG, "Purchase failed: ${billingResult.debugMessage}")
                pendingPurchaseCallback?.invoke(false, billingResult.debugMessage)
                pendingPurchaseCallback = null
                onPurchaseUpdated(false, billingResult.debugMessage)
            }
        }
    }

    private fun acknowledgePurchase(purchase: Purchase) {
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

        CoroutineScope(Dispatchers.IO).launch {
            val result = billingClient.acknowledgePurchase(params)
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchase acknowledged successfully")
            } else {
                Log.e(TAG, "Failed to acknowledge purchase: ${result.debugMessage}")
            }
        }
    }

    fun endConnection() {
        billingClient.endConnection()
        isConnected = false
    }
}
