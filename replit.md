# Overview

PlateMate is a full-stack web and native mobile application that allows users to analyze food images using AI to automatically identify food items and calculate their nutritional information. Users can upload or capture photos of their meals, and the app provides detailed breakdowns of calories, macronutrients (protein, carbs, fat), and identified food items with portion estimates.

The application features a mobile-first design with a clean, intuitive interface for food scanning and nutrition tracking. It's built as both a Progressive Web App (PWA) and native iOS/Android apps using Capacitor for the best mobile experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development builds and hot module replacement
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible design
- **Styling**: Tailwind CSS with CSS custom properties for theming support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API with JSON responses
- **File Processing**: Multer for multipart file uploads and Sharp for image optimization
- **Data Storage**: In-memory storage with interface-based design for easy database integration
- **Error Handling**: Centralized error middleware with structured error responses

## Data Storage Solutions
- **Current**: In-memory storage using Map data structures for development
- **Database Ready**: Drizzle ORM configured for PostgreSQL with schema definitions
- **Migrations**: Drizzle Kit for database schema management
- **Connection**: Neon Database serverless PostgreSQL integration ready

## Authentication and Authorization
- **Replit OIDC Integration**: Full OpenID Connect authentication using Replit accounts for persistent user identity
- **Session Management**: Connect-pg-simple for PostgreSQL session storage with secure cookie-based sessions (SameSite=None for mobile WebView compatibility)
- **User Isolation**: Each authenticated user has isolated data (diary entries, analyses, weights) with proper ownership checks
- **Authentication Middleware**: Express middleware protecting API endpoints with automatic session validation
- **Frontend Integration**: useAuth React hook with automatic authentication state management and conditional UI rendering
- **Mobile OAuth Flow**: Complete Capacitor-compatible authentication with Browser plugin, deep-link handling, and secure session bridging
- **Bridge Token System**: One-time use cryptographic tokens (5-minute TTL) for secure mobile session establishment with automatic cleanup

## AI Services Architecture
- **Multi-Provider System**: Intelligent AI provider management with automatic failover
- **Primary Provider**: OpenAI GPT-4o-mini for food analysis, GPT-5 for diet advice
- **Secondary Provider**: Google Gemini 2.5 Flash/Pro for backup and load distribution
- **Failover Logic**: Automatic switching on rate limits or provider failures
- **Health Monitoring**: Real-time provider status tracking and system health endpoints
- **Load Balancing**: Priority-based routing with exponential backoff retry logic

## External Dependencies
- **AI Services**: OpenAI and Google Gemini APIs for food recognition and nutrition analysis
- **Image Processing**: Sharp for server-side image optimization and resizing
- **Database**: Neon Database (serverless PostgreSQL) with connection pooling
- **UI Icons**: Lucide React for consistent iconography
- **Development**: Replit-specific tooling for development environment integration
- **Font Loading**: Google Fonts (Roboto family) and Font Awesome for icons
- **Mobile Platform**: Capacitor for native iOS and Android app deployment

## Key Design Decisions
- **Mobile-First**: Responsive design optimized for mobile food scanning use cases
- **Type Safety**: Full TypeScript implementation from database schema to UI components
- **Component Architecture**: Atomic design with reusable UI components and clear separation of concerns
- **Image Handling**: Client-side preview with server-side optimization for performance
- **Mock AI Integration**: Prepared architecture for external food recognition APIs (Clarifai, Google Vision, etc.)
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Development Experience**: Hot reloading, TypeScript checking, and integrated error overlays
- **Native Mobile Features**: Enhanced camera integration, native file access, and platform-specific optimizations

