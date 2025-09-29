import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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

export async function launchSignup(): Promise<void> {
  const config = getAuthConfig();
  
  if (config.isNative) {
    console.log('📱 Mobile: Opening Replit signup in system browser');
    
    try {
      await Browser.open({
        url: 'https://replit.com/signup',
        windowName: '_system',
        toolbarColor: '#8B5CF6',
        presentationStyle: 'popover',
      });
      
      console.log('✅ Signup browser opened successfully');
    } catch (error) {
      console.error('❌ Failed to open signup browser:', error);
      window.location.href = 'https://replit.com/signup';
    }
  } else {
    console.log('🌐 Web: Navigating to Replit signup');
    window.location.href = 'https://replit.com/signup';
  }
}

export async function launchLogin(): Promise<void> {
  const config = getAuthConfig();
  
  if (config.isNative) {
    console.log('📱 Mobile: Opening OAuth in system browser with deep-link return');
    
    // For mobile, include returnUrl so backend can redirect back to the app
    const returnUrl = 'platemate://auth-complete';
    const loginUrl = `/api/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    
    try {
      await Browser.open({
        url: loginUrl,
        windowName: '_system',
        toolbarColor: '#8B5CF6',
        presentationStyle: 'popover',
      });
      
      console.log('✅ OAuth browser opened successfully');
    } catch (error) {
      console.error('❌ Failed to open OAuth browser:', error);
      window.location.href = '/api/login';
    }
  } else {
    console.log('🌐 Web: Navigating to OAuth login');
    window.location.href = '/api/login';
  }
}
