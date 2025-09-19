import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.platemate.app',
  appName: 'PlateMate',
  webDir: 'dist/public',
  server: {
    url: 'https://b3ef8bbc-4987-4bf0-84a0-21447c42de4e-00-d9egvcnatzxk.kirk.replit.dev',
    cleartext: false
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
