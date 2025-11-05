import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
// OAUTH DISABLED: import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertFoodAnalysisSchema, insertDiaryEntrySchema, updateDiaryEntrySchema, insertWaterIntakeSchema, insertDrinkEntrySchema, insertWeightEntrySchema, updateWeightEntrySchema, insertNutritionGoalsSchema, insertUserProfileSchema, updateFoodAnalysisSchema, insertSimpleFoodEntrySchema, insertFoodConfirmationSchema, updateFoodConfirmationSchema, insertReflectionSchema, savedRecipes, insertShoppingListItemSchema, updateShoppingListItemSchema, insertShiftScheduleSchema } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { coachMemoryService } from "./coach-memory-service";
import { personalityManager } from "./personality-manager";
import { insertAiCoachMemorySchema, updateAiCoachMemorySchema, aiCoachMemory } from "@shared/schema";
import { promises as fs } from "fs";
import path from "path";
import express from "express";
import { aiManager } from "./ai-providers/ai-manager";
import { usdaService } from "./services/usda-service";
import { imageAnalysisCache } from "./services/image-analysis-cache";
import { openFoodFactsService } from "./services/openfoodfacts-service";
import { reflectionService } from "./services/reflection-service";
import { challengeService } from "./services/challenge-service";
import { consumeBridgeToken } from "./bridgeTokens";
import type { Session } from "express-session";
import { userContextService } from "./services/user-context-service";

// Configure multer for image uploads with deployment-aware storage
const isDeployment = process.env.REPLIT_DEPLOYMENT === '1' || process.env.REPLIT_DEPLOYMENT === 'true';
const uploadDir = process.env.UPLOAD_DIR ?? (isDeployment ? '/tmp/uploads' : 'uploads');

const upload = multer({ 
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Separate multer instance for menu photo scanning (uses memory storage for base64 conversion)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Request queue management for concurrent handling
class RequestQueue {
  private activeRequests = 0;
  private readonly maxConcurrent = 5; // Limit concurrent AI requests
  private waitingQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.activeRequests < this.maxConcurrent) {
        this.activeRequests++;
        resolve();
      } else {
        this.waitingQueue.push(() => {
          this.activeRequests++;
          resolve();
        });
      }
    });
  }

  release(): void {
    this.activeRequests--;
    const next = this.waitingQueue.shift();
    if (next) {
      next();
    }
  }

  getStats() {
    return {
      active: this.activeRequests,
      waiting: this.waitingQueue.length,
      maxConcurrent: this.maxConcurrent
    };
  }
}

const analysisQueue = new RequestQueue();

