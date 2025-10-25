import { registerPlugin } from '@capacitor/core';

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

const Subscription = registerPlugin<SubscriptionPlugin>('Subscription', {
  web: () => ({
    // Web implementation - requires mobile app for subscription
    async checkSubscriptionStatus() {
      // Web version requires users to download the mobile app to subscribe
      console.warn('⚠️ Subscription check on web - user must use mobile app to subscribe');
      return { 
        isSubscribed: false,
        productId: 'platemate_pro_monthly_web',
        error: 'Subscription only available on mobile app'
      };
    },
    async launchSubscriptionFlow() {
      console.log('Subscription flow not available on web');
      throw new Error('Subscription is only available in the mobile app. Please download PlateMate from Google Play.');
    }
  }),
});

export default Subscription;
