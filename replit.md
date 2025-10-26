# Overview

PlateMate is a full-stack web and native mobile application designed for AI-powered food image analysis. It identifies food items from user-uploaded photos, calculates nutritional information, and provides detailed breakdowns. The application aims to offer a mobile-first, intuitive experience for food scanning and nutrition tracking, available as both a Progressive Web App (PWA) and native iOS/Android applications.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React 18 with TypeScript, Vite, Wouter for routing.
- **UI**: Radix UI, shadcn/ui, Tailwind CSS.
- **State Management**: TanStack Query (React Query).
- **Form Handling**: React Hook Form with Zod validation.
- **Mobile Integration**: Capacitor for native iOS/Android apps, camera access, file system access, deep-link handling for OAuth.
- **UI/UX**: Mobile-first responsive design, atomic component architecture, Framer Motion animations, modern aesthetics with gradients.

## Backend
- **Runtime**: Node.js with Express.js, TypeScript.
- **API Design**: RESTful API with JSON responses.
- **File Processing**: Multer for uploads, Sharp for image optimization.
- **Error Handling**: Centralized middleware.

## Data Storage
- **Database**: PostgreSQL via Drizzle ORM and Drizzle Kit, integrated with Neon Database.
- **Current Development**: In-memory storage for rapid prototyping.

## Authentication and Authorization
- **Method**: Email/Password authentication using @replit/database for user storage.
- **Session Management**: In-memory session storage with bearer token authentication.
- **Password Reset**: Security question-based reset with bcrypt-hashed answers and expiring tokens.
- **User Isolation**: Strict data isolation for all user-specific data.
- **Mobile OAuth**: Capacitor-compatible flow using system browser with deep-link callbacks and secure bridge tokens.

## Monetization and Subscription
- **Model**: Free-to-download app with mandatory subscription via Google Play Billing at £4.99/month.
- **Subscription System**: Custom Capacitor plugin (BillingPlugin) using Google Play Billing Library 8.0.0 directly.
- **Native Implementation**: BillingPlugin.kt handles billing client initialization, subscription checking, and purchase flows.
- **Feature Gating**: All major features locked until active subscription confirmed via SubscriptionGate component.
- **Free Trial**: 7-day free trial enabled through Google Play Console, automatically applied at checkout.
- **Subscription Flow**: On first launch, users see subscription screen before accessing any features.
- **Validation**: Subscription status checked by querying active purchases via Google Play Billing API.
- **Frontend Integration**: React SubscriptionContext provides app-wide subscription state with automatic re-validation.
- **Product ID**: platemate_pro_monthly (configured in Google Play Console).
- **Purchase Handling**: Plugin properly handles all purchase states (purchased, pending, cancelled, errors) with proper promise resolution.

## AI Services
- **Multi-Provider System**: Supports OpenAI (GPT-4o-mini, GPT-5) and Google Gemini (Flash/Pro) with automatic failover, health monitoring, and load balancing.
- **Core Functionality**: Food recognition, nutritional analysis, quantity detection, UK-to-US food term mapping.
- **User Interaction**: Comprehensive food analysis editing with real-time nutrition recalculation.
  - **Streamlined Save Flow**: Combined "Save Changes" and "Add to Diary" into a single "Save to Diary" action that saves analysis edits and creates diary entry in one click
  - **Improved UI Contrast**: Food cards redesigned with lighter purple/white gradients for better text readability on mobile devices
  - **Auto-save on Diary**: Edits to food items are automatically saved when adding to diary, eliminating confusion about unsaved changes
- **AI Daily Reflections**: AI-powered daily nutrition insights based on user data.
- **Scan-a-Menu Feature**: QR code scanning for restaurant menus, AI-powered meal recommendations.
- **AI Coach Personalization**: User profile data used to tailor AI advice, respecting dietary restrictions and allergies.
- **AI Coach Avatar System**: Visual avatar interface with 5 distinct personalities (Military Drill Sergeant, Friendly Gym Bro, Zen Wellness Coach, Clinical Expert, Dark Humour), featuring animated avatars with personality-specific color schemes, breathing animations, particle effects, and thinking indicators. Optimized WebP images (93% size reduction) with lazy loading for mobile performance.

