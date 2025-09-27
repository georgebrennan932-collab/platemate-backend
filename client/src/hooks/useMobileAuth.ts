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
      console.log('🚀 Starting simplified mobile OAuth flow...');
      
      // For mobile apps, just open the standard OAuth URL in the system browser
      // The system will handle the redirect back to our app via custom URL scheme
      const authUrl = `/api/login`;
      
      // Open in system browser and let the OAuth redirect handle the flow
      window.open(authUrl, '_system');
      
    } catch (error) {
      console.error('❌ Mobile authentication error:', error);
      toast({
        title: "Sign In Failed", 
        description: "Unable to start authentication",
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