import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.platemate.app',
  appName: 'PlateMate',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // For development, use the Replit URL; for production, use the published app URL
    url: process.env.NODE_ENV === 'development' 
      ? (process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : undefined)
      : undefined,
    cleartext: false, // Force HTTPS for security
    allowNavigation: [
      'https://replit.com',  // Allow navigation to Replit auth
      '*://localhost:*',     // Allow localhost for development
      'https://*.replit.dev', // Allow all Replit domains
      'https://*.replit.app'  // Allow published app domains
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#8B5CF6",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark'
    },
    Camera: {
      permissions: [
        'camera',
        'photos'
      ]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#8B5CF6",
      sound: "beep.wav"
    },
    Motion: {
      interval: 100
    }
  }
};

export default config;
