import { Capacitor } from '@capacitor/core';

export interface MobileAuthConfig {
  isNative: boolean;
  platform: 'web' | 'ios' | 'android';
  serverUrl: string;
}

export function getMobileAuthConfig(): MobileAuthConfig {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as 'web' | 'ios' | 'android';
  
  // For native mobile apps, use the server URL from environment or current window location
  let serverUrl = '';
  if (typeof window !== 'undefined') {
    if (isNative) {
      // In native app, use the base URL configured in Capacitor
      serverUrl = window.location.origin;
    } else {
      // In web browser, use current origin
      serverUrl = window.location.origin;
    }
  }

  return {
    isNative,
    platform,
    serverUrl
  };
}

export function getAuthUrl(endpoint: string): string {
  const config = getMobileAuthConfig();
  return `${config.serverUrl}${endpoint}`;
}

export async function mobileCompatibleFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const config = getMobileAuthConfig();
  const fullUrl = url.startsWith('http') ? url : getAuthUrl(url);
  
  // Ensure credentials are included for session cookies
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      // Add mobile app identification header
      'X-Requested-With': config.isNative ? 'CapacitorApp' : 'WebBrowser',
      'X-Platform': config.platform,
    }
  };

  try {
    const response = await fetch(fullUrl, fetchOptions);
    return response;
  } catch (error) {
    console.error('Mobile auth fetch error:', error);
    throw error;
  }
}

export function isMobileApp(): boolean {
  return getMobileAuthConfig().isNative;
}

export function shouldUseJsonResponse(): boolean {
  // Mobile apps generally prefer JSON responses over redirects
  return isMobileApp();
}