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
  
  console.log('🔍 Launch signup - isNative:', config.isNative, 'platform:', config.platform);
  
  if (config.isNative) {
    console.log('📱 Mobile: Opening OAuth signup in system browser with deep-link return');
    
    // For mobile, we need the actual HTTPS server URL, not capacitor://localhost
    // Use the Replit deployment URL
    const baseUrl = 'https://nutri-snap-1-georgebrennan93.replit.app';
    const returnUrl = 'platemate://auth-complete';
    const signupUrl = `${baseUrl}/api/signup?returnUrl=${encodeURIComponent(returnUrl)}`;
    
    console.log('🔗 Signup URL:', signupUrl);
    console.log('🔍 Browser plugin available:', typeof Browser !== 'undefined');
    
    try {
      console.log('🚀 Calling Browser.open()...');
      const result = await Browser.open({
        url: signupUrl,
        windowName: '_system',
        toolbarColor: '#8B5CF6',
        // Use fullscreen to ensure proper Chrome Custom Tabs (Android) and SFSafariViewController (iOS)
        // This prevents Google's "disallowed_useragent" error by not using popover WebViews
        presentationStyle: 'fullscreen',
      });
      
      console.log('✅ Browser.open() returned:', result);
    } catch (error) {
      console.error('❌ Failed to open OAuth signup browser:', error);
      alert(`Error opening browser: ${error instanceof Error ? error.message : String(error)}`);
      // Don't fallback - user needs to know there's an error
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
    console.log('📱 Mobile: Opening OAuth in system browser with deep-link return');
    
    // For mobile, we need the actual HTTPS server URL, not capacitor://localhost
    // Use the Replit deployment URL
    const baseUrl = 'https://nutri-snap-1-georgebrennan93.replit.app';
    const returnUrl = 'platemate://auth-complete';
    const loginUrl = `${baseUrl}/api/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    
    console.log('🔗 Login URL:', loginUrl);
    console.log('🔍 Browser plugin available:', typeof Browser !== 'undefined');
    
    try {
      console.log('🚀 Calling Browser.open()...');
      const result = await Browser.open({
        url: loginUrl,
        windowName: '_system',
        toolbarColor: '#8B5CF6',
        // Use fullscreen to ensure proper Chrome Custom Tabs (Android) and SFSafariViewController (iOS)
        // This prevents Google's "disallowed_useragent" error by not using popover WebViews
        presentationStyle: 'fullscreen',
      });
      
      console.log('✅ Browser.open() returned:', result);
    } catch (error) {
      console.error('❌ Failed to open OAuth browser:', error);
      alert(`Error opening browser: ${error instanceof Error ? error.message : String(error)}`);
      // Don't fallback - user needs to know there's an error
    }
  } else {
    console.log('🌐 Web: Navigating to OAuth login');
    window.location.href = '/api/login';
  }
}
