import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.platemate.app',
  appName: 'PlateMate',
  webDir: 'public',
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
