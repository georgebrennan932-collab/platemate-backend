import { registerPlugin } from '@capacitor/core';

export interface SubscriptionPlugin {
  checkSubscriptionStatus(): Promise<{
    isSubscribed: boolean;
    productId?: string;
    purchaseToken?: string;
    purchaseTime?: number;
    isAutoRenewing?: boolean;
  }>;
  
  launchSubscriptionFlow(): Promise<void>;
}

// Register our custom billing plugin
const Billing = registerPlugin<SubscriptionPlugin>('Billing');

class SubscriptionService implements SubscriptionPlugin {
  private readonly PRODUCT_ID = 'platemate_pro_monthly';
  
  async checkSubscriptionStatus(): Promise<{
    isSubscribed: boolean;
    productId?: string;
    purchaseToken?: string;
    purchaseTime?: number;
    isAutoRenewing?: boolean;
  }> {
    try {
      console.log('🔍 Checking subscription status via native plugin...');
      
      const result = await Billing.checkSubscriptionStatus();
      
      console.log('📦 Subscription status:', {
        isSubscribed: result.isSubscribed,
        productId: result.productId,
        hasToken: !!result.purchaseToken
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      
      // Return not subscribed on error
      return {
        isSubscribed: false,
        productId: this.PRODUCT_ID
      };
    }
  }
  
  async launchSubscriptionFlow(): Promise<void> {
    try {
      console.log('🚀 Launching subscription flow via native plugin...');
      
      await Billing.launchSubscriptionFlow();
      
      console.log('✅ Subscription flow completed');
    } catch (error: any) {
      console.error('❌ Error launching subscription flow:', error);
      
      // Check if user cancelled
      if (error.message?.includes('cancel')) {
        throw new Error('Purchase cancelled');
      }
      
      throw error instanceof Error ? error : new Error('Failed to launch subscription flow');
    }
  }
}

// Create singleton instance
const Subscription = new SubscriptionService();

export default Subscription;
