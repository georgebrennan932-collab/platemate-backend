import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { isSubscribed, isLoading } = useSubscription();
  const [location, setLocation] = useLocation();

  // Subscription enforcement ENABLED - testing production billing
  const BYPASS_SUBSCRIPTION = false;

  // Paths that don't require subscription
  const publicPaths = ['/subscription', '/login', '/register', '/forgot-password', '/landing', '/blocked-access'];

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) return;

    // Bypass subscription check until production build is ready
    if (BYPASS_SUBSCRIPTION) {
      console.log('🚧 Bypassing subscription check - using free access mode');
      return;
    }

    // Check if current path is public
    const isPublicPath = publicPaths.some(path => location.startsWith(path));

    // If not subscribed and trying to access protected content, redirect to subscription
    if (!isSubscribed && !isPublicPath) {
      console.log('🔒 Redirecting to subscription - not subscribed');
      setLocation('/subscription');
    }
  }, [isSubscribed, isLoading, location]);

  // Show loading while checking subscription
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading PlateMate...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