## Key Design Decisions
- **Mobile-First**: Optimized for mobile food scanning.
- **Type Safety**: End-to-end TypeScript.
- **Image Handling**: Client-side compression and server-side optimization.
- **Extensible AI**: Architecture supports various external food recognition APIs.
- **Development Experience**: Hot reloading, TypeScript checking, integrated error overlays.
- **Barcode Scanning**: Full-screen camera barcode scanning using BarcodeDetector API and ZXing fallback, integrated with OpenFoodFacts API.
- **Gamification**: Challenges and rewards system for user engagement.
- **Activity Tracking**: Integrated step counter with rewards, using Capacitor-health plugin.
- **Unified Theme**: Consistent vibrant purple color scheme across the application.
- **Weekly Shift Planner**: Advanced scheduling system for shift workers (especially NHS/frontline workers) that generates AI-optimized meal plans based on work schedules. Features include:
  - Calendar view for 7-day shift scheduling (day/night/evening/rotating/custom shifts)
  - Break window customization and custom shift timing support
  - AI-powered meal plan generation with shift-specific optimization for timing, portability, and nutrition
  - Meal strategies considering pre-shift energy, during-shift sustainability, and post-shift recovery
  - Portability classifications (portable, meal-prep-friendly, home-only) for on-the-go workers
  - Comprehensive meal cards with nutrition breakdown, ingredients, benefits, and shift-specific tips
  - Database persistence using PostgreSQL (shiftSchedules table)
  - Full test coverage with data-testid attributes on all interactive and dynamic elements
- **Water Tracking**: Dedicated hydration monitoring system integrated into the diary page. Features include:
  - Progress bar displaying consumed vs. daily goal (ml and percentage)
  - Quick-add buttons for common amounts (250ml, 500ml, 750ml, 1L)
  - Custom amount input with validation (1-5000ml range)
  - Daily log showing all entries with timestamps and delete functionality
  - Editable daily water goal (1-10000ml range)
  - Smart goal calculation: Default 2500ml, auto-adjusts to 1500ml for users with fluid-restricting medical conditions (kidney disease, heart failure, fluid retention)
  - Separate database table (waterIntake) for dedicated water tracking
  - Complete authentication and user data isolation
  - Full test coverage with data-testid attributes

# External Dependencies

- **AI Services**: OpenAI API, Google Gemini API
- **Database**: Neon Database (PostgreSQL)
- **Image Processing**: Sharp
- **UI Icons**: Lucide React, Font Awesome
- **Fonts**: Google Fonts
- **Mobile Platform**: Capacitor (for iOS/Android native app deployment)
- **Barcode Data**: OpenFoodFacts API
- **Social Sharing**: `dom-to-image-more` library, Web Share API
- **Health Tracking**: `capacitor-health` plugin
- **Billing**: Custom Capacitor plugin using Google Play Billing Library 8.0.0 for subscription management

# Android App Build & Deployment

## Development vs Production Mode

**Important:** Native plugins (BillingPlugin, Camera, etc.) ONLY work when the app loads **local bundled files** from `capacitor://localhost`.

### Development Mode (Live Reload)
- Clicking "Run" (▶️) in Android Studio enables **live reload** which connects to Replit dev server
- Logs show package: `com.replit.app` and `[vite] connecting`
- Native plugins return `UNIMPLEMENTED` error
- **Use for:** UI/frontend development with hot reload

### Production Mode (Local Files)
- App loads from `capacitor://localhost` using bundled assets
- Logs show package: `com.georgebrennan.platemate3` and `BillingPlugin loaded`
- Native plugins work correctly (billing, camera, etc.)
- **Use for:** Testing native features, building releases

## Building for Production

### 1. Build Production Web Assets
```bash
npm run build
```
This creates optimized production files in `dist/public/`

### 2. Sync to Android
```bash
npx cap sync android
```

This command:
- Copies production build from `dist/public` to `android/app/src/main/assets/public`
- Updates native plugin registrations
- Generates `capacitor.config.json` in Android assets
- **Ensures app loads local files instead of dev server**

### 3. Build the Android App
The Android app must be rebuilt using Android Studio to activate native plugins like Google Play Billing:

1. **Open in Android Studio**:
   - Open the `android/` folder in Android Studio
   - Wait for Gradle sync to complete

2. **Build APK** (for testing):
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - APK will be in `android/app/build/outputs/apk/`

3. **Build AAB** (for Google Play):
   - Build → Build Bundle(s) / APK(s) → Build Bundle(s)
   - AAB will be in `android/app/build/outputs/bundle/`

4. **Run on Device**:
   - Connect Android device via USB with debugging enabled
   - Click Run (green play button) in Android Studio
   - App will install and launch on device

## Debugging Native Plugins
View native Android logs using Android Studio's Logcat:
- Filter by tag: `Purchases` for RevenueCat billing-related logs
- JavaScript logs visible in browser console with emoji markers: 🚀 (loading), ✅ (success), ❌ (error)

## Google Play Console Setup Required
For billing to work, the app must be:
1. Uploaded to Google Play Console (Internal Testing or Production)
2. Subscription product `platemate_pro_monthly` created with 7-day free trial
3. Installed from Google Play (not sideloaded APK)
4. Signed with the release keystore configured in Google Play

**Note**: Billing will NOT work in development APKs or when sideloaded. Testing requires Google Play Internal Testing track.