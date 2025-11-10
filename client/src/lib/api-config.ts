import { Capacitor } from '@capacitor/core';

/**
 * 🔧 Fixed API Configuration for PlateMate
 * Works both on web preview and mobile app.
 * Always uses live backend on mobile.
 */

const LIVE_BACKEND_URL = "https://platemate-api.onrender.com"; 
// ⬆️ Replace this with your actual backend (Replit / Render / Railway URL)

export function getApiBaseUrl(): string {
  // If running as a native app, always use the live backend
  if (Capacitor.isNativePlatform()) {
    console.log("📱 Running on mobile — using live backend:", LIVE_BACKEND_URL);
    return LIVE_BACKEND_URL;
  }

  // If running in browser (local web preview), use relative paths
  return "";
}

/**
 * Build a full API URL (handles web + mobile automatically)
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}${normalizedPath}`;
}

/**
 * Helper: Detect if running as a native app
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Helper: Get current platform
 */
export function getPlatformName(): string {
  return Capacitor.getPlatform();
}
