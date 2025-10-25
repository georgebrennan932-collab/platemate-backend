import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Subscription from '@/plugins/subscription';
import { App } from '@capacitor/app';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionContextType {
  isSubscribed: boolean;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  launchSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const checkSubscription = async () => {
    try {
      setIsLoading(true);
      const result = await Subscription.checkSubscriptionStatus();
      setIsSubscribed(result.isSubscribed);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const launchSubscription = async () => {
    try {
      await Subscription.launchSubscriptionFlow();
      // After successful purchase, recheck status
      await checkSubscription();
    } catch (error: any) {
      console.error('Error launching subscription:', error);
      if (error.message && !error.message.includes('User canceled')) {
        toast({
          title: 'Subscription Error',
          description: error.message || 'Failed to start subscription',
          variant: 'destructive'
        });
      }
    }
  };

  useEffect(() => {
    // Check subscription on mount
    checkSubscription();

    // Re-check when app comes to foreground
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkSubscription();
      }
    });

    return () => {
      appStateListener.then(listener => listener.remove());
    };
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        isLoading,
        checkSubscription,
        launchSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
