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
    console.log('📱 Mobile: Opening OAuth signup in system browser with deep-link return');
    
    // For mobile, use OAuth flow (same as login) with signup hint
    const baseUrl = window.location.origin;
    const returnUrl = 'platemate://auth-complete';
    const signupUrl = `${baseUrl}/api/signup?returnUrl=${encodeURIComponent(returnUrl)}`;
    
    console.log('🔗 Signup URL:', signupUrl);
    
    try {
      await Browser.open({
        url: signupUrl,
        windowName: '_system',
        toolbarColor: '#8B5CF6',
        presentationStyle: 'popover',
      });
      
      console.log('✅ OAuth signup browser opened successfully');
    } catch (error) {
      console.error('❌ Failed to open OAuth signup browser:', error);
      window.location.href = '/api/signup';
    }
  } else {
    console.log('🌐 Web: Navigating to OAuth signup');
    window.location.href = '/api/signup';
  }
}

export async function launchLogin(): Promise<void> {
  const config = getAuthConfig();
  
  if (config.isNative) {
    console.log('📱 Mobile: Opening OAuth in system browser with deep-link return');
    
    // For mobile, use absolute HTTPS URL (not relative path)
    const baseUrl = window.location.origin;
    const returnUrl = 'platemate://auth-complete';
    const loginUrl = `${baseUrl}/api/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    
    console.log('🔗 Login URL:', loginUrl);
    
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
