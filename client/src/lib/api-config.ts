import { Capacitor } from '@capacitor/core';

/**
 * API Configuration for Mobile and Web
 * 
 * In browser: Uses relative URLs (e.g., '/api/...')
 * In mobile production: Uses full backend URL from environment variable
 */

/**
 * Get the base URL for API requests
 * - In browser/development: returns empty string (uses relative URLs)
 * - In Capacitor (mobile): returns the full backend URL from environment variable
 */
export function getApiBaseUrl(): string {
  // Check if running in Capacitor (mobile app)
  if (Capacitor.isNativePlatform()) {
    // Use the backend URL from environment variable
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (!backendUrl) {
      console.error('❌ VITE_API_BASE_URL not configured for mobile app!');
      console.error('Mobile app cannot reach backend API without this configuration.');
      throw new Error('Backend API URL not configured. Please set VITE_API_BASE_URL environment variable.');
    }
    
    console.log('📱 Mobile mode: Using backend URL:', backendUrl);
    return backendUrl;
  }
  
  // In browser, use relative URLs
  return '';
}

/**
 * Build a full API URL
 * - In browser: returns '/api/path'
 * - In mobile: returns 'https://your-replit-url.repl.co/api/path'
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If no base URL (browser mode), return the path as-is
  if (!baseUrl) {
    return normalizedPath;
  }
  
  // Combine base URL with path (remove trailing slash from base if present)
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}${normalizedPath}`;
}

/**
 * Check if running in native mobile app
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get platform name
 */
export function getPlatformName(): string {
  return Capacitor.getPlatform();
}
