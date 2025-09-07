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

// Mock food analysis function with varied results
// In production, this would integrate with computer vision APIs
async function performFoodAnalysis(imagePath: string) {
  // Simulate API processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Different meal combinations to simulate realistic food detection
  const mealCombinations = [
    // Breakfast options
    [
      { name: "Scrambled Eggs", portion: "~2 large eggs", calories: 180, protein: 14, carbs: 2, fat: 12, icon: "egg" },
      { name: "Bacon", portion: "~3 strips", calories: 135, protein: 9, carbs: 1, fat: 10, icon: "bacon" },
      { name: "Whole Wheat Toast", portion: "~1 slice", calories: 85, protein: 3, carbs: 15, fat: 1, icon: "bread-slice" }
    ],
    [
      { name: "Oatmeal", portion: "~1 cup", calories: 150, protein: 5, carbs: 27, fat: 3, icon: "apple-alt" },
      { name: "Banana", portion: "~1 medium", calories: 105, protein: 1, carbs: 27, fat: 0, icon: "apple-alt" },
      { name: "Greek Yogurt", portion: "~1/2 cup", calories: 130, protein: 15, carbs: 9, fat: 6, icon: "egg" }
    ],
    [
      { name: "Pancakes", portion: "~2 medium", calories: 220, protein: 6, carbs: 28, fat: 9, icon: "bread-slice" },
      { name: "Blueberries", portion: "~1/2 cup", calories: 42, protein: 1, carbs: 11, fat: 0, icon: "apple-alt" },
      { name: "Maple Syrup", portion: "~2 tbsp", calories: 104, protein: 0, carbs: 27, fat: 0, icon: "apple-alt" }
    ],
    // Lunch options
    [
      { name: "Grilled Chicken", portion: "~4 oz", calories: 185, protein: 35, carbs: 0, fat: 4, icon: "egg" },
      { name: "Brown Rice", portion: "~1/2 cup", calories: 110, protein: 3, carbs: 23, fat: 1, icon: "bread-slice" },
      { name: "Mixed Vegetables", portion: "~1 cup", calories: 50, protein: 2, carbs: 10, fat: 0, icon: "apple-alt" }
    ],
    [
      { name: "Turkey Sandwich", portion: "~1 sandwich", calories: 320, protein: 25, carbs: 30, fat: 12, icon: "bread-slice" },
      { name: "Apple Slices", portion: "~1 medium apple", calories: 95, protein: 0, carbs: 25, fat: 0, icon: "apple-alt" },
      { name: "Chips", portion: "~1 oz", calories: 150, protein: 2, carbs: 15, fat: 10, icon: "bread-slice" }
    ],
    [
      { name: "Caesar Salad", portion: "~2 cups", calories: 170, protein: 6, carbs: 8, fat: 14, icon: "apple-alt" },
      { name: "Grilled Salmon", portion: "~3 oz", calories: 175, protein: 25, carbs: 0, fat: 8, icon: "egg" },
      { name: "Dinner Roll", portion: "~1 roll", calories: 90, protein: 3, carbs: 15, fat: 2, icon: "bread-slice" }
    ],
    // Dinner options
    [
      { name: "Spaghetti", portion: "~1 cup", calories: 200, protein: 7, carbs: 40, fat: 1, icon: "bread-slice" },
      { name: "Meat Sauce", portion: "~1/2 cup", calories: 140, protein: 12, carbs: 8, fat: 7, icon: "egg" },
      { name: "Garlic Bread", portion: "~1 slice", calories: 150, protein: 4, carbs: 20, fat: 6, icon: "bread-slice" }
    ],
    [
      { name: "Grilled Steak", portion: "~5 oz", calories: 250, protein: 26, carbs: 0, fat: 15, icon: "egg" },
      { name: "Baked Potato", portion: "~1 medium", calories: 160, protein: 4, carbs: 37, fat: 0, icon: "apple-alt" },
      { name: "Green Beans", portion: "~1 cup", calories: 35, protein: 2, carbs: 8, fat: 0, icon: "apple-alt" }
    ],
    // Snack options
    [
      { name: "Peanut Butter", portion: "~2 tbsp", calories: 190, protein: 8, carbs: 8, fat: 16, icon: "egg" },
      { name: "Whole Grain Crackers", portion: "~10 crackers", calories: 130, protein: 3, carbs: 19, fat: 5, icon: "bread-slice" }
    ],
    [
      { name: "Mixed Nuts", portion: "~1/4 cup", calories: 170, protein: 6, carbs: 6, fat: 15, icon: "egg" },
      { name: "Dried Fruit", portion: "~2 tbsp", calories: 85, protein: 1, carbs: 22, fat: 0, icon: "apple-alt" }
    ]
  ];

  // Randomly select a meal combination
  const selectedMeal = mealCombinations[Math.floor(Math.random() * mealCombinations.length)];
  
  // Add some variation to portions and calories (±10%)
  const variationFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
  const mockDetectedFoods = selectedMeal.map(food => ({
    ...food,
    calories: Math.round(food.calories * variationFactor),
    protein: Math.round(food.protein * variationFactor),
    carbs: Math.round(food.carbs * variationFactor),
    fat: Math.round(food.fat * variationFactor)
  }));

  const totalCalories = mockDetectedFoods.reduce((sum, food) => sum + food.calories, 0);
  const totalProtein = mockDetectedFoods.reduce((sum, food) => sum + food.protein, 0);
  const totalCarbs = mockDetectedFoods.reduce((sum, food) => sum + food.carbs, 0);
  const totalFat = mockDetectedFoods.reduce((sum, food) => sum + food.fat, 0);

  return {
    imageUrl: imagePath,
    confidence: Math.floor(Math.random() * 15) + 85, // 85-99%
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    detectedFoods: mockDetectedFoods
  };
}
