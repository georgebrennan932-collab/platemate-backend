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
  private initPromise: Promise<void> | null = null;
  private readonly PRODUCT_ID = 'platemate_pro_monthly';
  
  constructor() {
    if (Capacitor.isNativePlatform()) {
      // Wait for Cordova deviceready event before initializing
      this.initPromise = new Promise((resolve, reject) => {
        const initStore = async () => {
          try {
            await this.initializeStore();
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        
        // Listen for deviceready event (Cordova plugin lifecycle)
        document.addEventListener('deviceready', initStore, false);
        
        // Fallback timeout in case deviceready never fires (safety)
        setTimeout(() => {
          console.warn('⚠️ deviceready timeout, attempting initialization anyway');
          initStore();
        }, 3000);
      });
    }
  }
  
  private async initializeStore(): Promise<void> {
    console.log('🚀 Starting store initialization...');
    
    if (typeof CdvPurchase === 'undefined') {
      console.error('❌ CdvPurchase is undefined - cordova-plugin-purchase not loaded');
      throw new Error('cordova-plugin-purchase not available');
    }
    
    console.log('✅ CdvPurchase available');
    this.store = CdvPurchase.store;
    
    // Enable verbose logging for debugging
    this.store.verbosity = CdvPurchase.LogLevel.DEBUG;
    
    // Register the subscription product
    this.store.register([{
      id: this.PRODUCT_ID,
      type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      platform: CdvPurchase.Platform.GOOGLE_PLAY
    }]);
    
    console.log('✅ Product registered:', this.PRODUCT_ID);
    
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
    
    try {
      // Initialize the store
      console.log('🔄 Calling store.initialize()...');
      await this.store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
      console.log('✅ Subscription store initialized');
      
      // Refresh to fetch Google Play inventory and owned purchases
      console.log('🔄 Calling store.refresh()...');
      await this.store.refresh();
      console.log('✅ Store refreshed - Google Play inventory loaded');
      
    } catch (error) {
      console.error('❌ Failed to initialize/refresh store:', error);
      throw error;
    }
  }
  
  private async waitForReady(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    
    if (!this.initPromise) {
      throw new Error('Store initialization was not started');
    }
    
    console.log('⏳ Waiting for store to be ready...');
    await this.initPromise;
    console.log('✅ Store is ready');
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
    
    try {
      // Wait for store to be ready
      await this.waitForReady();
      
      // Get the product
      const product = this.store.get(this.PRODUCT_ID);
      
      if (!product) {
        console.warn('⚠️ Product not found:', this.PRODUCT_ID);
        console.log('Available products:', this.store.products);
        return {
          isSubscribed: false,
          error: 'Product not found'
        };
      }
      
      console.log('📦 Product details:', {
        id: product.id,
        owned: product.owned,
        canPurchase: product.canPurchase,
        state: product.state
      });
      
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
    
    try {
      // Wait for store to be ready
      await this.waitForReady();
      
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
      console.log('📋 Available offers:', offers);
      
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