// Utility function to parse portion strings to grams
function parsePortionToGrams(portion: string): number {
  const portionLower = portion.toLowerCase().trim();
  
  // Extract numbers including fractions from the portion string
  const fractionMatch = portionLower.match(/(\d+)\s*\/\s*(\d+)/);
  const decimalMatch = portionLower.match(/(\d+(?:\.\d+)?)/);
  
  let amount = 100; // default
  
  if (fractionMatch) {
    // Handle fractions like "1/2 cup", "2 1/2 tbsp"
    const numerator = parseFloat(fractionMatch[1]);
    const denominator = parseFloat(fractionMatch[2]);
    const wholeNumberMatch = portionLower.match(/(\d+)\s+\d+\s*\/\s*\d+/);
    const wholeNumber = wholeNumberMatch ? parseFloat(wholeNumberMatch[1]) : 0;
    amount = wholeNumber + (numerator / denominator);
  } else if (decimalMatch) {
    amount = parseFloat(decimalMatch[1]);
  }
  
  // Handle different units using word boundaries to avoid false matches
  if (/\b(kg|kilograms?)\b/.test(portionLower)) {
    return amount * 1000;
  }
  if (/\b(g|grams?)\b/.test(portionLower)) {
    return amount;
  }
  if (/\b(oz|ounces?)\b/.test(portionLower)) {
    return amount * 28.35; // 1 oz = 28.35g
  }
  if (/\b(lb|lbs|pounds?)\b/.test(portionLower)) {
    return amount * 453.592; // 1 lb = 453.592g
  }
  if (/\b(cups?)\b/.test(portionLower)) {
    return amount * 240; // 1 cup ≈ 240g (varies by food)
  }
  if (/\b(tbsp|tablespoons?)\b/.test(portionLower)) {
    return amount * 15; // 1 tbsp ≈ 15g
  }
  if (/\b(tsp|teaspoons?)\b/.test(portionLower)) {
    return amount * 5; // 1 tsp ≈ 5g
  }
  if (/\b(ml|milliliters?)\b/.test(portionLower)) {
    return amount; // 1 ml ≈ 1g for most liquids
  }
  if (/\b(l|liters?)\b/.test(portionLower)) {
    return amount * 1000; // 1 L = 1000g for most liquids
  }
  if (/\b(slices?)\b/.test(portionLower)) {
    return amount * 30; // 1 slice ≈ 30g (bread)
  }
  if (/\b(biscuits?|cookies?)\b/.test(portionLower)) {
    return amount * 37.5; // 1 Weetabix biscuit ≈ 37.5g
  }
  if (/\b(pieces?|items?)\b/.test(portionLower)) {
    return amount * 50; // 1 piece ≈ 50g average
  }
  if (/\b(servings?)\b/.test(portionLower)) {
    return amount * 100; // 1 serving ≈ 100g
  }
  
  // Default: if amount looks reasonable as grams use it, otherwise assume servings
  if (amount >= 10) {
    return amount; // Probably already in grams
  }
  return amount * 100; // Treat as servings (e.g., "2" = 200g)
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure upload directory exists
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create upload directory ${uploadDir}:`, error);
  }

  // Serve uploaded images as static files from the correct upload directory
  app.use('/uploads', express.static(uploadDir));
  
  // Email/password authentication middleware
  const { emailAuthMiddleware } = await import('./auth-middleware');
  app.use(emailAuthMiddleware);

  // OAUTH DISABLED: User authentication endpoint
  // app.get('/api/user', async (req: any, res) => {
  //   if (req.user && req.user.claims) {
  //     // User is authenticated, return user info
  //     const user = await storage.getUser(req.user.claims.sub);
  //     if (user) {
  //       res.json(user);
  //     } else {
  //       res.status(404).json({ error: 'User not found' });
  //     }
  //   } else {
  //     // User not authenticated
  //     res.status(401).json({ error: 'Not authenticated' });
  //   }
  // });

  // Cache and monitoring endpoints (OAUTH DISABLED: removed isAuthenticated)
  app.get('/api/cache/stats', async (req, res) => {
    try {
      const cacheStats = imageAnalysisCache.getStats();
      const queueStats = analysisQueue.getStats();
      
      res.json({
        cache: cacheStats,
        queue: queueStats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Failed to get cache stats:', error);
      res.status(500).json({ error: 'Failed to get cache statistics' });
    }
  });

  app.post('/api/cache/clear', async (req, res) => {
    try {
      await imageAnalysisCache.clear();
      res.json({ message: 'Cache cleared successfully' });
    } catch (error: any) {
      console.error('Failed to clear cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });

  // App token validation mode control endpoint
  const { setTokenValidationMode, getTokenValidationMode, TokenValidationMode } = await import('./middleware/app-token-middleware');
  
  app.get('/api/token-mode', async (req, res) => {
    const currentMode = getTokenValidationMode();
    res.json({ mode: currentMode });
  });

  app.post('/api/token-mode', async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { mode } = req.body;
    
    if (!Object.values(TokenValidationMode).includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be one of: permissive, blocking, disabled' });
    }

    setTokenValidationMode(mode);
    res.json({ mode, message: `Token validation mode changed to ${mode}` });
  });

  // OAUTH DISABLED: Auth routes
  // app.get('/api/auth/user',  async (req: any, res) => {
  //   try {
  //     const userId = req.user.claims.sub;
  //     const user = await storage.getUser(userId);
  //     res.json(user);
  //   } catch (error) {
  //     console.error("Error fetching user:", error);
  //     res.status(500).json({ message: "Failed to fetch user" });
  //   }
  // });

  // OAUTH DISABLED: Mobile OAuth session bridge endpoint
  // app.post('/api/session/consume', express.json(), async (req: any, res) => {
  //   try {
  //     const { token } = req.body;
  //     
  //     if (!token || typeof token !== 'string') {
  //       console.log('❌ Invalid bridge token request');
  //       return res.status(400).json({ error: 'Invalid token' });
  //     }
  //     
  //     console.log('🔑 Attempting to consume bridge token...');
  //     
  //     // Exchange the bridge token for a session ID
  //     const sessionId = consumeBridgeToken(token);
  //     
  //     if (!sessionId) {
  //       console.log('❌ Bridge token not found or expired');
  //       return res.status(401).json({ error: 'Invalid or expired token' });
  //     }
  //     
  //     console.log('✅ Bridge token valid for session:', sessionId);
  //     
  //     // Load the session data from the session store
  //     const sessionStore = req.sessionStore;
  //     
  //     sessionStore.get(sessionId, (err: any, sessionData: any) => {
  //       if (err) {
  //         console.error('❌ Error loading session:', err);
  //         return res.status(500).json({ error: 'Failed to load session' });
  //       }
  //       
  //       if (!sessionData) {
  //         console.log('❌ Session not found:', sessionId);
  //         return res.status(401).json({ error: 'Session not found' });
  //       }
  //       
  //       console.log('✅ Session data loaded, setting up new session...');
  //       
  //       // Copy only the authenticated passport data to the current request
  //       req.session.passport = sessionData.passport;
  //       
  //       // Save the new session (don't copy cookie data, let it be generated fresh)
  //       req.session.save((saveErr: any) => {
  //         if (saveErr) {
  //           console.error('❌ Error saving session:', saveErr);
  //           return res.status(500).json({ error: 'Failed to save session' });
  //         }
  //         
  //         console.log('🎉 Session successfully bridged to mobile app');
  //         res.json({ ok: true });
  //       });
  //     });
  //     
  //   } catch (error: any) {
  //     console.error('❌ Session consume error:', error);
  //     res.status(500).json({ error: 'Internal server error' });
  //   }
  // });

  // saveFood endpoint for mobile app compatibility - accepts simple food entries
  app.post("/saveFood", async (req, res) => {
    try {
      const { food, amount, userId } = req.body;
      
      // Validate required fields
      if (!food || !amount || !userId) {
        return res.status(400).json({
          status: "error",
          message: "Missing required fields: food, amount, and userId are all required"
        });
      }
      
      // Validate data types
      if (typeof food !== 'string' || typeof amount !== 'string' || typeof userId !== 'string') {
        return res.status(400).json({
          status: "error",
          message: "Invalid data types: food, amount, and userId must be strings"
        });
      }
      
      // Create the entry using validated schema
      const validatedEntry = insertSimpleFoodEntrySchema.parse({
        food: food.trim(),
        amount: amount.trim(),
        userId: userId.trim()
      });
      
      // Save to database
      const savedEntry = await storage.createSimpleFoodEntry(validatedEntry);
      
      // Return success response in the exact format requested
      res.json({ status: "ok" });
      
    } catch (error: any) {
      console.error("/saveFood error:", error);
      
      // Handle validation errors specifically
      if (error.name === 'ZodError') {
        return res.status(400).json({
          status: "error",
          message: `Validation failed: ${error.errors.map((e: any) => e.message).join(', ')}`
        });
      }
      
      // Handle database errors
      if (error.code === '23503') { // Foreign key constraint
        return res.status(400).json({
          status: "error",
          message: "Invalid userId: user not found in database"
        });
      }
      
      // Generic error response
      res.status(500).json({
        status: "error",
        message: "Failed to save food entry to database"
      });
    }
  });

  // OAUTH DISABLED: Enable Replit authentication for all routes
  // const authMiddleware = isAuthenticated;
  
  // Allow analyze endpoint without auth for guest mode (results not saved to DB)
  app.post("/api/analyze", upload.single('image'), async (req: any, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestStartTime = Date.now();
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      
      // Add cache and queue statistics to response headers for monitoring
      const cacheStats = imageAnalysisCache.getStats();
      const queueStats = analysisQueue.getStats();
      
      res.setHeader('X-Cache-Stats', JSON.stringify({
        hitRate: cacheStats.hitRate,
        size: cacheStats.currentSize,
        maxSize: cacheStats.maxSize
      }));
      
      res.setHeader('X-Queue-Stats', JSON.stringify(queueStats));
      res.setHeader('X-Request-ID', requestId);

      // Process image with Sharp for optimization (resilient processing)
      const processedImagePath = path.join(uploadDir, `processed_${req.file.filename}.jpg`);
      
      try {
        // Light processing since client already compressed
        // Only auto-rotate and ensure JPEG format
        await sharp(req.file.path)
          .rotate() // Auto-rotate based on EXIF data (important for mobile)
          .jpeg({ quality: 85, mozjpeg: true }) // Higher quality since already compressed
          .toFile(processedImagePath);
      } catch (sharpError: any) {
        // Fallback: copy original file as processed image
        try {
          await fs.copyFile(req.file.path, processedImagePath);
        } catch (copyError) {
          console.error("Image processing failed:", copyError);
          
          // Clean up the original file before returning error
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.error("Error cleaning up original file:", unlinkError);
          }
          
          return res.status(415).json({ 
            error: "Unsupported image format. Please upload a valid JPEG or PNG image." 
          });
        }
      }

      // Clean up original file after successful processing
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up original file:", unlinkError);
        // Don't fail the request if cleanup fails
      }

      // Acquire queue slot for concurrent request management
      await analysisQueue.acquire();
      
      // Variables to store response data and status - prevents early returns from bypassing finally
      let responseData: any = null;
      let responseStatus = 200;
      let analysisError: any = null;
      
      try {
        // Real food recognition and nutrition analysis using multi-AI provider system with timeout
        const analysisStartTime = Date.now();
        
        const foodAnalysisData = await Promise.race([
          aiManager.analyzeFoodImage(processedImagePath),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Analysis timeout after 60 seconds')), 60000)
          )
        ]);
        
        const analysisTime = Date.now() - analysisStartTime;
        
        // Add analysis timing to response headers
        res.setHeader('X-Analysis-Time', analysisTime.toString());

        // CONFIDENCE THRESHOLD CHECK: Apply to ALL analysis results (cached and fresh)
        if (foodAnalysisData.confidence < 90) {
          // In deployment without auth, skip confirmation and proceed with analysis
          if (!req.user) {
            const analysis = await storage.createFoodAnalysis(foodAnalysisData);
            responseData = analysis;
          } else {
            // Create food confirmation for authenticated user review
            const userId = req.user.claims.sub;
          const confirmationData = {
            userId,
            imageUrl: `/uploads/processed_${req.file.filename}.jpg`, // Use processed image path
            originalConfidence: foodAnalysisData.confidence,
            suggestedFoods: foodAnalysisData.detectedFoods,
            alternativeOptions: [], // Could be populated with USDA alternatives
            status: 'pending' as const
          };
          
          // Validate confirmation data with schema
          try {
            const validatedConfirmation = insertFoodConfirmationSchema.parse(confirmationData);
            const confirmation = await storage.createFoodConfirmation(validatedConfirmation);
            
            responseStatus = 200;
            responseData = {
              type: 'confirmation_required',
              confirmationId: confirmation.id,
              confidence: foodAnalysisData.confidence,
              message: 'Analysis requires confirmation due to low confidence',
              suggestedFoods: foodAnalysisData.detectedFoods,
              imageUrl: confirmationData.imageUrl
            };
          } catch (validationError: any) {
            if (validationError.name === 'ZodError') {
              console.error('Image analysis confirmation validation error:', validationError.errors);
              responseStatus = 400;
              responseData = {
                error: 'Invalid confirmation data for image analysis',
                details: validationError.errors
              };
            } else {
              throw validationError; // Re-throw non-validation errors
            }
          }
          }
        } else {
          // High confidence (≥90%) - proceed with immediate analysis
          // For authenticated users, save to database; for guests, return without saving
          let analysis;
          if (req.user) {
            analysis = await storage.createFoodAnalysis(foodAnalysisData);
          } else {
            // Guest mode: return analysis without saving to database
            analysis = { id: `guest_${Date.now()}`, ...foodAnalysisData };
          }

          // Optional: Auto-add to diary if user is authenticated and requests it
          if (req.user && req.body.autoAddToDiary === 'true') {
            try {
              const userId = req.user.claims.sub;
              const diaryData = {
                userId,
                analysisId: analysis.id,
                mealType: req.body.mealType || 'snack',
                mealDate: req.body.mealDate || new Date().toISOString().split('T')[0],
                notes: req.body.notes || '',
                customMealName: req.body.customMealName || null
              };
              
              const validatedDiaryEntry = insertDiaryEntrySchema.parse(diaryData);
              const diaryEntry = await storage.createDiaryEntry(validatedDiaryEntry);
              
              // Return both analysis and diary entry info
              responseData = {
                ...analysis,
                diaryEntry: {
                  id: diaryEntry.id,
                  mealType: diaryEntry.mealType,
                  mealDate: diaryEntry.mealDate
                }
              };
            } catch (diaryError) {
              console.error("Failed to auto-add to diary:", diaryError);
              // Still return the analysis even if diary add fails
              responseData = analysis;
            }
          } else {
            responseData = analysis;
          }
        }
      } catch (error) {
        analysisError = error;
      } finally {
        // Always release queue slot regardless of success or failure
        analysisQueue.release();
      }
      
      // Handle response after queue is properly released
      if (analysisError) {
        throw analysisError;
      }
      
      if (responseData) {
        return res.status(responseStatus).json(responseData);
      }
      
    } catch (error) {
      console.error("Image analysis error:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // Test barcode lookup endpoint (for debugging)
  app.get("/api/test-barcode/:barcode", async (req, res) => {
    try {
      const barcode = req.params.barcode;
      const productData = await openFoodFactsService.lookupByBarcode(barcode);
      res.json({
        barcode,
        success: true,
        data: productData
      });
    } catch (error) {
      console.error("Test barcode error:", error);
      res.status(500).json({ 
        barcode: req.params.barcode,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Barcode lookup endpoint - bypass auth in deployment like other food endpoints
  app.post("/api/barcode", async (req: any, res) => {
    try {
      const { barcode } = req.body;
      
      if (!barcode || typeof barcode !== 'string') {
        return res.status(400).json({ error: "Barcode is required" });
      }

      // Look up product using OpenFoodFacts
      const productData = await openFoodFactsService.lookupByBarcode(barcode);
      
      if (productData.nutrition_per_100g === "not found") {
        return res.status(404).json({ 
          error: "Product not found",
          barcode,
          message: "This barcode was not found in our food database"
        });
      }

      // Convert to standard food analysis format
      const nutrition = productData.nutrition_per_100g as any;
      const analysisData = {
        imageUrl: productData.imageUrl || '/uploads/barcode-placeholder.jpg',
        confidence: 95, // High confidence for barcode scans
        totalCalories: Math.round(nutrition.calories),
        totalProtein: Math.round(nutrition.protein),
        totalCarbs: Math.round(nutrition.carbs),
        totalFat: Math.round(nutrition.fat),
        detectedFoods: [{
          name: productData.food,
          portion: "100g",
          calories: Math.round(nutrition.calories),
          protein: Math.round(nutrition.protein),
          carbs: Math.round(nutrition.carbs),
          fat: Math.round(nutrition.fat),
          icon: "package"
        }]
      };

      // Create food analysis entry
      const analysis = await storage.createFoodAnalysis(analysisData);
      
      res.json(analysis);
      
    } catch (error) {
      console.error("Barcode lookup error:", error);
      res.status(500).json({ error: "Failed to lookup barcode" });
    }
  });

  // Text-based food analysis for voice input - bypass auth in deployment like image analysis
  app.post("/api/analyze-text", async (req: any, res) => {
    try {
      const { foodDescription, clientTimeInfo } = req.body;
      
      if (!foodDescription || typeof foodDescription !== 'string') {
        return res.status(400).json({ error: "Food description is required" });
      }

      console.log('🕐 Server received clientTimeInfo:', clientTimeInfo);
      
      // Use AI manager to analyze text-based food description (with client time for timezone-aware context)
      const foodAnalysisData = await aiManager.analyzeFoodText(foodDescription.trim(), clientTimeInfo);

      // CONFIDENCE THRESHOLD CHECK: If confidence < 90%, create confirmation workflow
      if (foodAnalysisData.confidence < 90) {
        
        // In deployment without auth, skip confirmation and proceed with analysis
        if (!req.user) {
          const analysis = await storage.createFoodAnalysis(foodAnalysisData);
          return res.json(analysis);
        } else {
          // Create food confirmation for authenticated user review
          const userId = req.user.claims.sub;
        const confirmationData = {
          userId,
          imageUrl: 'text://analysis', // Placeholder for text-based analysis
          originalConfidence: foodAnalysisData.confidence,
          suggestedFoods: foodAnalysisData.detectedFoods,
          alternativeOptions: [], // Could be populated with USDA alternatives
          status: 'pending' as const
        };
        
        // Validate confirmation data with schema
        try {
          const validatedConfirmation = insertFoodConfirmationSchema.parse(confirmationData);
          const confirmation = await storage.createFoodConfirmation(validatedConfirmation);
          
          return res.status(200).json({
            type: 'confirmation_required',
            confirmationId: confirmation.id,
            confidence: foodAnalysisData.confidence,
            message: 'Analysis requires confirmation due to low confidence',
            suggestedFoods: foodAnalysisData.detectedFoods
          });
        } catch (validationError: any) {
          if (validationError.name === 'ZodError') {
            console.error('Text analysis confirmation validation error:', validationError.errors);
            return res.status(400).json({
              error: 'Invalid confirmation data for text analysis',
              details: validationError.errors
            });
          }
          throw validationError; // Re-throw non-validation errors
        }
        }
      }

      // High confidence (≥90%) - proceed with immediate analysis
      const analysis = await storage.createFoodAnalysis(foodAnalysisData);
      
      console.log(`📤 Returning analysis with ${analysis.detectedFoods.length} foods:`, 
        analysis.detectedFoods.map((f: any) => `${f.name} (${f.calories} cal)`));

      res.json(analysis);
    } catch (error) {
      console.error("Text analysis error:", error);
      res.status(500).json({ error: "Failed to analyze food description" });
    }
  });

  // Fetch webpage content from URL (for menu QR codes) - with comprehensive SSRF protection
  app.post("/api/fetch-webpage", async (req: any, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL format
      let urlObj: URL;
      try {
        urlObj = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // SSRF Protection: Only allow HTTP/HTTPS
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return res.status(400).json({ error: "Only HTTP and HTTPS URLs are allowed" });
      }

      // Helper function to check if an IP is private/internal
      const isPrivateIP = (ip: string): boolean => {
        // IPv4 private/internal ranges
        const ipv4Patterns = [
          /^127\./,                    // Loopback
          /^0\./,                      // Current network
          /^10\./,                     // Private class A
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Private class B
          /^192\.168\./,               // Private class C
          /^169\.254\./,               // Link-local
          /^224\./,                    // Multicast
          /^255\.255\.255\.255$/,      // Broadcast
        ];
        
        // IPv6 private/internal patterns
        const ipv6Patterns = [
          /^::1$/,                     // Loopback
          /^fe80:/i,                   // Link-local
          /^fc00:/i,                   // Unique local
          /^fd00:/i,                   // Unique local
        ];
        
        if (ipv4Patterns.some(pattern => pattern.test(ip))) return true;
        if (ipv6Patterns.some(pattern => pattern.test(ip.toLowerCase()))) return true;
        
        return false;
      };

      // SSRF Protection: Block hostname-based checks
      const hostname = urlObj.hostname.toLowerCase();
      
      // Block obvious local hostnames
      if (hostname === 'localhost' || hostname.includes('metadata')) {
        return res.status(400).json({ error: "Access to internal/private networks is not allowed" });
      }
      
      // Block if hostname is an IP and it's private
      if (isPrivateIP(hostname)) {
        return res.status(400).json({ error: "Access to internal/private networks is not allowed" });
      }

      // SECURITY: Only fetch from allowlisted domains (common menu hosting platforms)
      // This provides automatic value while limiting SSRF attack surface
      const allowedDomains = [
        'squarespace.com',
        'wix.com',
        'weebly.com',
        'wordpress.com',
        'shopify.com',
        'godaddy.com',
        'webflow.io',
        'site123.com',
        'jimdo.com',
        'yola.com',
        'menupages.com',
        'allmenus.com',
        'opentable.com',
        'yelp.com',
        'business.google.com' // Google My Business menus only
      ];

      // SECURITY: Proper domain matching to prevent bypass via lookalike domains
      // Allow exact match OR subdomain (with preceding dot)
      // This prevents "evilsquarespace.com" from passing the check
      const isAllowedDomain = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );

      if (!isAllowedDomain) {
        console.log(`🔒 Domain not in allowlist: ${hostname}`);
        return res.status(403).json({ 
          error: "For security, we can only automatically fetch menus from known restaurant website providers",
          suggestion: "Please visit the URL, copy the menu text, and paste it manually into the app",
          detectedUrl: url
        });
      }

      console.log(`📄 Fetching menu from allowed domain: ${hostname}`);

      try {
        // Disable redirects to prevent SSRF bypass
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'PlateMate/1.0 (Menu Scanner Bot)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          redirect: 'manual', // SECURITY: Don't follow redirects
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // Reject redirects
        if (response.status >= 300 && response.status < 400) {
          throw new Error('Redirects are not supported for security reasons');
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
          throw new Error('URL does not contain readable menu text');
        }

        const html = await response.text();
        
        // Extract text content from HTML (simple extraction)
        let textContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        console.log(`✅ Fetched menu content from ${hostname} (${textContent.length} chars)`);

        return res.json({
          success: true,
          content: textContent,
          url
        });
      } catch (fetchError: any) {
        console.error(`❌ Failed to fetch URL: ${fetchError.message}`);
        return res.status(400).json({ 
          error: `Failed to fetch menu: ${fetchError.message}`,
          suggestion: "Try copying and pasting the menu text manually instead"
        });
      }

    } catch (error) {
      console.error("Webpage fetch error:", error);
      res.status(500).json({ error: "Failed to fetch webpage content" });
    }
  });

  // Extract text from menu photos using AI vision
  app.post("/api/extract-menu-text", uploadMemory.array('images', 10), async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }

      console.log(`📸 Extracting text from ${files.length} menu photo(s)`);

      // Process each image and extract text using AI vision
      const extractedTexts: string[] = [];
      
      for (const file of files) {
        try {
          // Convert image to base64
          const base64Image = file.buffer.toString('base64');
          const dataUri = `data:${file.mimetype};base64,${base64Image}`;

          // Use AI vision to extract text from the image
          const prompt = `Extract all visible text from this restaurant menu image. Include:
- All dish names
- All descriptions
- All prices
- All section headers (appetizers, mains, desserts, etc.)

Format the output as clean, readable text that preserves the menu structure.`;

          const extractedText = await aiManager.extractTextFromImage(dataUri, prompt);
          extractedTexts.push(extractedText);
          
          console.log(`✅ Extracted ${extractedText.length} chars from image ${extractedTexts.length}`);
        } catch (error: any) {
          console.error(`❌ Failed to extract text from image:`, error);
          // Continue with other images even if one fails
        }
      }

      if (extractedTexts.length === 0) {
        return res.status(500).json({ error: "Failed to extract text from any images" });
      }

      // Combine all extracted text
      const combinedText = extractedTexts.join('\n\n--- Next Page ---\n\n');

      res.json({
        success: true,
        combinedText,
        pagesProcessed: extractedTexts.length,
        totalCharacters: combinedText.length
      });
    } catch (error) {
      console.error("Text extraction error:", error);
      res.status(500).json({ error: "Failed to extract text from menu photos" });
    }
  });

  // Analyze menu text and recommend meals based on user goals
  app.post("/api/analyze-menu", async (req: any, res) => {
    try {
      const { menuText, url } = req.body;
      const userId = req.user?.claims?.sub;
      
      if (!menuText || typeof menuText !== 'string') {
        return res.status(400).json({ error: "Menu text is required" });
      }

      // Get user's nutrition goals if authenticated
      let nutritionGoals = null;
      if (userId) {
        nutritionGoals = await storage.getNutritionGoals(userId);
      }

      // Use AI to analyze menu and recommend meals
      const goals = nutritionGoals ? {
        dailyCalories: nutritionGoals.dailyCalories || 2000,
        proteinGrams: nutritionGoals.dailyProtein || 150,
        carbsGrams: nutritionGoals.dailyCarbs || 200,
        fatGrams: nutritionGoals.dailyFat || 65
      } : {
        dailyCalories: 2000,
        proteinGrams: 150,
        carbsGrams: 200,
        fatGrams: 65
      };
      
      const menuAnalysis = await aiManager.analyzeMenu(menuText, goals);

      res.json({
        url,
        recommendations: menuAnalysis.recommendations,
        userGoals: nutritionGoals,
        success: true
      });
    } catch (error) {
      console.error("Menu analysis error:", error);
      res.status(500).json({ error: "Failed to analyze menu" });
    }
  });

  // Update food analysis (for editing detected foods) - PROTECTED
  app.patch("/api/analyses/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Validate request body using zod schema (excludes client-side totals)
      const validatedData = updateFoodAnalysisSchema.parse(req.body);

      // Check if analysis exists
      const existingAnalysis = await storage.getFoodAnalysis(id);
      if (!existingAnalysis) {
        return res.status(404).json({ error: "Food analysis not found" });
      }

      // Auto-repair legacy entries only if they have legacy placeholder characteristics
      const isLegacyEntry = existingAnalysis.totalCalories === 0 && 
                           existingAnalysis.totalProtein === 0 && 
                           existingAnalysis.totalCarbs === 0 && 
                           existingAnalysis.totalFat === 0 &&
                           existingAnalysis.detectedFoods.some((food: any) => 
                             food.name === "Rate Limit Reached" || 
                             food.portion === "OpenAI API limit exceeded"
                           );

      let processedFoods = validatedData.detectedFoods;
      
      if (isLegacyEntry) {
        // Only repair foods from legacy entries that still have placeholder data
        processedFoods = validatedData.detectedFoods.map((food) => {
          if (food.name === "Rate Limit Reached" || food.portion === "OpenAI API limit exceeded") {
            return {
              name: "Mixed Food",
              portion: "1 serving",
              calories: 250,
              protein: 12,
              carbs: 25,
              fat: 10,
              icon: "apple-alt"
            };
          }
          return food;
        });
      }

      // Check ownership: user must have diary entries referencing this analysis OR be the creator
      const userDiaryEntries = await storage.getDiaryEntries(userId);
      const hasOwnership = userDiaryEntries.some(entry => entry.analysisId === id);
      
      // For deployment mode, allow editing of recent analyses even if not in diary yet
      const isDeployment = process.env.REPLIT_DEPLOYMENT === '1' || process.env.REPLIT_DEPLOYMENT === 'true';
      const isRecentAnalysis = Date.now() - new Date(existingAnalysis.createdAt).getTime() < 24 * 60 * 60 * 1000; // 24 hours
      
      if (!hasOwnership && !(isDeployment && isRecentAnalysis)) {
        return res.status(403).json({ 
          error: "Access denied. You can only edit food analyses from your own diary entries." 
        });
      }

      // Calculate nutrition totals server-side from processed foods (never trust client)
      const serverTotals = processedFoods.reduce(
        (totals, food) => ({
          calories: totals.calories + food.calories,
          protein: totals.protein + food.protein,
          carbs: totals.carbs + food.carbs,
          fat: totals.fat + food.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      // Update with server-calculated totals
      const updates = {
        detectedFoods: processedFoods,
        totalCalories: serverTotals.calories,
        totalProtein: serverTotals.protein,
        totalCarbs: serverTotals.carbs,
        totalFat: serverTotals.fat
      };

      const updatedAnalysis = await storage.updateFoodAnalysis(id, updates);
      
      if (!updatedAnalysis) {
        return res.status(500).json({ error: "Failed to update food analysis" });
      }

      res.json(updatedAnalysis);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      console.error("Update analysis error:", error);
      res.status(500).json({ error: "Failed to update food analysis" });
    }
  });

  // Get analysis history
  app.get("/api/analyses", async (req, res) => {
    try {
      const analyses = await storage.getAllFoodAnalyses();
      res.json(analyses);
    } catch (error) {
      console.error("Get analyses error:", error);
      res.status(500).json({ error: "Failed to retrieve analyses" });
    }
  });

  // Get specific analysis
  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const analysis = await storage.getFoodAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ error: "Failed to retrieve analysis" });
    }
  });

  // === FOOD CONFIRMATION API ENDPOINTS (for confidence threshold workflow) ===
  
  // Create food confirmation for low confidence analysis (<90%)
  app.post("/api/food-confirmations",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const validatedData = insertFoodConfirmationSchema.parse({
        ...req.body,
        userId
      });
      
      const confirmation = await storage.createFoodConfirmation(validatedData);
      res.json(confirmation);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid confirmation data", 
          details: error.errors 
        });
      }
      console.error("Create food confirmation error:", error);
      res.status(500).json({ error: "Failed to create food confirmation" });
    }
  });

  // Get pending food confirmations for user
  app.get("/api/food-confirmations",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const status = req.query.status as string | undefined;
      
      const confirmations = await storage.getFoodConfirmationsByUser(userId, status);
      res.json(confirmations);
    } catch (error) {
      console.error("Get food confirmations error:", error);
      res.status(500).json({ error: "Failed to retrieve food confirmations" });
    }
  });

  // Get specific food confirmation
  app.get("/api/food-confirmations/:id",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const confirmation = await storage.getFoodConfirmation(req.params.id);
      
      if (!confirmation) {
        return res.status(404).json({ error: "Food confirmation not found" });
      }
      
      // Verify ownership
      if (confirmation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(confirmation);
    } catch (error) {
      console.error("Get food confirmation error:", error);
      res.status(500).json({ error: "Failed to retrieve food confirmation" });
    }
  });

  // Confirm or reject food analysis (user decision)
  app.patch("/api/food-confirmations/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { id } = req.params;
      
      // Verify ownership first
      const existing = await storage.getFoodConfirmation(id);
      if (!existing) {
        return res.status(404).json({ error: "Food confirmation not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = updateFoodConfirmationSchema.parse(req.body);
      const confirmation = await storage.updateFoodConfirmation(id, validatedData);
      
      if (!confirmation) {
        return res.status(500).json({ error: "Failed to update food confirmation" });
      }

      // If confirmed, create a new food analysis with final foods
      if (validatedData.status === 'confirmed') {
        const finalTotals = validatedData.finalFoods.reduce(
          (totals, food) => ({
            calories: totals.calories + food.calories,
            protein: totals.protein + food.protein,
            carbs: totals.carbs + food.carbs,
            fat: totals.fat + food.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        const finalAnalysis = await storage.createFoodAnalysis({
          imageUrl: existing.imageUrl,
          confidence: 95, // Set higher confidence after user confirmation
          totalCalories: finalTotals.calories,
          totalProtein: finalTotals.protein,
          totalCarbs: finalTotals.carbs,
          totalFat: finalTotals.fat,
          detectedFoods: validatedData.finalFoods
        });

        res.json({ confirmation, finalAnalysis });
      } else {
        res.json(confirmation);
      }
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid confirmation data", 
          details: error.errors 
        });
      }
      console.error("Update food confirmation error:", error);
      res.status(500).json({ error: "Failed to update food confirmation" });
    }
  });

  // Refresh analysis - reanalyze the image with current AI providers
  app.post("/api/analyses/:id/refresh",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Check if analysis exists
      const existingAnalysis = await storage.getFoodAnalysis(id);
      if (!existingAnalysis) {
        return res.status(404).json({ error: "Food analysis not found" });
      }

      // Check ownership: user must have diary entries referencing this analysis
      const userDiaryEntries = await storage.getDiaryEntries(userId);
      const hasOwnership = userDiaryEntries.some(entry => entry.analysisId === id);
      
      if (!hasOwnership) {
        return res.status(403).json({ 
          error: "Access denied. You can only refresh food analyses from your own diary entries." 
        });
      }

      // Re-analyze the image using current AI providers
      let freshAnalysisData;
      try {
        // Normalize imageUrl to filesystem path if needed
        let imagePath = existingAnalysis.imageUrl;
        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
          imagePath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
        }
        
        freshAnalysisData = await aiManager.analyzeFoodImage(imagePath);
      } catch (error) {
        console.error("Fresh analysis failed:", error);
        // If AI fails, use improved fallback data
        freshAnalysisData = {
          imageUrl: existingAnalysis.imageUrl,
          confidence: 0,
          totalCalories: 400,
          totalProtein: 20,
          totalCarbs: 40,
          totalFat: 15,
          detectedFoods: [
            {
              name: "Mixed Food",
              portion: "1 serving",
              calories: 250,
              protein: 12,
              carbs: 25,
              fat: 10,
              icon: "apple-alt"
            },
            {
              name: "Estimated Portion",
              portion: "Medium size", 
              calories: 150,
              protein: 8,
              carbs: 15,
              fat: 5,
              icon: "apple-alt"
            }
          ],
          isAITemporarilyUnavailable: true
        };
      }

      // Update the existing analysis with fresh data
      const updates = {
        detectedFoods: freshAnalysisData.detectedFoods,
        totalCalories: freshAnalysisData.totalCalories,
        totalProtein: freshAnalysisData.totalProtein,
        totalCarbs: freshAnalysisData.totalCarbs,
        totalFat: freshAnalysisData.totalFat,
        confidence: freshAnalysisData.confidence
      };

      const updatedAnalysis = await storage.updateFoodAnalysis(id, updates);
      
      if (!updatedAnalysis) {
        return res.status(500).json({ error: "Failed to refresh food analysis" });
      }

      res.json(updatedAnalysis);
    } catch (error: any) {
      console.error("Refresh analysis error:", error);
      res.status(500).json({ error: "Failed to refresh food analysis" });
    }
  });

  // Diary routes - require authentication
  app.post("/api/diary", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      let analysisId = req.body.analysisId;
      
      // If modifiedAnalysis is provided, create a new analysis with the edited foods
      if (req.body.modifiedAnalysis) {
        const modifiedAnalysis = await storage.createFoodAnalysis({
          imageUrl: req.body.modifiedAnalysis.imageUrl,
          confidence: req.body.modifiedAnalysis.confidence,
          totalCalories: req.body.modifiedAnalysis.totalCalories,
          totalProtein: req.body.modifiedAnalysis.totalProtein,
          totalCarbs: req.body.modifiedAnalysis.totalCarbs,
          totalFat: req.body.modifiedAnalysis.totalFat,
          detectedFoods: req.body.modifiedAnalysis.detectedFoods
        });
        analysisId = modifiedAnalysis.id;
      }
      
      const validatedEntry = insertDiaryEntrySchema.parse({
        ...req.body,
        analysisId,
        userId
      });
      const diaryEntry = await storage.createDiaryEntry(validatedEntry);
      
      // Track meal logged challenges
      try {
        const completedChallenges = await challengeService.trackMealLogged(userId);
        
        // Also check streak challenges
        const currentStreak = await challengeService.calculateCurrentStreak(userId);
        const streakChallenges = await challengeService.checkStreakChallenge(userId, currentStreak);
        
        const allCompleted = [...completedChallenges, ...streakChallenges];
        
        // Return diary entry with completed challenges info
        res.json({ 
          ...diaryEntry, 
          completedChallenges: allCompleted.length > 0 ? allCompleted : undefined 
        });
      } catch (challengeError) {
        console.error("Challenge tracking error:", challengeError);
        // Don't fail the diary entry creation if challenge tracking fails
        res.json(diaryEntry);
      }
    } catch (error) {
      console.error("Create diary entry error:", error);
      res.status(400).json({ error: "Invalid diary entry data" });
    }
  });

  app.get("/api/diary", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      // Disable caching for diary entries to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      const entries = await storage.getDiaryEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("Get diary entries error:", error);
      res.status(500).json({ error: "Failed to retrieve diary entries" });
    }
  });

  app.get("/api/diary/:id", async (req: any, res) => {
    try {
      const entry = await storage.getDiaryEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Diary entry not found" });
      }
      
      // Verify the entry belongs to the authenticated user
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Get diary entry error:", error);
      res.status(500).json({ error: "Failed to retrieve diary entry" });
    }
  });

  app.patch("/api/diary/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const entry = await storage.getDiaryEntry(req.params.id);
      
      if (!entry) {
        return res.status(404).json({ error: "Diary entry not found" });
      }
      
      // Verify the entry belongs to the authenticated user
      if (entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Extract special fields for analysis swapping (not in schema)
      const { analysisId, deleteOldAnalysisId, ...updateFields } = req.body;
      
      // If new analysis provided, swap it in
      if (analysisId) {
        updateFields.analysisId = analysisId;
        // Note: Old analysis will remain in database but won't be linked to any diary entry
      }
      
      const validatedUpdate = updateDiaryEntrySchema.parse(updateFields);
      const updatedEntry = await storage.updateDiaryEntry(req.params.id, validatedUpdate);
      
      if (!updatedEntry) {
        return res.status(404).json({ error: "Diary entry not found" });
      }
      
      res.json(updatedEntry);
    } catch (error) {
      console.error("Update diary entry error:", error);
      res.status(400).json({ error: "Invalid diary entry data" });
    }
  });

  app.delete("/api/diary/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const entry = await storage.getDiaryEntry(req.params.id);
      
      if (!entry) {
        return res.status(404).json({ error: "Diary entry not found" });
      }
      
      // Verify the entry belongs to the user
      if (entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteDiaryEntry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Diary entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete diary entry error:", error);
      res.status(500).json({ error: "Failed to delete diary entry" });
    }
  });

  // === NUTRITION CALCULATION API ENDPOINTS ===
  
  app.post("/api/calculate-nutrition", async (req: any, res) => {
    try {
      const { foods } = req.body;
      
      if (!foods || !Array.isArray(foods)) {
        return res.status(400).json({ error: "Foods array is required" });
      }

      const calculatedFoods = [];

      for (const food of foods) {
        try {
          // Find best match in USDA database
          const match = await usdaService.findBestMatch(food.name);
          
          if (match) {
            // Parse portion to extract grams for accurate calculation
            const portionGrams = parsePortionToGrams(food.portion);
            
            // Scale the pre-calculated nutrition values (which are for 100g) to the requested portion
            const scaleFactor = portionGrams / 100;
            
            const scaledNutrition = {
              calories: Math.round(match.nutrition.calories * scaleFactor),
              protein: Math.round(match.nutrition.protein * scaleFactor * 10) / 10,
              carbs: Math.round(match.nutrition.carbs * scaleFactor * 10) / 10,
              fat: Math.round(match.nutrition.fat * scaleFactor * 10) / 10
            };
            
            calculatedFoods.push({
              ...food,
              ...scaledNutrition
            });
          } else {
            // Fallback to original values if no match found
            console.warn(`No USDA match found for: ${food.name}`);
            calculatedFoods.push(food);
          }
        } catch (error) {
          console.error(`Error calculating nutrition for ${food.name}:`, error);
          // Keep original food data if calculation fails
          calculatedFoods.push(food);
        }
      }

      res.json({ foods: calculatedFoods });
    } catch (error) {
      console.error("Nutrition calculation error:", error);
      res.status(500).json({ error: "Failed to calculate nutrition" });
    }
  });

  // Diet advice routes (protected)
  app.get("/api/diet-advice",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const entries = await storage.getDiaryEntries(userId, 30); // Get last 30 entries for this user
      if (!entries || entries.length === 0) {
        return res.json({
          personalizedAdvice: [],
          nutritionGoals: [],
          improvements: [],
          generalTips: []
        });
      }

      // Get user profile for enhanced personalization
      const userProfile = await storage.getUserProfile(userId);
      
      // Analyze the data and provide advice using multi-AI provider system
      const advice = await aiManager.generateDietAdvice(entries, userProfile);
      res.json(advice);
    } catch (error) {
      console.error("Get diet advice error:", error);
      res.status(500).json({ error: "Failed to retrieve diet advice" });
    }
  });

  app.post("/api/diet-advice/generate",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const entries = await storage.getDiaryEntries(userId, 30);
      if (!entries || entries.length === 0) {
        return res.json({
          personalizedAdvice: ["Start tracking your meals to get personalized advice!"],
          nutritionGoals: ["Add meals to your diary to set nutrition goals"],
          improvements: [],
          generalTips: []
        });
      }

      // Get user profile for enhanced personalization
      const userProfile = await storage.getUserProfile(userId);
      
      const advice = await aiManager.generateDietAdvice(entries, userProfile);
      res.json(advice);
    } catch (error) {
      console.error("Generate diet advice error:", error);
      res.status(500).json({ error: "Failed to generate diet advice" });
    }
  });

  // Custom AI question endpoint
  app.post("/api/ai/ask",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const { question } = req.body;
      
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ error: "Question is required" });
      }

      // Get user's recent diary entries for context
      const entries = await storage.getDiaryEntries(userId, 14); // Last 2 weeks for context
      
      // Generate personalized response based on user's nutrition data
      const response = await aiManager.answerNutritionQuestion(question, entries);
      
      res.json({ 
        question: question.trim(),
        answer: response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("AI question error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  // AI Coach conversational endpoint with conversation history
  app.post("/api/ai-coach",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const { prompt, conversationHistory, personality: selectedPersonality, clientTimeInfo } = req.body;
      
      console.log('🕐🕐🕐 AI COACH - Received time info:', clientTimeInfo);
      
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Gather comprehensive user context for personalized coaching
      const userContext = await userContextService.getUserContext(userId);
      
      // Get AI coach memory for personalized coaching
      const coachMemory = await coachMemoryService.getOrCreateMemory(userId);
      
      // Use personality from request if provided, otherwise fall back to stored preference
      const personalityType = selectedPersonality || coachMemory.selectedPersonality || 'gym_bro';
      const personality = personalityManager.getPersonality(personalityType);
      
      // Update coach memory with the selected personality for persistence
      if (selectedPersonality && selectedPersonality !== coachMemory.selectedPersonality) {
        await coachMemoryService.updateMemory(userId, { selectedPersonality });
      }
      
      // Build full context including conversation history for continuity
      let contextualPrompt = prompt.trim();
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        // Include recent conversation turns for context (last 5 exchanges to keep prompt manageable)
        const recentHistory = conversationHistory.slice(-10); // Last 10 messages (5 exchanges)
        const historyText = recentHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n');
        contextualPrompt = `Previous conversation:\n${historyText}\n\nCurrent question: ${prompt.trim()}`;
      }
      
      // Generate conversational response with full user context, coach memory, personality, and time awareness
      const response = await aiManager.answerNutritionQuestionWithContext(
        contextualPrompt, 
        userContext,
        coachMemory, 
        personality,
        clientTimeInfo
      );
      
      res.json({ 
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("AI Coach error:", error);
      res.status(500).json({ error: "Failed to get AI Coach response" });
    }
  });

  // Coach Memory endpoints - require authentication
  app.get("/api/coach-memory",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      
      // Get or create memory for the user (auto-creates default if doesn't exist)
      const memory = await coachMemoryService.getOrCreateMemory(userId);
      
      res.json(memory);
    } catch (error) {
      console.error("Get coach memory error:", error);
      res.status(500).json({ error: "Failed to retrieve coach memory" });
    }
  });

  app.patch("/api/coach-memory",  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      
      // Validate the update data
      const updateData = updateAiCoachMemorySchema.parse(req.body);
      
      // Ensure memory exists before updating
      await coachMemoryService.getOrCreateMemory(userId);
      
      // Update memory
      const updated = await coachMemoryService.updateMemory(userId, updateData);
      
      res.json(updated);
    } catch (error) {
      console.error("Update coach memory error:", error);
      res.status(500).json({ error: "Failed to update coach memory" });
    }
  });

  // Personalities endpoint - returns available personality configurations
  app.get("/api/coach-personalities",  async (req: any, res) => {
    try {
      const personalities = personalityManager.getAllPersonalities();
      res.json(personalities);
    } catch (error) {
      console.error("Get personalities error:", error);
      res.status(500).json({ error: "Failed to retrieve personalities" });
    }
  });

  // Water intake routes - require authentication
  app.post("/api/water", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const validatedEntry = insertWaterIntakeSchema.parse({
        ...req.body,
        userId,
        drinkType: req.body.drinkType || "water",
        drinkName: req.body.drinkName || "Water"
      });
      
      const waterEntry = await storage.createWaterIntake(validatedEntry);
      res.json(waterEntry);
    } catch (error) {
      console.error("Create water intake error:", error);
      res.status(400).json({ error: "Invalid water intake data" });
    }
  });

  app.get("/api/water/:date", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const date = req.params.date; // YYYY-MM-DD format
      const entries = await storage.getWaterIntakeByDate(userId, date);
      res.json(entries);
    } catch (error) {
      console.error("Get water intake error:", error);
      res.status(500).json({ error: "Failed to retrieve water intake" });
    }
  });

  app.delete("/api/water/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const deleted = await storage.deleteWaterIntake(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Water entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete water intake error:", error);
      res.status(500).json({ error: "Failed to delete water intake" });
    }
  });

  // Drink routes - require authentication
  app.post("/api/drinks", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const validatedEntry = insertDrinkEntrySchema.parse({
        ...req.body,
        userId
      });
      const drinkEntry = await storage.createDrinkEntry(validatedEntry);
      
      // Also create a water intake entry for this drink (all drinks count as fluid intake)
      try {
        const loggedAt = drinkEntry.loggedAt || new Date();
        const loggedDate = loggedAt instanceof Date 
          ? loggedAt.toISOString().split('T')[0] 
          : new Date(loggedAt).toISOString().split('T')[0];
        
        console.log(`💧 Creating water intake: ${drinkEntry.amount}ml for user ${userId} on ${loggedDate}`);
        
        // Normalize drink type to supported values
        const supportedTypes = ["water", "coffee", "tea", "wine", "beer"];
        const normalizedDrinkType = supportedTypes.includes(drinkEntry.drinkType) 
          ? drinkEntry.drinkType as "water" | "coffee" | "tea" | "wine" | "beer" | "custom"
          : "custom";
        
        const waterIntake = await storage.createWaterIntake({
          userId,
          amountMl: drinkEntry.amount,
          drinkType: normalizedDrinkType,
          drinkName: drinkEntry.drinkName,
          loggedAt: loggedAt instanceof Date ? loggedAt.toISOString() : loggedAt,
          loggedDate
        });
        
        console.log(`✅ Water intake created:`, waterIntake);
      } catch (waterError) {
        console.error("❌ Failed to create water intake entry:", waterError);
        // Continue even if water intake creation fails
      }
      
      res.json(drinkEntry);
    } catch (error) {
      console.error("Create drink entry error:", error);
      res.status(400).json({ error: "Invalid drink entry data" });
    }
  });

  app.get("/api/drinks", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      // Disable caching for drink entries to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      const entries = await storage.getDrinkEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("Get drink entries error:", error);
      res.status(500).json({ error: "Failed to retrieve drink entries" });
    }
  });

  app.get("/api/drinks/:id", async (req: any, res) => {
    try {
      const entry = await storage.getDrinkEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Drink entry not found" });
      }
      
      // Verify the entry belongs to the authenticated user
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Get drink entry error:", error);
      res.status(500).json({ error: "Failed to retrieve drink entry" });
    }
  });

  app.delete("/api/drinks/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const entry = await storage.getDrinkEntry(req.params.id);
      
      if (!entry) {
        return res.status(404).json({ error: "Drink entry not found" });
      }
      
      // Verify the entry belongs to the user (skip check for anonymous users in deployment)
      if (req.user && entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteDrinkEntry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Drink entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete drink entry error:", error);
      res.status(500).json({ error: "Failed to delete drink entry" });
    }
  });

  // Endpoint for serving private objects (progress photos)
  // Referenced from blueprint: javascript_object_storage
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Weight entry routes - using object storage for progress photos
  app.post("/api/weights", upload.single('progressPhoto'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      let imageUrl: string | null = null;

      // Process progress photo if uploaded and save to object storage
      if (req.file) {
        try {
          // Process image: auto-rotate and optimize
          const processedImageBuffer = await sharp(req.file.path)
            .rotate() // Auto-rotate based on EXIF data
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
          
          // Upload to object storage
          const objectStorageService = new ObjectStorageService();
          imageUrl = await objectStorageService.uploadProgressPhoto(processedImageBuffer, userId);
          
          console.log(`Progress photo uploaded to object storage: ${imageUrl}`);
        } catch (sharpError) {
          console.error("Image processing/upload error:", sharpError);
          // Continue without image if processing/upload fails
        }

        // Clean up original file
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error cleaning up original file:", unlinkError);
        }
      }

      // Parse weightGrams from string to number (FormData sends everything as strings)
      const weightData = {
        ...req.body,
        weightGrams: parseInt(req.body.weightGrams, 10),
        userId,
        imageUrl
      };
      
      const validatedEntry = insertWeightEntrySchema.parse(weightData);
      const weightEntry = await storage.createWeightEntry(validatedEntry);
      
      // Track weight logged challenges
      try {
        const completedChallenges = await challengeService.trackWeightLogged(userId);
        
        // Return weight entry with completed challenges info
        res.json({ 
          ...weightEntry, 
          completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined 
        });
      } catch (challengeError) {
        console.error("Challenge tracking error:", challengeError);
        // Don't fail the weight entry creation if challenge tracking fails
        res.json(weightEntry);
      }
    } catch (error) {
      console.error("Create weight entry error:", error);
      res.status(400).json({ error: "Invalid weight entry data" });
    }
  });

  app.get("/api/weights", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const start = req.query.start ? new Date(req.query.start as string) : undefined;
      const end = req.query.end ? new Date(req.query.end as string) : undefined;
      
      const entries = await storage.getWeightEntries(userId, { start, end, limit });
      res.json(entries);
    } catch (error) {
      console.error("Get weight entries error:", error);
      res.status(500).json({ error: "Failed to retrieve weight entries" });
    }
  });

  app.get("/api/weights/:id", async (req: any, res) => {
    try {
      const entry = await storage.getWeightEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Weight entry not found" });
      }
      
      // Verify the entry belongs to the authenticated user
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Get weight entry error:", error);
      res.status(500).json({ error: "Failed to retrieve weight entry" });
    }
  });

  app.patch("/api/weights/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const entry = await storage.getWeightEntry(req.params.id);
      
      if (!entry) {
        return res.status(404).json({ error: "Weight entry not found" });
      }
      
      // Verify the entry belongs to the user
      if (entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedUpdate = updateWeightEntrySchema.parse(req.body);
      const updatedEntry = await storage.updateWeightEntry(req.params.id, validatedUpdate);
      
      if (!updatedEntry) {
        return res.status(404).json({ error: "Weight entry not found" });
      }
      
      res.json(updatedEntry);
    } catch (error) {
      console.error("Update weight entry error:", error);
      res.status(400).json({ error: "Invalid weight entry data" });
    }
  });

  app.delete("/api/weights/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const entry = await storage.getWeightEntry(req.params.id);
      
      if (!entry) {
        return res.status(404).json({ error: "Weight entry not found" });
      }
      
      // Verify the entry belongs to the user (skip check for anonymous users in deployment)
      if (req.user && entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteWeightEntry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Weight entry not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete weight entry error:", error);
      res.status(500).json({ error: "Failed to delete weight entry" });
    }
  });

  // Step entry routes - activity tracking from device health data
  app.get("/api/steps/today", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const todaySteps = await storage.getTodaySteps(userId);
      res.json(todaySteps || { stepCount: 0 });
    } catch (error) {
      console.error("Get today's steps error:", error);
      res.status(500).json({ error: "Failed to retrieve today's steps" });
    }
  });

  app.get("/api/steps", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const stepEntries = await storage.getStepEntries(userId, { limit });
      res.json(stepEntries);
    } catch (error) {
      console.error("Get step entries error:", error);
      res.status(500).json({ error: "Failed to retrieve step entries" });
    }
  });

  app.post("/api/steps", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { stepCount } = req.body;
      
      if (typeof stepCount !== 'number' || stepCount < 0) {
        return res.status(400).json({ error: "Invalid step count" });
      }

      const stepEntry = await storage.updateTodaySteps(userId, stepCount);
      res.json(stepEntry);
    } catch (error) {
      console.error("Create/update step entry error:", error);
      res.status(400).json({ error: "Invalid step entry data" });
    }
  });

  // Reflection routes - AI-powered daily/weekly insights
  app.get("/api/reflections", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const period = req.query.period as 'daily' | 'weekly' | undefined;
      const reflections = await storage.getReflectionsByUser(userId, period);
      res.json(reflections);
    } catch (error) {
      console.error("Get reflections error:", error);
      res.status(500).json({ error: "Failed to retrieve reflections" });
    }
  });

  app.get("/api/reflections/latest", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const period = (req.query.period as 'daily' | 'weekly') || 'daily';
      
      // Get or generate reflection based on period
      let reflection;
      if (period === 'weekly') {
        // For weekly, try to get latest or return null if none exists yet
        reflection = await storage.getLatestReflection(userId, 'weekly');
        if (!reflection) {
          // No weekly reflection exists yet, return message
          return res.status(404).json({ error: "No weekly reflection available yet. Generate one first." });
        }
      } else {
        // For daily, use the getOrGenerate method
        reflection = await reflectionService.getOrGenerateDailyReflection(userId);
      }
      
      res.json(reflection);
    } catch (error) {
      console.error("Get latest reflection error:", error);
      res.status(500).json({ error: "Failed to retrieve latest reflection" });
    }
  });

  app.post("/api/reflections/generate", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const period = (req.query.period as 'daily' | 'weekly') || 'daily';
      
      // Currently only daily reflections are supported
      if (period === 'weekly') {
        return res.status(501).json({ error: "Weekly reflections coming soon! For now, use daily reflections." });
      }

      const reflection = await reflectionService.generateDailyReflection(userId);
      res.json(reflection);
    } catch (error) {
      console.error("Generate reflection error:", error);
      res.status(500).json({ error: "Failed to generate reflection" });
    }
  });

  app.post("/api/reflections/refresh", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const period = (req.query.period as 'daily' | 'weekly') || 'daily';
      
      // Currently only daily reflections are supported
      if (period === 'weekly') {
        return res.status(501).json({ error: "Weekly reflections coming soon! For now, use daily reflections." });
      }

      // Delete today's reflection if it exists
      await storage.deleteTodayReflection(userId, period);

      // Generate a fresh reflection with current diary data
      const reflection = await reflectionService.generateDailyReflection(userId);
      
      res.json(reflection);
    } catch (error) {
      console.error("Refresh reflection error:", error);
      res.status(500).json({ error: "Failed to refresh reflection" });
    }
  });

  app.patch("/api/reflections/:id/share", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const reflection = await storage.getReflection(req.params.id);
      
      if (!reflection) {
        return res.status(404).json({ error: "Reflection not found" });
      }

      if (reflection.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { shareChannel } = req.body;
      const updatedReflection = await storage.updateReflectionShared(req.params.id, shareChannel);
      res.json(updatedReflection);
    } catch (error) {
      console.error("Share reflection error:", error);
      res.status(500).json({ error: "Failed to share reflection" });
    }
  });

  // Gamification: Challenge routes
  app.get("/api/challenges", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const challengesWithProgress = await challengeService.getUserChallengesWithProgress(userId);
      res.json(challengesWithProgress);
    } catch (error) {
      console.error("Get challenges error:", error);
      res.status(500).json({ error: "Failed to retrieve challenges" });
    }
  });

  app.get("/api/challenges/completed", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const completedChallenges = await challengeService.getUserCompletedChallenges(userId);
      res.json(completedChallenges);
    } catch (error) {
      console.error("Get completed challenges error:", error);
      res.status(500).json({ error: "Failed to retrieve completed challenges" });
    }
  });

  app.get("/api/challenges/points", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const points = await challengeService.getUserTotalPoints(userId);
      res.json({ points });
    } catch (error) {
      console.error("Get user points error:", error);
      res.status(500).json({ error: "Failed to retrieve user points" });
    }
  });

  app.get("/api/challenges/streak", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const streak = await challengeService.calculateCurrentStreak(userId);
      res.json({ streak });
    } catch (error) {
      console.error("Get streak error:", error);
      res.status(500).json({ error: "Failed to calculate streak" });
    }
  });

  // Check daily goals and update goal-based challenges
  app.post("/api/challenges/check-goals", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const completedChallenges = [];
      
      // Get today's totals (passed from client)
      const { totalWater, totalCalories, totalProtein, dailyGoals } = req.body;
      
      // Check water goal
      if (totalWater >= dailyGoals.water) {
        const waterChallenges = await challengeService.checkGoalChallenge(userId, 'water');
        completedChallenges.push(...waterChallenges);
      }
      
      // Check calorie goal (within 10% range)
      if (totalCalories >= dailyGoals.calories * 0.9 && totalCalories <= dailyGoals.calories * 1.1) {
        const calorieChallenges = await challengeService.checkGoalChallenge(userId, 'calorie');
        completedChallenges.push(...calorieChallenges);
      }
      
      // Check protein goal
      if (totalProtein >= dailyGoals.protein) {
        const proteinChallenges = await challengeService.checkGoalChallenge(userId, 'protein');
        completedChallenges.push(...proteinChallenges);
      }
      
      res.json({ completedChallenges });
    } catch (error) {
      console.error("Check goals error:", error);
      res.status(500).json({ error: "Failed to check goals" });
    }
  });

  // Nutrition goals routes (protected in dev, open in deployment)
  app.get("/api/nutrition-goals", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const goals = await storage.getNutritionGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Get nutrition goals error:", error);
      res.status(500).json({ error: "Failed to retrieve nutrition goals" });
    }
  });

  app.post("/api/nutrition-goals", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const validatedGoals = insertNutritionGoalsSchema.parse({
        ...req.body,
        userId
      });
      const goals = await storage.upsertNutritionGoals(validatedGoals);
      res.json(goals);
    } catch (error) {
      console.error("Set nutrition goals error:", error);
      res.status(400).json({ error: "Invalid nutrition goals data" });
    }
  });

  // User profile routes
  app.get("/api/user-profile",  async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const profile = await storage.getUserProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.post("/api/user-profile",  async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const validatedProfile = insertUserProfileSchema.parse({
        ...req.body,
        userId
      });
      const profile = await storage.upsertUserProfile(validatedProfile);
      res.json(profile);
    } catch (error) {
      console.error("Set user profile error:", error);
      res.status(400).json({ error: "Invalid user profile data" });
    }
  });

  // Shift Schedule endpoints for weekly meal planning
  // GET shift schedule for a date range
  app.get("/api/shift-schedule",  async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      const schedules = await storage.getShiftSchedules(userId, startDate as string, endDate as string);
      res.json(schedules);
    } catch (error) {
      console.error("Get shift schedule error:", error);
      res.status(500).json({ error: "Failed to fetch shift schedule" });
    }
  });

  // POST create or update shift schedule for a specific date
  app.post("/api/shift-schedule",  async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const validatedSchedule = insertShiftScheduleSchema.parse({
        ...req.body,
        userId
      });

      const schedule = await storage.upsertShiftSchedule(validatedSchedule);
      res.json(schedule);
    } catch (error) {
      console.error("Create shift schedule error:", error);
      res.status(400).json({ error: "Invalid shift schedule data" });
    }
  });

  // DELETE shift schedule by date
  app.delete("/api/shift-schedule/:date",  async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { date } = req.params;
      await storage.deleteShiftSchedule(userId, date);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shift schedule error:", error);
      res.status(500).json({ error: "Failed to delete shift schedule" });
    }
  });

  // Daily coaching endpoints
  app.get('/api/coaching/daily',  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      
      // Get user's diary entries for personalized coaching
      const entries = await storage.getDiaryEntries(userId, 30);
      
      // Use AI manager to generate daily coaching
      const coaching = await aiManager.generateDailyCoaching(entries);
      
      res.json(coaching);
    } catch (error: any) {
      console.error("Error generating daily coaching:", error);
      res.status(500).json({ 
        error: "Failed to generate daily coaching",
        details: error.message 
      });
    }
  });

  app.post('/api/coaching/generate',  async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user.claims.sub;
      
      // Get user's diary entries for personalized coaching
      const entries = await storage.getDiaryEntries(userId, 30);
      
      // Use AI manager to generate fresh daily coaching
      const coaching = await aiManager.generateDailyCoaching(entries);
      
      res.json(coaching);
    } catch (error: any) {
      console.error("Error generating fresh daily coaching:", error);
      res.status(500).json({ 
        error: "Failed to generate fresh daily coaching",
        details: error.message 
      });
    }
  });

  app.get('/api/coaching/tips', async (req, res) => {
    try {
      const { category = 'all' } = req.query;
      
      // Validate category
      const validCategories = ['all', 'nutrition', 'medication', 'motivation'];
      if (!validCategories.includes(category as string)) {
        return res.status(400).json({ 
          error: 'Invalid category. Must be one of: all, nutrition, medication, motivation' 
        });
      }

      // Use AI manager to generate educational tips
      const tips = await aiManager.generateEducationalTips(category as any);
      
      res.json(tips);
    } catch (error: any) {
      console.error("Error generating educational tips:", error);
      res.status(500).json({ 
        error: "Failed to generate educational tips",
        details: error.message 
      });
    }
  });

  // AI Provider monitoring routes
  app.get("/api/ai/status", async (req, res) => {
    try {
      const systemHealth = aiManager.getSystemHealth();
      res.json(systemHealth);
    } catch (error) {
      console.error("Get AI status error:", error);
      res.status(500).json({ error: "Failed to retrieve AI status" });
    }
  });

  app.post("/api/ai/reset", async (req, res) => {
    try {
      aiManager.resetProviders();
      res.json({ success: true, message: "All providers reset successfully" });
    } catch (error) {
      console.error("Reset AI providers error:", error);
      res.status(500).json({ error: "Failed to reset providers" });
    }
  });

  // Clear USDA cache to force fresh searches
  app.post("/api/clear-usda-cache", async (req, res) => {
    try {
      usdaService.clearCache();
      res.json({ success: true, message: "USDA cache cleared successfully" });
    } catch (error) {
      console.error("Clear USDA cache error:", error);
      res.status(500).json({ error: "Failed to clear USDA cache" });
    }
  });

  // Fallback recipes when AI providers are unavailable
  const fallbackRecipes = [
    {
      id: "fallback-1",
      name: "Grilled Chicken Salad",
      description: "Fresh mixed greens with grilled chicken breast, cherry tomatoes, and olive oil dressing",
      calories: 320,
      protein: 35,
      carbs: 12,
      fat: 15,
      servings: 1,
      prepTime: 15,
      cookTime: 10,
      difficulty: "Easy" as const,
      ingredients: ["Mixed greens", "Chicken breast", "Cherry tomatoes", "Olive oil", "Lemon juice"],
      instructions: ["Grill chicken", "Mix greens", "Add toppings", "Dress salad"],
      tags: ["healthy", "protein"],
      dietaryInfo: ["high-protein", "gluten-free"]
    },
    {
      id: "fallback-2",
      name: "Quinoa Buddha Bowl",
      description: "Nutritious bowl with quinoa, roasted vegetables, and tahini dressing",
      calories: 450,
      protein: 15,
      carbs: 65,
      fat: 18,
      servings: 1,
      prepTime: 20,
      cookTime: 25,
      difficulty: "Medium" as const,
      ingredients: ["Quinoa", "Sweet potato", "Broccoli", "Chickpeas", "Tahini"],
      instructions: ["Cook quinoa", "Roast vegetables", "Assemble bowl", "Add dressing"],
      tags: ["vegan", "healthy"],
      dietaryInfo: ["vegan", "vegetarian", "high-fiber"]
    },
    {
      id: "fallback-3",
      name: "Mediterranean Wrap",
      description: "Whole wheat wrap with hummus, vegetables, and feta cheese",
      calories: 380,
      protein: 12,
      carbs: 45,
      fat: 16,
      servings: 1,
      prepTime: 10,
      cookTime: 0,
      difficulty: "Easy" as const,
      ingredients: ["Whole wheat tortilla", "Hummus", "Cucumber", "Tomatoes", "Feta cheese"],
      instructions: ["Spread hummus", "Add vegetables", "Add cheese", "Roll wrap"],
      tags: ["vegetarian", "mediterranean"],
      dietaryInfo: ["vegetarian", "mediterranean"]
    }
  ];

  // Recipe cache with 24-hour TTL
  const recipeCache = new Map<string, { recipes: any[], timestamp: number }>();
  const RECIPE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  const getCachedRecipes = (dietaryFilter: string) => {
    const cacheKey = dietaryFilter || 'all';
    const cached = recipeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < RECIPE_CACHE_TTL) {
      return cached.recipes;
    }
    
    return null;
  };

  const setCachedRecipes = (dietaryFilter: string, recipes: any[]) => {
    const cacheKey = dietaryFilter || 'all';
    recipeCache.set(cacheKey, {
      recipes,
      timestamp: Date.now()
    });
  };

  // Recipe routes
  app.get("/api/recipes", async (req: any, res) => {
    try {
      const dietaryFilter = req.query.diet as string || "";
      const userId = req.user?.claims?.sub;
      
      // Fetch user profile for allergies and preferences
      let userProfile = null;
      if (userId) {
        try {
          userProfile = await storage.getUserProfile(userId);
        } catch (profileError) {
          console.log('Could not fetch user profile for recipes');
        }
      }
      
      // Check cache first
      const cachedRecipes = getCachedRecipes(dietaryFilter);
      if (cachedRecipes) {
        return res.json(cachedRecipes);
      }
      
      try {
        const recipes = await aiManager.generateRecipes(dietaryFilter, userProfile);
        setCachedRecipes(dietaryFilter, recipes);
        res.json(recipes);
      } catch (aiError) {
        console.log('AI providers unavailable, serving fallback recipes');
        
        // Filter fallback recipes by diet if specified
        let filteredRecipes = fallbackRecipes;
        if (dietaryFilter && dietaryFilter !== 'all') {
          filteredRecipes = fallbackRecipes.filter(recipe => 
            recipe.dietaryInfo.includes(dietaryFilter)
          );
        }
        
        // If no recipes match the diet, show all fallback recipes
        if (filteredRecipes.length === 0) {
          filteredRecipes = fallbackRecipes;
        }
        
        res.json(filteredRecipes);
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // Get user's saved recipes (MUST be before dynamic route)
  app.get("/api/recipes/saved", async (req: any, res) => {
    console.log("🚨 SAVED RECIPES ENDPOINT HIT - timestamp:", Date.now());
    console.log("🚨 req.user:", JSON.stringify(req.user));
    console.log("🚨 Authorization header:", req.headers.authorization);
    try {
      const userId = req.user?.claims?.sub;
      console.log("🚨 User ID:", userId);
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Disable all caching including ETag
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': undefined // Explicitly disable ETag to prevent 304 responses
      });
      
      console.log("🔍 Fetching saved recipes for user:", userId);
      const saved = await db.query.savedRecipes.findMany({
        where: eq(savedRecipes.userId, userId),
        orderBy: (savedRecipes, { desc }) => [desc(savedRecipes.savedAt)],
      });
      
      console.log("📦 Found", saved.length, "saved recipes from DB");
      if (saved.length > 0) {
        console.log("First recipe recipeId:", saved[0].recipeId);
      }
      
      // Return the recipe data from each saved recipe
      const recipes = saved.map((s: any) => ({
        ...s.recipeData,
        id: s.recipeId, // Ensure the ID matches for UI consistency
        isSaved: true,
      }));
      
      console.log("✅ Returning", recipes.length, "recipes, first ID:", recipes[0]?.id);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching saved recipes:", error);
      res.status(500).json({ message: "Failed to fetch saved recipes" });
    }
  });

  // Dynamic recipe route for diet filtering
  app.get("/api/recipes/:diet?/:search?", async (req: any, res) => {
    try {
      const { diet, search } = req.params;
      const dietaryFilter = diet || "";
      const userId = req.user?.claims?.sub;
      
      // Fetch user profile for allergies and preferences
      let userProfile = null;
      if (userId) {
        try {
          userProfile = await storage.getUserProfile(userId);
        } catch (profileError) {
          console.log('Could not fetch user profile for recipes');
        }
      }
      
      // Check cache first
      const cachedRecipes = getCachedRecipes(dietaryFilter);
      if (cachedRecipes) {
        return res.json(cachedRecipes);
      }
      
      try {
        const recipes = await aiManager.generateRecipes(dietaryFilter, userProfile);
        setCachedRecipes(dietaryFilter, recipes);
        res.json(recipes);
      } catch (aiError) {
        console.log('AI providers unavailable, serving fallback recipes');
        
        // Filter fallback recipes by diet if specified
        let filteredRecipes = fallbackRecipes;
        if (dietaryFilter && dietaryFilter !== 'all') {
          filteredRecipes = fallbackRecipes.filter(recipe => 
            recipe.dietaryInfo.includes(dietaryFilter)
          );
        }
        
        // If no recipes match the diet, show all fallback recipes
        if (filteredRecipes.length === 0) {
          filteredRecipes = fallbackRecipes;
        }
        
        res.json(filteredRecipes);
      }
    } catch (error) {
      console.error("Error fetching dynamic recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // Refresh recipes - clear cache and get new ones
  app.post("/api/recipes/refresh", async (req: any, res) => {
    try {
      const dietaryFilter = req.body.dietaryFilter || "";
      const userId = req.user?.claims?.sub;
      
      // Fetch user profile for allergies and preferences
      let userProfile = null;
      if (userId) {
        try {
          userProfile = await storage.getUserProfile(userId);
        } catch (profileError) {
          console.log('Could not fetch user profile for recipes');
        }
      }
      
      // Clear the cache for this dietary filter
      const cacheKey = dietaryFilter || 'all';
      recipeCache.delete(cacheKey);
      
      // Generate new recipes
      try {
        const recipes = await aiManager.generateRecipes(dietaryFilter, userProfile);
        setCachedRecipes(dietaryFilter, recipes);
        res.json(recipes);
      } catch (aiError) {
        console.log('AI providers unavailable, serving fallback recipes');
        const filteredRecipes = fallbackRecipes.filter(recipe => 
          !dietaryFilter || dietaryFilter === 'all' || recipe.dietaryInfo.includes(dietaryFilter)
        );
        res.json(filteredRecipes.length > 0 ? filteredRecipes : fallbackRecipes);
      }
    } catch (error) {
      console.error("Error refreshing recipes:", error);
      res.status(500).json({ message: "Failed to refresh recipes" });
    }
  });

  // Save a recipe to favorites
  app.post("/api/recipes/save", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { recipeId, recipeName, recipeData } = req.body;
      
      if (!recipeId || !recipeName || !recipeData) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if already saved
      const existing = await db.query.savedRecipes.findFirst({
        where: and(
          eq(savedRecipes.userId, userId),
          eq(savedRecipes.recipeId, recipeId)
        ),
      });
      
      if (existing) {
        return res.status(400).json({ message: "Recipe already saved" });
      }
      
      const [savedRecipe] = await db.insert(savedRecipes).values({
        userId,
        recipeId,
        recipeName,
        recipeData,
      }).returning();
      
      res.json(savedRecipe);
    } catch (error) {
      console.error("Error saving recipe:", error);
      res.status(500).json({ message: "Failed to save recipe" });
    }
  });

  // Unsave a recipe
  app.delete("/api/recipes/save/:recipeId", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { recipeId } = req.params;
      
      await db.delete(savedRecipes).where(
        and(
          eq(savedRecipes.userId, userId),
          eq(savedRecipes.recipeId, recipeId)
        )
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsaving recipe:", error);
      res.status(500).json({ message: "Failed to unsave recipe" });
    }
  });

  // === AI Coach Memory & Personality Endpoints ===

  // Get coach memory for the current user
  app.get("/api/coach-memory", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const memory = await coachMemoryService.getOrCreateMemory(userId);
      res.json(memory);
    } catch (error) {
      console.error("Error fetching coach memory:", error);
      res.status(500).json({ error: "Failed to fetch coach memory" });
    }
  });

  // Update coach memory
  app.patch("/api/coach-memory", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const validatedData = updateAiCoachMemorySchema.parse(req.body);
      const updated = await coachMemoryService.updateMemory(userId, validatedData);
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating coach memory:", error);
      res.status(400).json({ error: "Failed to update coach memory" });
    }
  });

  // Get all available personalities
  app.get("/api/coach-personalities", async (req: any, res) => {
    try {
      const personalities = personalityManager.getAllPersonalities();
      res.json(personalities);
    } catch (error) {
      console.error("Error fetching personalities:", error);
      res.status(500).json({ error: "Failed to fetch personalities" });
    }
  });

  // Get user context for AI (memory + profile combined)
  app.get("/api/coach-context", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const context = await coachMemoryService.getUserContext(userId);
      res.json(context);
    } catch (error) {
      console.error("Error fetching coach context:", error);
      res.status(500).json({ error: "Failed to fetch coach context" });
    }
  });

  // Add a mood entry
  app.post("/api/coach-memory/mood", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { mood, sentiment } = req.body;
      
      if (!mood || typeof sentiment !== 'number') {
        return res.status(400).json({ error: "Mood and sentiment are required" });
      }

      await coachMemoryService.addMoodEntry(userId, mood, sentiment);
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding mood entry:", error);
      res.status(500).json({ error: "Failed to add mood entry" });
    }
  });

  // Shopping List routes
  app.get("/api/shopping-list", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const items = await storage.getShoppingList(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      res.status(500).json({ error: "Failed to fetch shopping list" });
    }
  });

  app.post("/api/shopping-list", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const validatedData = insertShoppingListItemSchema.parse({
        ...req.body,
        userId,
      });

      const item = await storage.addShoppingItem(validatedData);
      res.json(item);
    } catch (error) {
      console.error("Error adding shopping item:", error);
      res.status(400).json({ error: "Failed to add shopping item" });
    }
  });

  app.patch("/api/shopping-list/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const validatedData = updateShoppingListItemSchema.parse(req.body);
      const updated = await storage.updateShoppingItem(req.params.id, userId, validatedData);
      if (!updated) {
        return res.status(404).json({ error: "Shopping item not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating shopping item:", error);
      res.status(400).json({ error: "Failed to update shopping item" });
    }
  });

  app.delete("/api/shopping-list/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const deleted = await storage.deleteShoppingItem(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Shopping item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shopping item:", error);
      res.status(500).json({ error: "Failed to delete shopping item" });
    }
  });

  app.delete("/api/shopping-list", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      await storage.clearShoppingList(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing shopping list:", error);
      res.status(500).json({ error: "Failed to clear shopping list" });
    }
  });

  // Shift schedule routes for weekly meal planning
  app.get("/api/shift-schedules", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      const schedules = await storage.getShiftSchedules(userId, startDate as string, endDate as string);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching shift schedules:", error);
      res.status(500).json({ error: "Failed to fetch shift schedules" });
    }
  });

  app.post("/api/shift-schedules", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const scheduleData = insertShiftScheduleSchema.parse({
        ...req.body,
        userId
      });

      const schedule = await storage.upsertShiftSchedule(scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating/updating shift schedule:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save shift schedule" });
    }
  });

  app.delete("/api/shift-schedules/:date", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { date } = req.params;
      const success = await storage.deleteShiftSchedule(userId, date);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting shift schedule:", error);
      res.status(500).json({ error: "Failed to delete shift schedule" });
    }
  });

  // Generate weekly meal plan based on shift schedules
  app.post("/api/shift-schedules/generate-meal-plan", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      // Get shift schedules for the specified date range
      const shifts = await storage.getShiftSchedules(userId, startDate, endDate);
      
      if (shifts.length === 0) {
        return res.status(400).json({ error: "No shift schedules found for the specified date range" });
      }

      // Get user profile for personalization
      const userProfile = await storage.getUserProfile(userId);

      // Generate weekly meal plan using AI
      const { ShiftMealPlanService } = await import("./services/shift-meal-plan-service");
      const mealPlanService = new ShiftMealPlanService(storage);
      const mealPlan = await mealPlanService.generateWeeklyMealPlan(userId, shifts, userProfile || undefined);

      console.log("🛒 Meal plan shopping list check:", {
        hasShoppingList: !!mealPlan.shoppingList,
        itemCount: mealPlan.shoppingList?.length || 0,
        hasWeeklyNutrition: !!mealPlan.weeklyNutrition,
        hasWeeklyTips: !!mealPlan.weeklyTips
      });

      // Update each shift schedule with the generated meal plan data
      // For the first schedule, include weekly data (shoppingList, weeklyNutrition, weeklyTips)
      for (let i = 0; i < mealPlan.dailyPlans.length; i++) {
        const dailyPlan = mealPlan.dailyPlans[i];
        const mealPlanData = i === 0 ? {
          ...dailyPlan,
          shoppingList: mealPlan.shoppingList,
          weeklyNutrition: mealPlan.weeklyNutrition,
          weeklyTips: mealPlan.weeklyTips
        } : dailyPlan;

        const existingShift = shifts.find(s => s.shiftDate === dailyPlan.date);
        await storage.upsertShiftSchedule({
          userId,
          shiftDate: dailyPlan.date,
          shiftType: (existingShift?.shiftType || 'regular') as 'custom' | 'day_off' | 'regular' | 'early_shift' | 'late_shift' | 'night_shift' | 'long_shift',
          customShiftStart: dailyPlan.shiftStart || null,
          customShiftEnd: dailyPlan.shiftEnd || null,
          breakWindows: dailyPlan.breakWindows || null,
          mealPlanGenerated: 1,
          mealPlanData: mealPlanData as any
        });
      }

      res.json(mealPlan);
    } catch (error) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ error: "Failed to generate meal plan" });
    }
  });

  // Add meal plan shopping list to user's shopping list
  app.post("/api/shift-schedules/add-to-shopping-list", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      // Get shift schedules for the date range to extract meal plan shopping list
      const shifts = await storage.getShiftSchedules(userId, startDate, endDate);
      
      // Find the first shift with meal plan data containing shopping list
      let shoppingList: Array<{ ingredient: string; quantity: string; category: string }> = [];
      for (const shift of shifts) {
        if (shift.mealPlanData && (shift.mealPlanData as any).shoppingList) {
          shoppingList = (shift.mealPlanData as any).shoppingList;
          break;
        }
      }

      if (shoppingList.length === 0) {
        return res.status(400).json({ error: "No shopping list found in meal plan" });
      }

      // Get existing shopping list items
      const existingItems = await storage.getShoppingList(userId);
      const existingItemsMap = new Map(
        existingItems.map(item => [item.itemName.toLowerCase(), item])
      );

      let addedCount = 0;
      let updatedCount = 0;

      // Add or update shopping list items
      for (const mealPlanItem of shoppingList) {
        const itemName = mealPlanItem.ingredient;
        const existingItem = existingItemsMap.get(itemName.toLowerCase());

        if (existingItem) {
          // Item exists - combine quantities if possible
          const combinedQuantity = existingItem.quantity 
            ? `${existingItem.quantity} + ${mealPlanItem.quantity}`
            : mealPlanItem.quantity;
          
          await storage.updateShoppingItem(existingItem.id, userId, {
            quantity: combinedQuantity
          });
          updatedCount++;
        } else {
          // Add new item
          await storage.addShoppingItem({
            userId,
            itemName: itemName,
            checked: 0,
            source: "custom",
            quantity: mealPlanItem.quantity,
            unit: null
          });
          addedCount++;
        }
      }

      res.json({ 
        success: true, 
        addedCount, 
        updatedCount,
        totalItems: shoppingList.length 
      });
    } catch (error) {
      console.error("Error adding meal plan to shopping list:", error);
      res.status(500).json({ error: "Failed to add items to shopping list" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
