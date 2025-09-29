import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertFoodAnalysisSchema, insertDiaryEntrySchema, updateDiaryEntrySchema, insertDrinkEntrySchema, insertWeightEntrySchema, updateWeightEntrySchema, insertNutritionGoalsSchema, insertUserProfileSchema, updateFoodAnalysisSchema, insertSimpleFoodEntrySchema, insertFoodConfirmationSchema, updateFoodConfirmationSchema } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import express from "express";
import { aiManager } from "./ai-providers/ai-manager";
import { usdaService } from "./services/usda-service";
import { imageAnalysisCache } from "./services/image-analysis-cache";
import { openFoodFactsService } from "./services/openfoodfacts-service";

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
  if (/\b(pieces?|items?)\b/.test(portionLower)) {
    return amount * 50; // 1 piece ≈ 50g average
  }
  if (/\b(servings?)\b/.test(portionLower)) {
    return amount * 100; // 1 serving ≈ 100g
  }
  
  // Default: assume it's already in grams or treat as specified amount
  return amount > 0 ? amount : 100;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure upload directory exists
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    console.log(`📁 Upload directory created/verified: ${uploadDir}`);
  } catch (error) {
    console.error(`❌ Failed to create upload directory ${uploadDir}:`, error);
  }

  // Serve uploaded images as static files from the correct upload directory
  app.use('/uploads', express.static(uploadDir));
  
  // Setup authentication
  await setupAuth(app);

  // User authentication endpoint
  app.get('/api/user', async (req: any, res) => {
    if (req.user && req.user.claims) {
      // User is authenticated, return user info
      const user = await storage.getUser(req.user.claims.sub);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } else {
      // User not authenticated
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Cache and monitoring endpoints
  app.get('/api/cache/stats', isAuthenticated, async (req, res) => {
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

  app.post('/api/cache/clear', isAuthenticated, async (req, res) => {
    try {
      await imageAnalysisCache.clear();
      res.json({ message: 'Cache cleared successfully' });
    } catch (error: any) {
      console.error('Failed to clear cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // saveFood endpoint for mobile app compatibility - accepts simple food entries
  app.post("/saveFood", async (req, res) => {
    try {
      // Log the incoming request body for debugging
      console.log("📱 /saveFood endpoint received request:", JSON.stringify(req.body, null, 2));
      
      const { food, amount, userId } = req.body;
      
      // Validate required fields
      if (!food || !amount || !userId) {
        console.log("❌ Missing required fields:", { food: !!food, amount: !!amount, userId: !!userId });
        return res.status(400).json({
          status: "error",
          message: "Missing required fields: food, amount, and userId are all required"
        });
      }
      
      // Validate data types
      if (typeof food !== 'string' || typeof amount !== 'string' || typeof userId !== 'string') {
        console.log("❌ Invalid field types:", { 
          food: typeof food, 
          amount: typeof amount, 
          userId: typeof userId 
        });
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
      
      console.log("✅ Validated entry data:", validatedEntry);
      
      // Save to database
      const savedEntry = await storage.createSimpleFoodEntry(validatedEntry);
      
      console.log("💾 Successfully saved food entry to database:", {
        id: savedEntry.id,
        food: savedEntry.food,
        amount: savedEntry.amount,
        userId: savedEntry.userId,
        createdAt: savedEntry.createdAt
      });
      
      // Return success response in the exact format requested
      res.json({ status: "ok" });
      
    } catch (error: any) {
      console.error("❌ /saveFood error:", error);
      
      // Handle validation errors specifically
      if (error.name === 'ZodError') {
        console.error("Validation error details:", error.errors);
        return res.status(400).json({
          status: "error",
          message: `Validation failed: ${error.errors.map((e: any) => e.message).join(', ')}`
        });
      }
      
      // Handle database errors
      if (error.code === '23503') { // Foreign key constraint
        console.error("Database foreign key error - invalid userId");
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

  // Enable Replit authentication for all routes
  const authMiddleware = isAuthenticated;
  
  app.post("/api/analyze", authMiddleware, upload.single('image'), async (req: any, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestStartTime = Date.now();
    
    try {
      // Enhanced deployment debugging
      console.log(`\n🔄 [${requestId}] ===== IMAGE ANALYSIS START =====`);
      console.log(`🌍 Environment: ${process.env.REPLIT_DEPLOYMENT ? 'DEPLOYMENT' : 'DEVELOPMENT'}`);
      console.log(`👤 User: ${req.user?.claims?.sub || 'Unknown'}`);
      console.log(`📱 Request Headers:`, {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        origin: req.headers.origin,
        referer: req.headers.referer
      });
      
      if (!req.file) {
        console.log(`❌ [${requestId}] No image file provided in request`);
        return res.status(400).json({ error: "No image file provided" });
      }

      // Log detailed file information
      console.log(`📸 [${requestId}] File details:`, {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename,
        path: req.file.path
      });
      
      console.log(`🔄 [${requestId}] Starting image analysis request`);
      
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
        // Attempt to process the image with Sharp (more resilient approach)
        await sharp(req.file.path)
          .rotate() // Auto-rotate based on EXIF data
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toFile(processedImagePath);
          
        console.log("✅ Image processed successfully with Sharp");
      } catch (sharpError: any) {
        console.warn("⚠️ Sharp processing failed, falling back to original file:", sharpError.message);
        
        // Fallback: copy original file as processed image
        try {
          await fs.copyFile(req.file.path, processedImagePath);
          console.log("✅ Using original file as fallback");
        } catch (copyError) {
          console.error("❌ Fallback copy failed:", copyError);
          
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
      console.log(`⏳ [${requestId}] Waiting for queue slot (active: ${queueStats.active}, waiting: ${queueStats.waiting})`);
      await analysisQueue.acquire();
      
      // Variables to store response data and status - prevents early returns from bypassing finally
      let responseData: any = null;
      let responseStatus = 200;
      let analysisError: any = null;
      
      try {
        // Real food recognition and nutrition analysis using multi-AI provider system with timeout
        console.log(`🧠 [${requestId}] Starting AI analysis (includes cache check)...`);
        console.log(`🔑 [${requestId}] API Keys available:`, {
          openai: !!process.env.OPENAI_API_KEY,
          google: !!process.env.GOOGLE_API_KEY,
          gemini: !!process.env.GEMINI_API_KEY,
          usda: !!process.env.USDA_API_KEY
        });
        const analysisStartTime = Date.now();
        
        const foodAnalysisData = await Promise.race([
          aiManager.analyzeFoodImage(processedImagePath),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Analysis timeout after 60 seconds')), 60000)
          )
        ]);
        
        const analysisTime = Date.now() - analysisStartTime;
        console.log(`✅ [${requestId}] Analysis completed in ${analysisTime}ms`);
        
        // Add analysis timing to response headers
        res.setHeader('X-Analysis-Time', analysisTime.toString());

        // CONFIDENCE THRESHOLD CHECK: Apply to ALL analysis results (cached and fresh)
        console.log(`🔍 [${requestId}] Checking confidence threshold: ${foodAnalysisData.confidence}% (threshold: 90%)`);
        if (foodAnalysisData.confidence < 90) {
          console.log(`⚠️ Low confidence (${foodAnalysisData.confidence}%) for image analysis`);
          
          // In deployment without auth, skip confirmation and proceed with analysis
          if (!req.user) {
            console.log(`📝 [${requestId}] No user context in deployment - proceeding with low-confidence analysis`);
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
            
            console.log(`🔄 [${requestId}] Created confirmation ${confirmation.id} - returning 200 confirmation_required`);
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
          console.log(`✅ [${requestId}] High confidence (${foodAnalysisData.confidence}%) - creating food analysis and returning 200 OK`);
          const analysis = await storage.createFoodAnalysis(foodAnalysisData);

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
              
              console.log(`✅ Auto-added analysis ${analysis.id} to diary for user ${userId}`);
              
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
      
      // Log total request time
      const totalTime = Date.now() - requestStartTime;
      console.log(`🏁 [${requestId}] Request completed in ${totalTime}ms`);
      
    } catch (error) {
      const totalTime = Date.now() - requestStartTime;
      console.error(`❌ [${requestId}] Request failed after ${totalTime}ms:`, error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // Test barcode lookup endpoint (for debugging)
  app.get("/api/test-barcode/:barcode", async (req, res) => {
    try {
      const barcode = req.params.barcode;
      console.log(`🧪 Testing barcode lookup for: ${barcode}`);
      
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
  app.post("/api/barcode", authMiddleware, async (req: any, res) => {
    try {
      const { barcode } = req.body;
      
      if (!barcode || typeof barcode !== 'string') {
        return res.status(400).json({ error: "Barcode is required" });
      }

      console.log(`🔍 Barcode lookup request: ${barcode}`);
      
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
      
      console.log(`✅ Barcode analysis created: ${analysis.id} for ${productData.food}`);
      res.json(analysis);
      
    } catch (error) {
      console.error("Barcode lookup error:", error);
      res.status(500).json({ error: "Failed to lookup barcode" });
    }
  });

  // Text-based food analysis for voice input - bypass auth in deployment like image analysis
  app.post("/api/analyze-text", authMiddleware, async (req: any, res) => {
    try {
      const { foodDescription } = req.body;
      
      if (!foodDescription || typeof foodDescription !== 'string') {
        return res.status(400).json({ error: "Food description is required" });
      }

      // Use AI manager to analyze text-based food description
      const foodAnalysisData = await aiManager.analyzeFoodText(foodDescription.trim());

      // CONFIDENCE THRESHOLD CHECK: If confidence < 90%, create confirmation workflow
      if (foodAnalysisData.confidence < 90) {
        console.log(`⚠️ Low confidence (${foodAnalysisData.confidence}%) for text analysis - creating food confirmation`);
        
        // In deployment without auth, skip confirmation and proceed with analysis
        if (!req.user) {
          console.log(`📝 No user context in deployment - proceeding with low-confidence text analysis`);
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
      console.log(`✅ High confidence (${foodAnalysisData.confidence}%) for text analysis - creating food analysis`);
      const analysis = await storage.createFoodAnalysis(foodAnalysisData);

      res.json(analysis);
    } catch (error) {
      console.error("Text analysis error:", error);
      res.status(500).json({ error: "Failed to analyze food description" });
    }
  });

  // Update food analysis (for editing detected foods) - PROTECTED
  app.patch("/api/analyses/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub || 'anonymous-user';

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
            console.log(`🔧 Auto-repairing legacy food entry: ${food.name}`);
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

      console.log(`✅ User ${userId} updated food analysis ${id} with ${processedFoods.length} foods. Totals: ${serverTotals.calories}cal, ${serverTotals.protein}g protein`);
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
  app.post("/api/food-confirmations", isAuthenticated, async (req: any, res) => {
    try {
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
  app.get("/api/food-confirmations", isAuthenticated, async (req: any, res) => {
    try {
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
  app.get("/api/food-confirmations/:id", isAuthenticated, async (req: any, res) => {
    try {
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
  app.patch("/api/food-confirmations/:id", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
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

        console.log(`✅ User ${userId} confirmed food analysis. Created final analysis ${finalAnalysis.id}`);
        res.json({ confirmation, finalAnalysis });
      } else {
        console.log(`❌ User ${userId} rejected food analysis ${id}`);
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
  app.post("/api/analyses/:id/refresh", isAuthenticated, async (req: any, res) => {
    try {
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

      console.log(`✅ User ${userId} refreshed food analysis ${id}. New totals: ${freshAnalysisData.totalCalories}cal, ${freshAnalysisData.totalProtein}g protein`);
      res.json(updatedAnalysis);
    } catch (error: any) {
      console.error("Refresh analysis error:", error);
      res.status(500).json({ error: "Failed to refresh food analysis" });
    }
  });

  // Diary routes - bypass auth in deployment with anonymous user support
  app.post("/api/diary", authMiddleware, async (req: any, res) => {
    try {
      // In deployment without auth, use anonymous user ID
      const userId = req.user?.claims?.sub || 'anonymous-user';
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
      res.json(diaryEntry);
    } catch (error) {
      console.error("Create diary entry error:", error);
      res.status(400).json({ error: "Invalid diary entry data" });
    }
  });

  app.get("/api/diary", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
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

  app.get("/api/diary/:id", authMiddleware, async (req: any, res) => {
    try {
      const entry = await storage.getDiaryEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Diary entry not found" });
      }
      
      // Verify the entry belongs to the user (skip check for anonymous users in deployment)
      const userId = req.user?.claims?.sub || 'anonymous-user';
      if (req.user && entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Get diary entry error:", error);
      res.status(500).json({ error: "Failed to retrieve diary entry" });
    }
  });

  app.patch("/api/diary/:id", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
      const entry = await storage.getDiaryEntry(req.params.id);
      
      if (!entry) {
        return res.status(404).json({ error: "Diary entry not found" });
      }
      
      // Verify the entry belongs to the authenticated user
      if (entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedUpdate = updateDiaryEntrySchema.parse(req.body);
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

  app.delete("/api/diary/:id", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
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
  
  app.post("/api/calculate-nutrition", authMiddleware, async (req: any, res) => {
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
            
            // Extract nutrition data scaled to the portion
            const nutritionData = usdaService.extractNutritionData(match.usdaFood, portionGrams);
            
            calculatedFoods.push({
              ...food,
              calories: nutritionData.calories,
              protein: nutritionData.protein,
              carbs: nutritionData.carbs,
              fat: nutritionData.fat
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
  app.get("/api/diet-advice", isAuthenticated, async (req: any, res) => {
    try {
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

  app.post("/api/diet-advice/generate", isAuthenticated, async (req: any, res) => {
    try {
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
  app.post("/api/ai/ask", isAuthenticated, async (req: any, res) => {
    try {
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

  // Drink routes (protected)
  app.post("/api/drinks", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
      const validatedEntry = insertDrinkEntrySchema.parse({
        ...req.body,
        userId
      });
      const drinkEntry = await storage.createDrinkEntry(validatedEntry);
      res.json(drinkEntry);
    } catch (error) {
      console.error("Create drink entry error:", error);
      res.status(400).json({ error: "Invalid drink entry data" });
    }
  });

  app.get("/api/drinks", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
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

  app.get("/api/drinks/:id", authMiddleware, async (req: any, res) => {
    try {
      const entry = await storage.getDrinkEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Drink entry not found" });
      }
      
      // Verify the entry belongs to the user (skip check for anonymous users in deployment)
      const userId = req.user?.claims?.sub || 'anonymous-user';
      if (req.user && entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Get drink entry error:", error);
      res.status(500).json({ error: "Failed to retrieve drink entry" });
    }
  });

  app.delete("/api/drinks/:id", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
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

  // Weight entry routes - bypass auth in deployment like diary routes
  app.post("/api/weights", authMiddleware, async (req: any, res) => {
    try {
      // In deployment without auth, use anonymous user ID
      const userId = req.user?.claims?.sub || 'anonymous-user';
      const validatedEntry = insertWeightEntrySchema.parse({
        ...req.body,
        userId
      });
      const weightEntry = await storage.createWeightEntry(validatedEntry);
      res.json(weightEntry);
    } catch (error) {
      console.error("Create weight entry error:", error);
      res.status(400).json({ error: "Invalid weight entry data" });
    }
  });

  app.get("/api/weights", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
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

  app.get("/api/weights/:id", authMiddleware, async (req: any, res) => {
    try {
      const entry = await storage.getWeightEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Weight entry not found" });
      }
      
      // Verify the entry belongs to the user (skip check for anonymous users in deployment)
      const userId = req.user?.claims?.sub || 'anonymous-user';
      if (req.user && entry.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Get weight entry error:", error);
      res.status(500).json({ error: "Failed to retrieve weight entry" });
    }
  });

  app.patch("/api/weights/:id", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || 'anonymous-user';
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

  app.delete("/api/weights/:id", authMiddleware, async (req: any, res) => {
    try {
      // In deployment without auth, use anonymous user ID
      const userId = req.user?.claims?.sub || 'anonymous-user';
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

  // Nutrition goals routes (protected in dev, open in deployment)
  app.get("/api/nutrition-goals", authMiddleware, async (req: any, res) => {
    try {
      // In deployment without auth, use anonymous user ID
      const userId = req.user?.claims?.sub || 'anonymous-user';
      const goals = await storage.getNutritionGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Get nutrition goals error:", error);
      res.status(500).json({ error: "Failed to retrieve nutrition goals" });
    }
  });

  app.post("/api/nutrition-goals", authMiddleware, async (req: any, res) => {
    try {
      // In deployment without auth, use anonymous user ID
      const userId = req.user?.claims?.sub || 'anonymous-user';
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
  app.get("/api/user-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.post("/api/user-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Daily coaching endpoints
  app.get('/api/coaching/daily', isAuthenticated, async (req: any, res) => {
    try {
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

  app.post('/api/coaching/generate', isAuthenticated, async (req: any, res) => {
    try {
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

  // Recipe routes
  app.get("/api/recipes", async (req, res) => {
    try {
      const dietaryFilter = req.query.diet as string || "";
      
      try {
        const recipes = await aiManager.generateRecipes(dietaryFilter);
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

  // Dynamic recipe route for diet filtering
  app.get("/api/recipes/:diet?/:search?", async (req, res) => {
    try {
      const { diet, search } = req.params;
      const dietaryFilter = diet || "";
      
      try {
        const recipes = await aiManager.generateRecipes(dietaryFilter);
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

  const httpServer = createServer(app);
  return httpServer;
}
