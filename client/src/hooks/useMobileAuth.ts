import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface OAuthResult {
  access_token?: string;
  code?: string;
  state?: string;
}

export function useMobileAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up deep link listener for OAuth redirects
    const setupDeepLinkListener = async () => {
      if (Capacitor.isNativePlatform()) {
        App.addListener('appUrlOpen', (event) => {
          console.log('🔗 Deep link received:', event.url);
          handleOAuthCallback(event.url);
        });
      }
    };

    setupDeepLinkListener();

    return () => {
      if (Capacitor.isNativePlatform()) {
        App.removeAllListeners();
      }
    };
  }, []);

  const handleOAuthCallback = async (url: string) => {
    try {
      console.log('🔄 Processing OAuth callback:', url);
      
      // Extract auth code or token from the URL
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      
      if (code) {
        console.log('✅ OAuth code received, exchanging for session...');
        
        // Send the code to our backend to exchange for a session
        const response = await fetch('/api/auth/mobile-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ code, state }),
        });

        if (response.ok) {
          console.log('🎉 Mobile authentication successful!');
          toast({
            title: "Welcome to PlateMate!",
            description: "Successfully signed in",
          });
          
          // Invalidate auth cache to trigger re-fetch
          queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        } else {
          throw new Error('Failed to authenticate');
        }
      }
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      toast({
        title: "Sign In Failed",
        description: "Unable to complete authentication",
        variant: "destructive",
      });
    }
  };

  const signInWithMobile = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Fall back to web authentication
      window.location.href = '/api/login';
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🚀 Starting mobile authentication...');
      
      // For mobile development, let's use a temporary bypass
      // This creates a temporary authenticated session for testing
      const response = await fetch('/api/auth/mobile-demo-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          platform: 'mobile',
          userAgent: navigator.userAgent 
        }),
      });

      if (response.ok) {
        console.log('🎉 Mobile demo authentication successful!');
        toast({
          title: "Welcome to PlateMate!",
          description: "Demo authentication successful for mobile testing",
        });
        
        // Invalidate auth cache to trigger re-fetch
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      } else {
        throw new Error('Demo authentication failed');
      }
      
    } catch (error) {
      console.error('❌ Mobile authentication error:', error);
      toast({
        title: "Sign In Failed", 
        description: "Unable to authenticate on mobile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signInWithMobile,
    isLoading,
    isMobile: Capacitor.isNativePlatform(),
  };
}