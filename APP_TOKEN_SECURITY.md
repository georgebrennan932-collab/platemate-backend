# App Token Security Implementation

## Overview

This implementation locks down your Replit-hosted web app so it can only be accessed through your paid Android app. The system uses a multi-layer approach with a gradual rollout strategy to minimize risk near launch.

## How It Works

### 1. Security Token
- **Token Value:** Stored securely (do not commit to source control)
- **Storage:** 
  - Backend: Replit Secrets as `APP_ACCESS_TOKEN`
  - Android App: Hardcoded in `MainActivity.kt` companion object
- **Important:** The token value should be kept secret and never committed to the repository

### 2. Request Flow

```
┌─────────────────┐
│  Android App    │
│  (with token)   │
└────────┬────────┘
         │ X-App-Token: xxx...
         │
         ▼
┌─────────────────┐
│  Middleware     │  ← Checks header
│  (Backend)      │
└────────┬────────┘
         │
    Valid? │
         ├─── YES → Allow request
         │
         └─── NO  → Log/Block based on mode
```

### 3. Three Protection Modes

#### **PERMISSIVE** (Current - Default for testing)
- ✅ All requests allowed
- 📊 Invalid/missing tokens are logged to console
- 🎯 Use this to: Test the Android app and verify token is being sent

#### **BLOCKING** (Production mode - when ready)
- ❌ Requests without valid token are blocked
- 🚫 Web users see "Blocked Access" page
- 🚫 API requests return 403 error
- 🎯 Use this to: Enforce app-only access

#### **DISABLED** (Emergency fallback)
- ✅ All requests allowed
- 📊 No logging
- 🎯 Use this to: Quickly disable protection if something breaks

## Implementation Details

### Backend Files

1. **`server/middleware/app-token-middleware.ts`**
   - Middleware that checks `X-App-Token` header
   - Compares against `process.env.APP_ACCESS_TOKEN`
   - Skips `/blocked-access`, `/api/health`, `/api/token-mode`

2. **`server/index.ts`**
   - Applies middleware globally (line 15)
   - Runs on every request before routing

3. **`server/routes.ts`**
   - GET `/api/token-mode` - Check current mode
   - POST `/api/token-mode` - Change mode (requires auth)

### Frontend Files

1. **`client/src/pages/BlockedAccess.tsx`**
   - Beautiful blocked access page with purple gradient
   - Explains app is Android-only
   - Link to Google Play Store
   - Lists app features

2. **`client/src/App.tsx`**
   - Route added: `/blocked-access`

### Android Files

1. **`android/app/src/main/java/com/platemate/app/MainActivity.kt`**
   - Token stored in companion object
   - JavaScript injection on WebView load
   - Intercepts `fetch()` and `XMLHttpRequest`
   - Adds `X-App-Token` header to all requests

## Testing Guide

### Phase 1: Verify Token Injection (Current)

1. **Check logs while using the web app directly (no token):**
   ```
   Look for: 🔒 Invalid/missing app token from <IP> - GET <path> (PERMISSIVE MODE - allowing)
   ```

2. **Build Android AAB and install on device:**
   ```bash
   npx cap sync android
   cd android
   ./gradlew bundleRelease
   ```

3. **Open app on Android and check logs:**
   ```
   Should NOT see: 🔒 Invalid/missing app token
   ```

4. **Test that app functions normally**

### Phase 2: Switch to Blocking Mode (After testing)

**Option A: Via API (requires authentication)**

```bash
curl -X POST https://your-repl-url.replit.dev/api/token-mode \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"mode": "blocking"}'
```

**Option B: Temporarily edit code**

In `server/middleware/app-token-middleware.ts`:
```typescript
let currentMode: TokenValidationMode = TokenValidationMode.BLOCKING; // Change from PERMISSIVE
```

### Phase 3: Verify Blocking Works

1. **Visit web URL directly in browser:**
   - Should redirect to `/blocked-access`
   - Should see beautiful purple "Access Restricted" page

2. **Test API directly:**
   ```bash
   curl https://your-repl-url.replit.dev/api/diary
   ```
   - Should return: `{"message":"Access denied...","code":"INVALID_APP_TOKEN"}`

3. **Open Android app:**
   - Should work normally
   - No redirect to blocked page

## Switch Between Modes

### Get Current Mode
```bash
curl https://your-repl-url.replit.dev/api/token-mode
# Returns: {"mode":"permissive"}
```

### Change Mode (requires auth)
```bash
# Switch to blocking
POST /api/token-mode
Body: {"mode": "blocking"}

# Switch to permissive  
POST /api/token-mode
Body: {"mode": "permissive"}

# Emergency disable
POST /api/token-mode
Body: {"mode": "disabled"}
```

## Rollback Strategy

If anything breaks in production:

1. **Immediate fix (< 30 seconds):**
   ```bash
   POST /api/token-mode with {"mode": "disabled"}
   ```

2. **Alternative: Comment out middleware:**
   In `server/index.ts`, comment out line 15:
   ```typescript
   // app.use(appTokenMiddleware);
   ```

## Security Considerations

### Current Limitations
⚠️ **The token CAN be extracted by decompiling the Android APK**
- Provides good protection against casual access
- NOT cryptographically secure against determined attackers

### Future Improvements (Optional)
1. **Google Play Integrity API** - Verify app signature
2. **JWT Tokens** - Short-lived tokens with expiration
3. **Server-side subscription validation** - Check Google Play billing status

### Current Approach is Good For:
✅ Preventing casual web access
✅ Ensuring users download the app
✅ Separating free (web) vs paid (app) tiers
✅ Quick rollout with minimal risk

## Launch Checklist

- [ ] Test Android app with token injection
- [ ] Verify logs show no "Invalid/missing app token" warnings from app
- [ ] Test web browser shows logged warnings (permissive mode)
- [ ] Test blocked access page renders correctly
- [ ] Test switching modes via API
- [ ] Build final AAB with token embedded
- [ ] Switch to BLOCKING mode after app launch
- [ ] Monitor logs for any issues
- [ ] Keep rollback plan ready

## Token Rotation (Future)

If you need to change the token:

1. Generate new token:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

2. Update Replit secret: `APP_ACCESS_TOKEN`

3. Update Android `MainActivity.kt` companion object

4. Rebuild and release new Android version

5. Old app versions will stop working (forced update)

## Support

Current mode: **PERMISSIVE** (logging only, not blocking)
Token configured: **✅ Yes**
Middleware active: **✅ Yes**
Android integration: **✅ Ready**
Blocked page: **✅ Ready**

Everything is set up and ready to test! 🎉
