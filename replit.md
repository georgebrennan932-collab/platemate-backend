# Overview

NutriScan is a full-stack web application that allows users to analyze food images using AI to automatically identify food items and calculate their nutritional information. Users can upload or capture photos of their meals, and the app provides detailed breakdowns of calories, macronutrients (protein, carbs, fat), and identified food items with portion estimates.

The application features a mobile-first design with a clean, intuitive interface for food scanning and nutrition tracking. It's built as a Progressive Web App (PWA) suitable for both mobile and desktop use.

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
- **Session Management**: Connect-pg-simple for PostgreSQL session storage (configured but not implemented)
- **Architecture**: Cookie-based sessions with secure defaults prepared for implementation

## External Dependencies
- **Image Processing**: Sharp for server-side image optimization and resizing
- **Database**: Neon Database (serverless PostgreSQL) with connection pooling
- **UI Icons**: Lucide React for consistent iconography
- **Development**: Replit-specific tooling for development environment integration
- **Font Loading**: Google Fonts (Roboto family) and Font Awesome for icons

## Key Design Decisions
- **Mobile-First**: Responsive design optimized for mobile food scanning use cases
- **Type Safety**: Full TypeScript implementation from database schema to UI components
- **Component Architecture**: Atomic design with reusable UI components and clear separation of concerns
- **Image Handling**: Client-side preview with server-side optimization for performance
- **Mock AI Integration**: Prepared architecture for external food recognition APIs (Clarifai, Google Vision, etc.)
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Development Experience**: Hot reloading, TypeScript checking, and integrated error overlays