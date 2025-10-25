import { Capacitor } from '@capacitor/core';
import { Purchases, CustomerInfo, PurchasesOfferings } from '@revenuecat/purchases-capacitor';

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
  private initialized = false;
  private readonly PRODUCT_ID = 'platemate_pro_monthly';
  private readonly ENTITLEMENT_ID = 'pro'; // RevenueCat entitlement
  
  constructor() {
    if (Capacitor.isNativePlatform()) {
      this.initializeRevenueCat();
    }
  }
  
  private async initializeRevenueCat(): Promise<void> {
    try {
      console.log('🚀 Initializing RevenueCat...');
      
      // Get API key from environment
      const apiKey = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY;
      
      if (!apiKey) {
        console.error('❌ VITE_REVENUECAT_ANDROID_API_KEY not set');
        return;
      }
      
      // Configure RevenueCat
      await Purchases.configure({
        apiKey: apiKey,
      });
      
      console.log('✅ RevenueCat initialized');
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat:', error);
    }
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
    
    if (!this.initialized) {
      console.warn('⚠️ RevenueCat not initialized yet');
      return {
        isSubscribed: false,
        error: 'RevenueCat not initialized'
      };
    }
    
    try {
      console.log('🔍 Checking subscription status...');
      
      // Get customer info from RevenueCat
      const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
      
      console.log('📦 Customer info received:', {
        activeSubscriptions: customerInfo.activeSubscriptions,
        entitlements: Object.keys(customerInfo.entitlements.active)
      });
      
      // Check if user has the "pro" entitlement
      const hasProEntitlement = customerInfo.entitlements.active[this.ENTITLEMENT_ID] !== undefined;
      
      if (hasProEntitlement) {
        const entitlement = customerInfo.entitlements.active[this.ENTITLEMENT_ID];
        console.log('✅ User has active subscription');
        
        return {
          isSubscribed: true,
          productId: entitlement.productIdentifier,
          purchaseTime: entitlement.latestPurchaseDate ? new Date(entitlement.latestPurchaseDate).getTime() : undefined,
          isAutoRenewing: entitlement.willRenew
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
    
    if (!this.initialized) {
      throw new Error('RevenueCat not initialized. Please try again in a moment.');
    }
    
    try {
      console.log('🔄 Fetching offerings...');
      
      // Get available offerings from RevenueCat
      const offerings: PurchasesOfferings = await Purchases.getOfferings();
      
      if (!offerings.current) {
        throw new Error('No subscription offerings available');
      }
      
      console.log('📋 Current offering:', offerings.current.identifier);
      console.log('📦 Available packages:', offerings.current.availablePackages.length);
      
      // Get the first package (should be our monthly subscription)
      const packageToPurchase = offerings.current.availablePackages[0];
      
      if (!packageToPurchase) {
        throw new Error('No subscription packages available');
      }
      
      console.log('🚀 Launching purchase flow for:', packageToPurchase.identifier);
      
      // Launch the purchase flow
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: packageToPurchase
      });
      
      console.log('✅ Purchase completed successfully');
      
    } catch (error: any) {
      // Check if user cancelled
      if (error.code === '1' || error.message?.includes('cancel')) {
        console.log('ℹ️ User cancelled purchase');
        throw new Error('Purchase cancelled');
      }
      
      console.error('❌ Error launching subscription flow:', error);
      throw error instanceof Error ? error : new Error('Failed to launch subscription flow');
    }
  }
}

// Create singleton instance
const Subscription = new SubscriptionService();

export default Subscription;
