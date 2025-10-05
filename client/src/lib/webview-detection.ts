/**
 * WebView Detection Utility
 * 
 * Detects if the app is running in an embedded browser/WebView
 * which may cause Google OAuth "disallowed_useragent" errors.
 * 
 * Common embedded browsers: Instagram, Facebook, LinkedIn, Twitter, etc.
 */

export function isEmbeddedBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent.toLowerCase();
  
  // Check for common embedded browser indicators
  const embeddedBrowserPatterns = [
    'instagram',     // Instagram in-app browser
    'fban',          // Facebook App
    'fbav',          // Facebook App
    'linkedin',      // LinkedIn in-app browser
    'twitter',       // Twitter in-app browser
    'line/',         // LINE in-app browser
    'wv',            // Generic WebView indicator (Android)
    'micromessenger', // WeChat in-app browser
  ];
  
  return embeddedBrowserPatterns.some(pattern => ua.includes(pattern));
}

export function getRecommendedBrowser(): string {
  const platform = navigator.platform.toLowerCase();
  
  if (platform.includes('iphone') || platform.includes('ipad')) {
    return 'Safari';
  } else if (platform.includes('android')) {
    return 'Chrome';
  } else {
    return 'your default browser';
  }
}

export function getBrowserName(): string {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('instagram')) return 'Instagram';
  if (ua.includes('fban') || ua.includes('fbav')) return 'Facebook';
  if (ua.includes('linkedin')) return 'LinkedIn';
  if (ua.includes('twitter')) return 'Twitter/X';
  if (ua.includes('micromessenger')) return 'WeChat';
  if (ua.includes('line/')) return 'LINE';
  
  return 'embedded browser';
}