## Mobile App Architecture (Capacitor)
- **Platform Support**: Native iOS and Android apps with web fallback
- **Camera Integration**: Native camera API with web camera fallback for better food photography
- **App Configuration**: Custom app icons, splash screens, and native app settings
- **Build Process**: Unified build system that generates web and native mobile apps
- **Plugins**: Camera, Filesystem, Status Bar, Splash Screen, App, and Browser plugins integrated
- **Deep-Link Handling**: Custom URL scheme (platemate://) configured in iOS (Info.plist) and Android (AndroidManifest.xml) for OAuth return flow
- **OAuth Integration**: System browser authentication with deep-link callback and secure session transfer to app WebView

# Recent Changes

- **Comprehensive Food Editing System**: Implemented complete food analysis editing functionality allowing users to edit food names, adjust portions, remove incorrect items, and add missing foods with real-time nutrition recalculation
- **Secure Food Analysis API**: Added authenticated PATCH /api/analyses/:id endpoint with Zod validation, ownership checks, and server-side nutrition calculation to prevent data tampering
- **Database Persistence for Edits**: Food analysis modifications are now saved to the database with proper cache invalidation and error handling for reliable data persistence
- **Enhanced UX with Loading States**: Food editing interface includes loading spinners, success/error toast notifications, and proper form validation for seamless user experience
- **Homepage Weight Integration**: Moved weekly weigh-in functionality directly to main homepage with clearly labeled "Weekly Weigh-In" section featuring orange gradient design and Scale icon
- **Complete CRUD Weight System**: Full weight tracking with WeightForm on homepage, WeightList in diary, WeightEditDialog for editing, and WeightChart with 12-week trend visualization using Recharts
- **Unit Conversion System**: Proper kg/lb conversion with validation ranges (kg: 20-300, lb: 44-660) and precise storage in grams for accuracy
- **Mobile-First Weight Tracking**: Responsive weight interface optimized for mobile health tracking use cases with easy homepage access
- **End-to-End Testing Verified**: Homepage weigh-in form successfully tested with POST /api/weights integration and diary synchronization confirmed
- **Camera Barcode Scanner Implementation**: Replaced manual barcode entry with full-screen camera scanning using multi-strategy approach (BarcodeDetector API + ZXing fallback) for real-time product barcode detection
- **Mobile-First Scanner UX**: Full-screen camera modal with scan guides, torch toggle, error handling for camera permissions, and graceful fallback to manual entry when camera access is denied
- **Cross-Browser Compatibility**: Barcode detection works in modern browsers (Chrome, Edge, Android) with BarcodeDetector API and falls back to ZXing library for wider browser support
- **Enhanced Barcode Integration**: Camera scanner connects directly to existing OpenFoodFacts API (/api/barcode) for seamless product nutrition lookup after successful scan detection
- **Full Replit Authentication System**: Implemented complete Replit OIDC authentication with login/logout UI, persistent user accounts, and proper data isolation replacing session-based anonymous users
- **Secure User Data Isolation**: Each authenticated user now has isolated diary entries, analyses, and weight tracking with proper ownership validation on all endpoints
- **Conditional Navigation UI**: Navigation dynamically shows login button for unauthenticated users and user profile with real name/email for authenticated users
- **Mobile OAuth Solution**: Complete Capacitor-compatible authentication flow using Browser plugin for system browser OAuth, deep-link return (platemate://auth-complete), and secure one-time bridge tokens for session establishment
- **Security-Hardened OAuth**: Strict returnUrl validation (allowlist-based), 256-bit cryptographic bridge tokens, 5-minute TTL with automatic cleanup, and SameSite=None cookies for cross-origin WebView compatibility
- **Platform-Aware Auth**: Auth launcher utility with automatic platform detection, absolute HTTPS URLs for mobile, and graceful fallback for web authentication
- **Deep-Link Configuration**: iOS CFBundleURLTypes and Android intent-filter setup for platemate:// scheme with host-based routing (auth-complete)
- **Aggressive Client-Side Caching**: Implemented 1-hour staleTime and 24-hour garbage collection time (gcTime) for TanStack Query to dramatically reduce API calls and improve app responsiveness
- **IndexedDB Persistent Storage**: Created IndexedDB wrapper (indexeddb-storage.ts) for persistent client-side caching of images, analyses, and diary entries with automatic cleanup
- **Optimistic UI Updates**: Added onMutate handlers to mutations for immediate user feedback before server confirmation, creating instant-feeling interactions
- **Performance Optimizations**: Disabled refetchOnWindowFocus to prevent unnecessary re-fetching, enabling faster app performance especially on slower connections