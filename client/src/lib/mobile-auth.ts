import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export interface MobileAuthConfig {
  isNative: boolean;
  platform: string;
  serverUrl: string;
}

export function getMobileAuthConfig(): MobileAuthConfig {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  // For native apps, use the actual HTTPS domain (not capacitor://localhost)
  // For web, use the current origin
  let serverUrl = window.location.origin;
  
  if (isNative && serverUrl.startsWith('capacitor://')) {
    // In Capacitor apps, get the real server URL from env var or construct it
    const deployDomain = import.meta.env.VITE_REPLIT_DOMAIN || 'b3ef8bbc-4987-4bf0-84a0-21447c42de4e-00-d9egvcnatzxk.kirk.replit.dev';
    serverUrl = `https://${deployDomain}`;
  }

  return {
    isNative,
    platform,
    serverUrl
  };
}

export async function handleMobileLogin(): Promise<void> {
  const config = getMobileAuthConfig();
  
  if (!config.isNative) {
    // For web, use regular navigation (not window.open to avoid pop-up blockers)
    console.log('🌐 Web login: Navigating to /api/login');
    window.location.href = '/api/login';
    return;
  }

  try {
    console.log('📱 Mobile login: Opening OAuth in system browser');
    
    // For mobile apps, open OAuth in system browser with full HTTPS URL
    const loginUrl = `${config.serverUrl}/api/login`;
    console.log('🔗 Login URL:', loginUrl);
    
    await Browser.open({
      url: loginUrl,
      windowName: '_system',
      toolbarColor: '#8B5CF6',
      presentationStyle: 'popover',
    });
    
    console.log('🚀 OAuth opened in system browser');
    
  } catch (error) {
    console.error('❌ Mobile login failed:', error);
    
    // Fallback to regular navigation if Browser plugin fails
    window.location.href = '/api/login';
  }
}

export async function handleMobileSignup(): Promise<void> {
  const config = getMobileAuthConfig();
  
  if (!config.isNative) {
    // For web, use location.href instead of window.open to avoid pop-up blockers
    console.log('🌐 Web signup: Navigating to Replit signup');
    window.location.href = 'https://replit.com/signup';
    return;
  }

  try {
    console.log('📱 Mobile signup: Opening Replit signup in system browser');
    
    await Browser.open({
      url: 'https://replit.com/signup',
      windowName: '_system',
      toolbarColor: '#8B5CF6',
      presentationStyle: 'popover',
    });
    
    console.log('🚀 Replit signup opened in system browser');
    
  } catch (error) {
    console.error('❌ Mobile signup failed:', error);
    
    // Fallback to regular navigation
    window.location.href = 'https://replit.com/signup';
  }
}

export function isMobilePlatform(): boolean {
  return getMobileAuthConfig().isNative;
}