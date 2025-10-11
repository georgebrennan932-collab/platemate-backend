# Overview

PlateMate is a full-stack web and native mobile application designed for AI-powered food image analysis. It identifies food items from user-uploaded photos, calculates nutritional information (calories, macronutrients), and provides detailed breakdowns. The application aims to offer a mobile-first, intuitive experience for food scanning and nutrition tracking, available as both a Progressive Web App (PWA) and native iOS/Android applications.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with CSS custom properties
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **Mobile Integration**: Capacitor for native iOS/Android apps, including camera and file system access, and deep-link handling for OAuth.
- **UI/UX**: Mobile-first responsive design, atomic component architecture, engaging Framer Motion animations for page transitions and interactive elements. Modern design aesthetics with gradients and polished layouts.

## Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Design**: RESTful API with JSON responses
- **File Processing**: Multer for uploads, Sharp for image optimization (rotation, client-side compression focus).
- **Error Handling**: Centralized middleware.

## Data Storage
- **Current Development**: In-memory storage.
- **Planned/Configured**: PostgreSQL via Drizzle ORM and Drizzle Kit for schema management, integrated with Neon Database.

## Authentication and Authorization
- **Method**: Email/Password authentication using @replit/database for user storage.
- **Session Management**: In-memory session storage with bearer token authentication.
- **Password Reset**: Security question-based ("What is your favorite food?") reset with bcrypt-hashed answers and expiring tokens.
- **User Isolation**: Strict data isolation for each authenticated user across diary entries, analyses, weights, drinks, and nutrition goals.
- **Mobile OAuth**: Capacitor-compatible flow using system browser with deep-link callbacks and secure bridge tokens.

## AI Services
- **Multi-Provider System**: Supports OpenAI (GPT-4o-mini for analysis, GPT-5 for advice) and Google Gemini (Flash/Pro) with automatic failover, health monitoring, and load balancing.
- **Core Functionality**: Food recognition, nutritional analysis, quantity detection, and UK-to-US food term mapping for USDA database lookups.
- **User Interaction**: Comprehensive food analysis editing, allowing users to modify food names, portions, and add/remove items with real-time nutrition recalculation and persistence to the database.

## Key Design Decisions
- **Mobile-First**: Optimized for mobile food scanning.
- **Type Safety**: End-to-end TypeScript implementation.
- **Image Handling**: Client-side compression and server-side optimization.
- **Extensible AI**: Architecture prepared for various external food recognition APIs.
- **Development Experience**: Hot reloading, TypeScript checking, integrated error overlays.
- **Barcode Scanning**: Full-screen camera barcode scanning using BarcodeDetector API and ZXing fallback, integrated with OpenFoodFacts API.

# External Dependencies

- **AI Services**: OpenAI API, Google Gemini API
- **Database**: Neon Database (PostgreSQL)
- **Image Processing**: Sharp
- **UI Icons**: Lucide React, Font Awesome
- **Development Tools**: Replit-specific tooling
- **Fonts**: Google Fonts (Roboto)
- **Mobile Platform**: Capacitor (for iOS/Android native app deployment)
- **Barcode Data**: OpenFoodFacts API

# Recent Changes

- **Gamification: Challenges & Rewards System**: Implemented comprehensive gamification system with:
  - PostgreSQL challenges and userChallengeProgress tables for tracking achievements
  - 10 predefined challenges across 3 types: count (meal/weight logging), streak (consecutive days), and goal (meeting nutrition targets)
  - ChallengeService with automatic progress tracking when users log meals, weights, or meet daily goals
  - Automatic challenge completion detection and point rewards system
  - Challenges page with beautiful card-based UI showing active and completed challenges with progress bars
  - Trophy icon navigation tab replacing Rewards in bottom navigation
  - Challenge initialization on server startup (idempotent seeding)
  - Integration hooks in diary and weight entry creation for automatic progress updates
  - Goal-checking endpoint for water/calorie/protein target achievements
  - Points and streak tracking with visual stats cards
- **AI Daily Reflections (MVP)**: Implemented AI-powered daily nutrition reflections feature with:
  - PostgreSQL reflections table storing insights (what went well, areas to improve, action steps), sentiment scores, and sharing metadata
  - ReflectionService using existing AI providers (OpenAI/Gemini) to analyze user's daily nutrition data and generate personalized insights
  - Insights page with Lightbulb icon added to bottom navigation (between Diary and Calculator tabs)
  - Generate/refresh functionality with one-reflection-per-day limit to prevent duplicate generations
  - Sound effects integration (success on generate, error on failure)
  - Share tracking (placeholder for future social media integration)
  - Period toggle UI prepared for future weekly reflections (currently shows "coming soon" message)
- **Engaging Page Animations**: Implemented Framer Motion animations throughout app including fade-in/scale page transitions (0.6s), staggered diary meal cards with dramatic spring bounce effects (slide from -100px, scale 0.7→1, 3D rotation), progress indicator cards with scale-up animations, and hover effects (scale 1.02-1.03) on interactive cards. Auto-scroll to top when switching to diary tab ensures animations are visible
- **Sound Effects System**: Integrated soundService throughout app with success sounds for saving meals/adding foods, click sounds for deleting entries, scan sounds for analysis start, and error sounds for failures. Web Audio API generates sounds programmatically with localStorage persistence for user preferences
- **Diary Navigation**: Added back button to "Today's Meals" header for easy return to dashboard view
- **Confetti Celebrations Disabled**: Removed all confetti celebration effects per user request from home page, camera page, and progress indicators
- **Shareable Achievement Cards**: Implemented image-based social sharing for Challenges and Insights pages with:
  - dom-to-image-more library for generating beautiful achievement card images (Safari-compatible with toBlob)
  - Custom share card components (ChallengeShareCard with blue gradient, InsightShareCard with purple/metallic gradient)
  - Web Share API integration with cascading fallback chain: image share → text-only share → download
  - Text-only fallback summaries with emojis when image sharing is unsupported or fails
  - Context-aware filenames for downloads (e.g., platemate-reflection-daily-2025-10-11.png)
  - Challenge cards showing points, streak, and completed challenges with gradient backgrounds
  - Insight cards displaying reflection highlights, positivity scores, and action steps with white text on purple/metallic gradient
  - Proper share cancellation handling to avoid false success states
  - Share tracking in database only when user confirms the share
  - Fixes Facebook login issue by sharing images/text instead of session-protected URLs
- **UI Design Consistency Updates**: Updated Challenges and Insights pages for consistency with app design:
  - Added back buttons to both pages matching the pattern used in Diary and other pages (Link with ArrowLeft icon)
  - Updated Challenges page color scheme to blue/indigo gradients (from purple/pink) for better harmony
  - Updated Insights page color scheme to green/emerald gradients (from indigo/purple) for better differentiation
  - Maintained dark mode support across all color changes
  - Ensured all interactive elements have proper data-testid attributes for accessibility