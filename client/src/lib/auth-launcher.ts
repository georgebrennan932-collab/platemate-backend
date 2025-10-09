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
 * Navigate to email/password registration page
 */
export async function launchSignup(): Promise<void> {
  const config = getAuthConfig();
  
  console.log('🔍 Launch signup:', {
    isNative: config.isNative,
    platform: config.platform
  });
  
  // Simply navigate to the register page within the app
  window.location.href = '/register';
}

/**
 * Navigate to email/password login page
 */
export async function launchLogin(): Promise<void> {
  const config = getAuthConfig();
  
  console.log('🔍 Launch login:', {
    isNative: config.isNative,
    platform: config.platform
  });
  
  // Simply navigate to the login page within the app
  window.location.href = '/login';
}
