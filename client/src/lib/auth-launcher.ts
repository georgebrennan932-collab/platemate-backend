import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SocialLogin } from '@capgo/capacitor-social-login';

export interface AuthConfig {
  isNative: boolean;
  platform: string;
}

export function getAuthConfig(): AuthConfig {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  return {
    isNative,
    platform
  };
}

// Initialize Google Sign-In for native platforms
export async function initializeGoogleAuth(): Promise<void> {
  const config = getAuthConfig();
  
  if (!config.isNative) {
    console.log('🌐 Web platform - skipping native Google Auth initialization');
    return;
  }

  try {
    console.log('📱 Initializing native Google Sign-In...');
    
    // Fetch Google Web Client ID from backend
    const response = await fetch('/api/auth/google/config');
    const { webClientId } = await response.json();
    
    if (!webClientId) {
      throw new Error('Google Web Client ID not configured on server');
    }
    
    await SocialLogin.initialize({
      google: {
        webClientId,
      },
    });
    console.log('✅ Native Google Sign-In initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Google Sign-In:', error);
  }
}

export async function launchSignup(): Promise<void> {
  const config = getAuthConfig();
  
  console.log('🔍 Launch signup - isNative:', config.isNative, 'platform:', config.platform);
  
  if (config.isNative) {
    console.log('📱 Mobile: Using native Google Sign-In');
    
    try {
      console.log('🚀 Calling SocialLogin.login()...');
      const result = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['profile', 'email']
        }
      });
      
      console.log('✅ Native Google Sign-In successful:', result);
      
      // Extract ID token from the result
      const googleResult = result.result as any;
      const idToken = googleResult.authentication?.idToken || googleResult.idToken;
      
      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      
      // Send the ID token to our backend to create a session
      const response = await fetch('/api/auth/google/mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify({
          idToken,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }
      
      const data = await response.json();
      console.log('✅ Session created:', data);
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Google Sign-In failed:', error);
      alert(`Sign up failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log('🌐 Web: Navigating to OAuth signup');
    window.location.href = '/api/signup';
  }
}

export async function launchLogin(): Promise<void> {
  const config = getAuthConfig();
  
  console.log('🔍 Launch login - isNative:', config.isNative, 'platform:', config.platform);
  
  if (config.isNative) {
    console.log('📱 Mobile: Using native Google Sign-In');
    
    try {
      console.log('🚀 Calling SocialLogin.login()...');
      const result = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['profile', 'email']
        }
      });
      
      console.log('✅ Native Google Sign-In successful:', result);
      
      // Extract ID token from the result
      const googleResult = result.result as any;
      const idToken = googleResult.authentication?.idToken || googleResult.idToken;
      
      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      
      // Send the ID token to our backend to create a session
      const response = await fetch('/api/auth/google/mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify({
          idToken,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }
      
      const data = await response.json();
      console.log('✅ Session created:', data);
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Google Sign-In failed:', error);
      alert(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log('🌐 Web: Navigating to OAuth login');
    window.location.href = '/api/login';
  }
}
