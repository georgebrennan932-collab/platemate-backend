import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodAnalysisSchema, insertDiaryEntrySchema } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { aiManager } from "./ai-providers/ai-manager";

// Configure multer for image uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Analyze food image
  app.post("/api/analyze", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Validate and process image with Sharp for optimization
      const processedImagePath = `uploads/processed_${req.file.filename}.jpg`;
      
      try {
        // First validate the image by attempting to get metadata
        await sharp(req.file.path).metadata();
        
        // If validation passes, process the image (smaller size to reduce tokens)
        await sharp(req.file.path)
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toFile(processedImagePath);
      } catch (sharpError) {
        console.error("Image processing error:", sharpError);
        
        // Clean up the original file before returning error
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error cleaning up original file:", unlinkError);
        }
        
        return res.status(400).json({ 
          error: "Invalid image file. Please upload a valid JPEG or PNG image." 
        });
      }

      // Clean up original file after successful processing
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up original file:", unlinkError);
        // Don't fail the request if cleanup fails
      }

      // Real food recognition and nutrition analysis using multi-AI provider system
      const foodAnalysisData = await aiManager.analyzeFoodImage(processedImagePath);

      const analysis = await storage.createFoodAnalysis(foodAnalysisData);

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze image" });
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

  // Diary routes
  app.post("/api/diary", async (req, res) => {
    try {
      const validatedEntry = insertDiaryEntrySchema.parse(req.body);
      const diaryEntry = await storage.createDiaryEntry(validatedEntry);
      res.json(diaryEntry);
    } catch (error) {
      console.error("Create diary entry error:", error);
      res.status(400).json({ error: "Invalid diary entry data" });
    }
  });

  app.get("/api/diary", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const entries = await storage.getDiaryEntries(limit);
      res.json(entries);
    } catch (error) {
      console.error("Get diary entries error:", error);
      res.status(500).json({ error: "Failed to retrieve diary entries" });
    }
  });

  app.get("/api/diary/:id", async (req, res) => {
    try {
      const entry = await storage.getDiaryEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Diary entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Get diary entry error:", error);
      res.status(500).json({ error: "Failed to retrieve diary entry" });
    }
  });

  app.delete("/api/diary/:id", async (req, res) => {
    try {
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

  // Diet advice routes
  app.get("/api/diet-advice", async (req, res) => {
    try {
      const entries = await storage.getDiaryEntries(30); // Get last 30 entries
      if (!entries || entries.length === 0) {
        return res.json({
          personalizedAdvice: [],
          nutritionGoals: [],
          improvements: [],
          generalTips: []
        });
      }

      // Analyze the data and provide advice using multi-AI provider system
      const advice = await aiManager.generateDietAdvice(entries);
      res.json(advice);
    } catch (error) {
      console.error("Get diet advice error:", error);
      res.status(500).json({ error: "Failed to retrieve diet advice" });
    }
  });

  app.post("/api/diet-advice/generate", async (req, res) => {
    try {
      const entries = await storage.getDiaryEntries(30);
      if (!entries || entries.length === 0) {
        return res.json({
          personalizedAdvice: ["Start tracking your meals to get personalized advice!"],
          nutritionGoals: ["Add meals to your diary to set nutrition goals"],
          improvements: [],
          generalTips: []
        });
      }

      const advice = await aiManager.generateDietAdvice(entries);
      res.json(advice);
    } catch (error) {
      console.error("Generate diet advice error:", error);
      res.status(500).json({ error: "Failed to generate diet advice" });
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

  const httpServer = createServer(app);
  return httpServer;
}
