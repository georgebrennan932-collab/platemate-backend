import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export interface AuthConfig {
  isNative: boolean;
  platform: string;
  hasBrowser: boolean;
}

export function getAuthConfig(): AuthConfig {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const hasBrowser = typeof Browser !== 'undefined' && typeof Browser.open === 'function';
  
  return {
    isNative,
    platform,
    hasBrowser
  };
}

/**
 * Launch OAuth signup flow
 * ALWAYS uses system browser (Browser.open) if available to prevent Google WebView blocks
 */
export async function launchSignup(): Promise<void> {
  const config = getAuthConfig();
  
  console.log('🔍 Launch signup:', {
    isNative: config.isNative,
    platform: config.platform,
    hasBrowser: config.hasBrowser
  });
  
  // Determine if we need deep-link return (mobile) or regular redirect (web)
  const needsDeepLink = config.isNative || config.platform !== 'web';
  
  // STRATEGY: Always try Browser.open first (prevents WebView OAuth blocks)
  // Only fall back to window.location if Browser.open is unavailable
  if (config.hasBrowser) {
    console.log('✅ Browser plugin available - using system browser (prevents Google OAuth block)');
    
    // For mobile/Capacitor apps, use HTTPS URL with deep-link return
    // For web browsers, use relative URL (Browser.open will open in new tab)
    const baseUrl = needsDeepLink 
      ? 'https://nutri-snap-1-georgebrennan93.replit.app' 
      : window.location.origin;
    
    const returnUrl = needsDeepLink 
      ? 'platemate://auth-complete' 
      : undefined;
    
    const signupUrl = returnUrl
      ? `${baseUrl}/api/signup?returnUrl=${encodeURIComponent(returnUrl)}`
      : `${baseUrl}/api/signup`;
    
    console.log('🔗 Opening signup in system browser:', {
      baseUrl,
      returnUrl,
      signupUrl
    });
    
    try {
      const result = await Browser.open({
        url: signupUrl,
        windowName: '_system', // Force system browser, not WebView
        toolbarColor: '#8B5CF6',
        presentationStyle: 'popover',
      });
      
      console.log('✅ System browser opened successfully:', result);
      return;
    } catch (error) {
      console.error('❌ Browser.open() failed:', error);
      
      // Only show alert on mobile where this is critical
      if (needsDeepLink) {
        alert(`Cannot open system browser: ${error instanceof Error ? error.message : String(error)}\n\nPlease ensure browser permissions are enabled.`);
        return; // Don't fallback on mobile - system browser is required
      }
      
      // On web, we can fallback to window.location
      console.warn('⚠️ Falling back to window.location (web only)');
    }
  } else {
    console.warn('⚠️ Browser plugin not available');
  }
  
  // Fallback: Only for web platform when Browser.open is unavailable
  if (!needsDeepLink) {
    console.log('🌐 Fallback: Using window.location.href');
    window.location.href = '/api/signup';
  } else {
    console.error('❌ Cannot proceed: Browser plugin required for mobile OAuth');
    alert('System browser is required for sign-in on mobile. Please check your app installation.');
  }
}

/**
 * Launch OAuth login flow
 * ALWAYS uses system browser (Browser.open) if available to prevent Google WebView blocks
 */
export async function launchLogin(): Promise<void> {
  const config = getAuthConfig();
  
  console.log('🔍 Launch login:', {
    isNative: config.isNative,
    platform: config.platform,
    hasBrowser: config.hasBrowser
  });
  
  // Determine if we need deep-link return (mobile) or regular redirect (web)
  const needsDeepLink = config.isNative || config.platform !== 'web';
  
  // STRATEGY: Always try Browser.open first (prevents WebView OAuth blocks)
  // Only fall back to window.location if Browser.open is unavailable
  if (config.hasBrowser) {
    console.log('✅ Browser plugin available - using system browser (prevents Google OAuth block)');
    
    // For mobile/Capacitor apps, use HTTPS URL with deep-link return
    // For web browsers, use relative URL (Browser.open will open in new tab)
    const baseUrl = needsDeepLink 
      ? 'https://nutri-snap-1-georgebrennan93.replit.app' 
      : window.location.origin;
    
    const returnUrl = needsDeepLink 
      ? 'platemate://auth-complete' 
      : undefined;
    
    const loginUrl = returnUrl
      ? `${baseUrl}/api/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : `${baseUrl}/api/login`;
    
    console.log('🔗 Opening login in system browser:', {
      baseUrl,
      returnUrl,
      loginUrl
    });
    
    try {
      const result = await Browser.open({
        url: loginUrl,
        windowName: '_system', // Force system browser, not WebView
        toolbarColor: '#8B5CF6',
        presentationStyle: 'popover',
      });
      
      console.log('✅ System browser opened successfully:', result);
      return;
    } catch (error) {
      console.error('❌ Browser.open() failed:', error);
      
      // Only show alert on mobile where this is critical
      if (needsDeepLink) {
        alert(`Cannot open system browser: ${error instanceof Error ? error.message : String(error)}\n\nPlease ensure browser permissions are enabled.`);
        return; // Don't fallback on mobile - system browser is required
      }
      
      // On web, we can fallback to window.location
      console.warn('⚠️ Falling back to window.location (web only)');
    }
  } else {
    console.warn('⚠️ Browser plugin not available');
  }
  
  // Fallback: Only for web platform when Browser.open is unavailable
  if (!needsDeepLink) {
    console.log('🌐 Fallback: Using window.location.href');
    window.location.href = '/api/login';
  } else {
    console.error('❌ Cannot proceed: Browser plugin required for mobile OAuth');
    alert('System browser is required for sign-in on mobile. Please check your app installation.');
  }
}
