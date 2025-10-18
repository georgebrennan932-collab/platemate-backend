# PlateMate Mobile App Build Instructions

## Prerequisites

1. Install Xcode (for iOS builds) or Android Studio (for Android builds)
2. Install Capacitor CLI globally: `npm install -g @capacitor/cli`

## Build Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Web App
```bash
npm run build
```

### 3. Sync Capacitor
```bash
npx cap sync
```

This will copy the web assets to the native projects and update native dependencies.

## iOS Build

### 4. Open iOS Project in Xcode
```bash
npx cap open ios
```

### 5. **IMPORTANT: Enable HealthKit Entitlement**

⚠️ **This step is required for step tracking to work!**

1. In Xcode, select the "App" target in the project navigator
2. Go to the "Signing & Capabilities" tab
3. Click the "+ Capability" button
4. Search for "HealthKit" and add it
5. Make sure "HealthKit" appears in the list of capabilities

### 6. Configure Signing

1. In the "Signing & Capabilities" tab, select your development team
2. Xcode will automatically generate a provisioning profile

### 7. Build and Run

- Select your target device or simulator
- Click the "Run" button (▶️) or press Cmd+R
- The app will build and launch on your device/simulator

## Android Build

### 4. Open Android Project in Android Studio
```bash
npx cap open android
```

### 5. Install Health Connect (on Device/Emulator)

The step tracking feature requires Google Health Connect to be installed:

- On a physical device: Install from Google Play Store
- On an emulator: Use a system image with Google Play services

### 6. Configure Signing (for Release Builds)

1. Go to Build → Generate Signed Bundle/APK
2. Follow the wizard to create or select a keystore

### 7. Build and Run

- Select your target device or emulator
- Click the "Run" button (▶) or press Shift+F10
- The app will build and install on your device/emulator

## Testing Step Counter

### On iOS:
1. Grant HealthKit permission when prompted
2. The app will automatically sync steps from Apple Health
3. You can verify by checking Settings → Health → Data Access & Devices → PlateMate

### On Android:
1. Install Google Health Connect from Play Store
2. Grant Health Connect permissions when prompted
3. The app will automatically sync steps from Health Connect
4. You can verify by opening Health Connect app → App permissions → PlateMate

## Troubleshooting

### iOS Step Counter Not Working
- Make sure HealthKit capability is enabled in Xcode
- Check that the app has permission in Settings → Health → Data Access & Devices
- Steps may not sync in the simulator - test on a real device

### Android Step Counter Not Working
- Install Health Connect from Play Store
- Grant all required permissions
- Make sure you have some step data in Health Connect
- The emulator typically doesn't have step data - test on a real device

### General Issues
- Run `npx cap sync` after any code changes
- Clean build folder and rebuild if you encounter caching issues
- Check that all required permissions are in AndroidManifest.xml and Info.plist

## Updating the App

After making code changes:

1. Rebuild the web app: `npm run build`
2. Sync changes: `npx cap sync`
3. Rebuild in Xcode/Android Studio

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [capacitor-health Plugin](https://github.com/mley/capacitor-health)
- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Android Health Connect Documentation](https://developer.android.com/health-and-fitness/guides/health-connect)
