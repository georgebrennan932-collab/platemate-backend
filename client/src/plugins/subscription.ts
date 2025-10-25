import { Capacitor } from '@capacitor/core';

// Import cordova-plugin-purchase types
import 'cordova-plugin-purchase';
declare const CdvPurchase: any;

export interface SubscriptionPlugin {
  checkSubscriptionStatus(): Promise<{
    isSubscribed: boolean;
    productId?: string;
    purchaseToken?: string;
    purchaseTime?: number;
    isAutoRenewing?: boolean;
    error?: string;
  }>;
  
  launchSubscriptionFlow(): Promise<void>;
}

class SubscriptionService implements SubscriptionPlugin {
  private store: any = null;
  private initialized = false;
  private readonly PRODUCT_ID = 'platemate_pro_monthly';
  
  constructor() {
    if (Capacitor.isNativePlatform()) {
      this.initializeStore();
    }
  }
  
  private initializeStore() {
    if (typeof CdvPurchase === 'undefined') {
      console.warn('⚠️ cordova-plugin-purchase not available');
      return;
    }
    
    this.store = CdvPurchase.store;
    
    // Register the subscription product
    this.store.register([{
      id: this.PRODUCT_ID,
      type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      platform: CdvPurchase.Platform.GOOGLE_PLAY
    }]);
    
    // Handle purchase approvals
    this.store.when()
      .approved((transaction: any) => {
        console.log('✅ Purchase approved:', transaction);
        return transaction.verify();
      })
      .verified((receipt: any) => {
        console.log('✅ Receipt verified:', receipt);
        receipt.finish();
      })
      .finished((transaction: any) => {
        console.log('✅ Transaction finished:', transaction);
      })
      .receiptUpdated((receipt: any) => {
        console.log('📝 Receipt updated:', receipt);
      });
    
    // Handle errors
    this.store.error((error: any) => {
      console.error('❌ Store error:', error);
    });
    
    // Initialize the store
    this.store.initialize().then(() => {
      this.initialized = true;
      console.log('🚀 Subscription store initialized');
    }).catch((error: any) => {
      console.error('❌ Failed to initialize store:', error);
    });
  }
  
  async checkSubscriptionStatus(): Promise<{
    isSubscribed: boolean;
    productId?: string;
    purchaseToken?: string;
    purchaseTime?: number;
    isAutoRenewing?: boolean;
    error?: string;
  }> {
    // Web fallback - require mobile app
    if (!Capacitor.isNativePlatform()) {
      console.warn('⚠️ Subscription check on web - user must use mobile app to subscribe');
      return { 
        isSubscribed: false,
        productId: 'platemate_pro_monthly_web',
        error: 'Subscription only available on mobile app'
      };
    }
    
    // Check if store is available
    if (!this.store || !this.initialized) {
      console.warn('⚠️ Store not initialized yet');
      return {
        isSubscribed: false,
        error: 'Store not initialized'
      };
    }
    
    try {
      // Get the product
      const product = this.store.get(this.PRODUCT_ID);
      
      if (!product) {
        console.warn('⚠️ Product not found:', this.PRODUCT_ID);
        return {
          isSubscribed: false,
          error: 'Product not found'
        };
      }
      
      // Check if user owns the subscription
      const isOwned = product.owned;
      
      if (isOwned) {
        console.log('✅ User has active subscription');
        
        // Get transaction details
        const transaction = product.transaction;
        
        return {
          isSubscribed: true,
          productId: this.PRODUCT_ID,
          purchaseToken: transaction?.id,
          purchaseTime: transaction?.purchaseDate ? new Date(transaction.purchaseDate).getTime() : undefined,
          isAutoRenewing: true
        };
      } else {
        console.log('ℹ️ No active subscription found');
        return {
          isSubscribed: false,
          productId: this.PRODUCT_ID
        };
      }
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return {
        isSubscribed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async launchSubscriptionFlow(): Promise<void> {
    // Web fallback - throw error
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Subscription is only available in the mobile app. Please download PlateMate from Google Play.');
    }
    
    // Check if store is available
    if (!this.store || !this.initialized) {
      throw new Error('Store not initialized. Please try again in a moment.');
    }
    
    try {
      const product = this.store.get(this.PRODUCT_ID);
      
      if (!product) {
        throw new Error('Subscription product not available');
      }
      
      // Get the first offer
      const offers = product.offers;
      if (!offers || offers.length === 0) {
        throw new Error('No subscription offers available');
      }
      
      console.log('🚀 Launching subscription flow for:', this.PRODUCT_ID);
      
      // Launch the purchase flow
      await this.store.order(offers[0]);
      
    } catch (error) {
      console.error('❌ Error launching subscription flow:', error);
      throw error instanceof Error ? error : new Error('Failed to launch subscription flow');
    }
  }
}

// Create singleton instance
const Subscription = new SubscriptionService();

export default Subscription;
