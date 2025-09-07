import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodAnalysisSchema } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

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
        
        // If validation passes, process the image
        await sharp(req.file.path)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
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

      // Mock food recognition and nutrition analysis
      // In production, this would call external APIs like Clarifai, Google Vision, or Edamam
      const mockAnalysis = await performFoodAnalysis(processedImagePath);

      const analysis = await storage.createFoodAnalysis(mockAnalysis);

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

  const httpServer = createServer(app);
  return httpServer;
}

// Mock food analysis function
// In production, this would integrate with computer vision APIs
async function performFoodAnalysis(imagePath: string) {
  // Simulate API processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock detected foods - in production this would come from CV API
  const mockDetectedFoods = [
    {
      name: "Scrambled Eggs",
      portion: "~2 large eggs",
      calories: 180,
      protein: 14,
      carbs: 2,
      fat: 12,
      icon: "egg"
    },
    {
      name: "Bacon",
      portion: "~3 strips",
      calories: 135,
      protein: 9,
      carbs: 1,
      fat: 10,
      icon: "bacon"
    },
    {
      name: "Whole Wheat Toast",
      portion: "~1 slice",
      calories: 85,
      protein: 3,
      carbs: 15,
      fat: 1,
      icon: "bread-slice"
    },
    {
      name: "Mixed Berries",
      portion: "~1/2 cup",
      calories: 85,
      protein: 2,
      carbs: 20,
      fat: 0,
      icon: "apple-alt"
    }
  ];

  const totalCalories = mockDetectedFoods.reduce((sum, food) => sum + food.calories, 0);
  const totalProtein = mockDetectedFoods.reduce((sum, food) => sum + food.protein, 0);
  const totalCarbs = mockDetectedFoods.reduce((sum, food) => sum + food.carbs, 0);
  const totalFat = mockDetectedFoods.reduce((sum, food) => sum + food.fat, 0);

  return {
    imageUrl: imagePath,
    confidence: Math.floor(Math.random() * 10) + 90, // 90-99%
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    detectedFoods: mockDetectedFoods
  };
}
