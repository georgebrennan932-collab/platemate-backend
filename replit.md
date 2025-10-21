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

## AI Services
- **Multi-Provider System**: Supports OpenAI (GPT-4o-mini, GPT-5) and Google Gemini (Flash/Pro) with automatic failover, health monitoring, and load balancing.
- **Core Functionality**: Food recognition, nutritional analysis, quantity detection, UK-to-US food term mapping.
- **User Interaction**: Comprehensive food analysis editing with real-time nutrition recalculation.
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