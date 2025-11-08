# PlateMate

AI-powered nutrition tracking app with food image analysis, menu scanning, and personalized coaching. Built for web and native mobile (Android/iOS) platforms.

## Features

- 📸 AI-powered food recognition from photos
- 🍽️ Menu scanner with QR code support and meal recommendations
- 💬 Personalized AI nutrition coaching with multiple coach personalities
- 📊 Comprehensive nutrition tracking and daily insights
- 🏃 Activity and step tracking integration
- 🎯 Gamification with challenges and rewards
- 💧 Hydration tracking
- 📅 Shift planner for healthcare workers
- 📱 Native iOS/Android apps via Capacitor
- 💳 Subscription-based model (£4.99/month via Google Play Billing)

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui components
- TanStack Query (React Query)
- Wouter (routing)
- Framer Motion (animations)

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL (via Drizzle ORM)
- Neon Database

### Mobile
- Capacitor 7 (iOS/Android bridge)
- Custom Google Play Billing plugin
- Camera, barcode scanning, health tracking

### AI Services
- OpenAI (GPT-4, GPT-5)
- Google Gemini (Flash/Pro)
- Multi-provider failover system

## Prerequisites

- Node.js 20+ 
- PostgreSQL database (recommend [Neon](https://neon.tech) for free tier)
- OpenAI API key or Google Gemini API key
- For mobile development: Android Studio and/or Xcode

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:
- `DATABASE_URL` - Your PostgreSQL connection string
- `OPENAI_API_KEY` or `GEMINI_API_KEY` - For AI food analysis

### 3. Initialize Database

Push the database schema:

```bash
npm run db:push
```

### 4. Run Development Server

```bash
npm run dev
```

The app will start at **http://localhost:5000** (Express server serves both backend API and Vite frontend).

> **Note**: This is a fullstack application where Express runs on port 5000 and serves Vite in middleware mode. The Vite dev server is integrated, not standalone.

## Project Structure

```
platemate/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (routes)
│   │   ├── lib/           # Utilities and helpers
│   │   └── hooks/         # Custom React hooks
│   └── index.html
├── server/                # Backend Express application
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Data persistence layer
│   ├── db.ts              # Database connection
│   ├── ai-providers/      # AI service integrations
│   └── services/          # Business logic services
├── shared/                # Shared types and schemas
│   └── schema.ts          # Drizzle database schema
├── android/               # Native Android app (Capacitor)
└── attached_assets/       # Static assets (images, etc.)
```

## Scripts

- `npm run dev` - Start development server (Express + Vite)
- `npm run build` - Build for production (frontend + backend)
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes
- `npm run server` - Run backend only (for debugging)

## Building for Production

### Web Deployment

```bash
npm run build
npm run start
```

The build outputs:
- Frontend: `dist/public/` (static HTML/JS/CSS)
- Backend: `dist/index.js` (bundled Express server)

Deploy `dist/` to any Node.js hosting platform (Vercel, Railway, Fly.io, etc.)

### Mobile App (Android/iOS)

#### Prerequisites
- Android Studio (for Android builds)
- Xcode + CocoaPods (for iOS builds - macOS only)
- Capacitor CLI: `npm install -g @capacitor/cli`

#### Build Steps

1. **Configure Backend URL**

   Edit `.env` and set your live backend URL:
   ```bash
   VITE_API_BASE_URL=https://your-deployed-backend.com
   ```

   **Critical**: The mobile app needs this to connect to your API when running as native APK/IPA.

2. **Build Web Assets**

   ```bash
   npm run build
   ```

3. **Sync to Native Platforms**

   ```bash
   npx cap sync android   # For Android
   npx cap sync ios       # For iOS
   ```

4. **Open in IDE**

   ```bash
   npx cap open android   # Opens Android Studio
   npx cap open ios       # Opens Xcode
   ```

5. **Build APK/IPA**

   - **Android**: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - **iOS**: Product → Archive (requires Apple Developer account)

#### Mobile Development Notes

- **Live Reload**: Clicking "Run" in Android Studio enables live reload (connects to dev server)
  - Package: `com.replit.app`
  - Logs show `[vite] connecting`
  - Good for UI development, but native plugins won't work

- **Production Mode**: Build APK to test native features (billing, camera, etc.)
  - Package: `com.georgebrennan.platemate3`
  - Loads from `capacitor://localhost` (bundled files)
  - Logs show `BillingPlugin loaded`

- **Google Play Billing**: Only works when installed from Google Play (Internal Testing track or Production)
  - Product ID: `platemate_pro_monthly`
  - Free trial: 7 days (configured in Play Console)

## Environment Variables Reference

### Required for Local Development
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` or `GEMINI_API_KEY` - AI provider key

### Required for Mobile Builds
- `VITE_API_BASE_URL` - Full URL to backend server
- `APP_ACCESS_TOKEN` - Mobile app security token

### Optional
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development | production)
- `SESSION_SECRET` - Session encryption key
- `USDA_API_KEY` - Enhanced nutrition data
- `HUGGINGFACE_API_KEY` - Alternative AI provider
- `VITE_REVENUECAT_ANDROID_API_KEY` - Subscription management

See `.env.example` for complete documentation.

## Database Migrations

This project uses Drizzle ORM with schema push (no manual SQL migrations):

```bash
# After changing shared/schema.ts
npm run db:push

# If you get data-loss warnings
npm run db:push --force
```

**Important**: Never manually write SQL migrations. Always modify `shared/schema.ts` and use `db:push`.

## Path Aliases

The project uses TypeScript path aliases for cleaner imports:

- `@/...` → `client/src/...`
- `@shared/...` → `shared/...`
- `@assets/...` → `attached_assets/...`

Example:
```typescript
import { Button } from '@/components/ui/button';
import { users } from '@shared/schema';
```

## API Architecture

**Mobile App Routing**: The app automatically detects the environment:
- **Web (browser)**: Uses relative URLs (`/api/...`)
- **Mobile (Capacitor)**: Uses full backend URL from `VITE_API_BASE_URL`

This is handled in `client/src/lib/api-config.ts` via the `buildApiUrl()` function.

## Troubleshooting

### "Database connection failed"
- Verify `DATABASE_URL` is correct in `.env`
- Check database is accessible (not behind firewall)
- For Neon: Ensure `?sslmode=require` is in connection string

### "AI features not working"
- Verify `OPENAI_API_KEY` or `GEMINI_API_KEY` is set
- Check API key is valid and has credits
- View server logs for specific error messages

### Mobile app shows "high demand" error
- Ensure `VITE_API_BASE_URL` is set in `.env`
- Rebuild: `npm run build && npx cap sync android`
- Verify backend is publicly accessible

### Native plugins return `UNIMPLEMENTED`
- You're in development live-reload mode
- Build production APK to test native features
- See "Mobile Development Notes" above

## IDE Setup

### VS Code (Recommended)
Install extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript

### Android Studio
1. Open `android/` folder as project
2. Let Gradle sync complete
3. Connect device or start emulator
4. Click Run (green play button)

## Contributing

This is a personal project, but feedback and suggestions are welcome!

## License

MIT

## Support

For issues or questions:
1. Check existing documentation in `replit.md`
2. Review environment variables in `.env.example`
3. Check mobile build notes in "Building for Production" section

---

**Built with ❤️ using React, Express, and Capacitor**
