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
    // Web implementation - for development/testing
    async checkSubscriptionStatus() {
      // In web/development mode, treat as subscribed for testing
      // In production web, you'd implement your own subscription logic
      return { 
        isSubscribed: true,
        productId: 'platemate_pro_monthly_web'
      };
    },
    async launchSubscriptionFlow() {
      console.log('Subscription flow not available on web');
      throw new Error('Subscription flow only available on mobile');
    }
  }),
});

export default Subscription;
