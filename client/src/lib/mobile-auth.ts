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
  
  // In native apps, use the current domain for API calls
  const serverUrl = isNative 
    ? window.location.origin 
    : window.location.origin;

  return {
    isNative,
    platform,
    serverUrl
  };
}

export async function handleMobileLogin(): Promise<void> {
  const config = getMobileAuthConfig();
  
  if (!config.isNative) {
    // For web, use regular navigation
    window.location.href = '/api/login';
    return;
  }

  try {
    console.log('📱 Mobile login: Opening OAuth in system browser');
    
    // For mobile apps, open OAuth in system browser
    const loginUrl = `${config.serverUrl}/api/login`;
    
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
    // For web, use regular navigation
    window.open('https://replit.com/signup', '_blank');
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
    window.open('https://replit.com/signup', '_blank');
  }
}

export function isMobilePlatform(): boolean {
  return getMobileAuthConfig().isNative;
}