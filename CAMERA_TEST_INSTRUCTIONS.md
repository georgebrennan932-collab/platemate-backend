# Camera Test Instructions for Android Build

## Pre-Test Setup

### 1. Build the Android APK
```bash
# In your Replit workspace
npx cap sync android
npx cap open android
```

### 2. In Android Studio
- Build > Build Bundle(s) / APK(s) > Build APK(s)
- Wait for build to complete
- Install APK on your Android device

## Testing Steps

### Step 1: Navigate to Camera Test Page
1. Open the PlateMate app on your Android device
2. Navigate to `/camera-test` route or access from the navigation menu

### Step 2: Run Diagnostics
1. Tap "🔍 Run Platform Diagnostics" button
2. **Expected Results:**
   - Platform: Should show `android` (NOT `web`)
   - Is Native Platform: Should show `true`
   - Camera Plugin Available: Should show `true`
   - Available Plugins should include: Camera, Device, Filesystem, etc.

**⚠️ If platform shows `web`:** The Capacitor bridge is not properly initialized - rebuild required

### Step 3: Check Camera Permissions
1. Tap "🔐 Check Camera Permissions" button
2. If permissions not granted, tap again to request
3. **Expected Result:** Permission status should show `granted`

### Step 4: Test Native Camera
1. Tap "📷 Test Native Camera" button
2. **Expected Behavior:**
   - Should launch native Android camera (NOT browser camera prompt)
   - Camera UI should be Android's native camera interface
   - After taking photo, it should return to app with preview

**⚠️ If browser camera prompt appears:** Capacitor Camera is falling back to web - bridge mismatch

### Step 5: Verify Image Capture
1. After taking photo, verify it displays in the "Captured Photo" section
2. Format should be `jpeg` or `png`
3. Image should be clear and display correctly

## Debugging Failed Tests

### If Platform Shows "web" Instead of "android":
```bash
# Clean rebuild process
rm -rf node_modules dist android/app/build
npm install
npm run build
npx cap sync android
# Rebuild APK in Android Studio
```

### If Camera Opens in Browser Instead of Native:
```bash
# Check Capacitor plugin sync
npx cap sync android
# Verify camera plugin version
npm list @capacitor/camera
# Should show 7.0.2
```

### If Permission Errors Occur:
1. Check `AndroidManifest.xml` has camera permissions
2. Manually grant permissions in Android Settings
3. Verify app is running in secure context (HTTPS in WebView)

### Get Android Logs:
```bash
# Connect device via USB
adb logcat | grep -E "Capacitor|Camera|platemate|chromium"

# Filter for errors only
adb logcat | grep -E "ERROR|FATAL"
```

## Success Criteria

✅ **Camera Test Passes When:**
1. Platform detection shows `android` (not `web`)
2. `isNativePlatform` returns `true`
3. Camera plugin launches Android's native camera interface
4. Photos are successfully captured and displayed
5. No WebView camera fallback occurs

## Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Platform shows "web" | Capacitor bridge mismatch | Clean rebuild with `npx cap sync android` |
| Browser camera appears | HTML fallback triggered | Verify Capacitor.isNativePlatform() returns true |
| Permission denied | Android permissions | Grant camera permission in Android Settings |
| Black screen | WebView security | Ensure app uses HTTPS in production |

## After Successful Test

Once all tests pass on the test page:
1. The native camera bridge is working correctly
2. Safe to test the full camera functionality in main app
3. Build production APK for deployment

## Additional Notes

- **Development vs Production:** Auth cookies may behave differently in dev
- **WebView Context:** Android WebView has stricter security than mobile browser
- **Capacitor Version:** Ensure all @capacitor packages use 7.x.x consistently
