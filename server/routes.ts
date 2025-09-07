import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodAnalysisSchema } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import OpenAI from "openai";

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

      // Real food recognition and nutrition analysis using OpenAI Vision
      const foodAnalysisData = await performRealFoodAnalysis(processedImagePath);

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

  const httpServer = createServer(app);
  return httpServer;
}

// Real food analysis function using OpenAI Vision API
async function performRealFoodAnalysis(imagePath: string) {
  try {
    console.log("Starting food analysis for image:", imagePath);
    console.log("OpenAI API Key available:", !!process.env.OPENAI_API_KEY);
    
    // Convert image to base64
    const imageBuffer = await fs.readFile(imagePath);
    console.log("Image buffer size:", imageBuffer.length);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg';
    console.log("Image converted to base64, length:", base64Image.length);

    console.log("Making OpenAI API call...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this food image and identify all visible food items. For each food item, estimate the portion size and provide nutritional information (calories, protein, carbs, fat in grams). Return the response as a JSON object with this exact structure:

{
  "confidence": number (0-100),
  "detectedFoods": [
    {
      "name": "Food Name",
      "portion": "estimated portion size",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "icon": "appropriate icon name from: egg, bacon, bread-slice, apple-alt"
    }
  ]
}

Be as accurate as possible with portion estimates and nutritional values. If you can't clearly identify something, don't include it. Use standard USDA nutritional values.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    console.log("OpenAI API call completed successfully");
    const responseText = response.choices[0].message.content;
    console.log("Raw response from OpenAI:", responseText);
    
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    // Clean the response text by removing markdown formatting
    const cleanedText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    console.log("Cleaned response text:", cleanedText);

    // Parse the JSON response
    const parsed = JSON.parse(cleanedText);
    console.log("Parsed response:", parsed);
    
    // Validate the response structure
    if (!parsed.detectedFoods || !Array.isArray(parsed.detectedFoods)) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Calculate totals
    const totalCalories = parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.calories || 0), 0);
    const totalProtein = parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.protein || 0), 0);
    const totalCarbs = parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.carbs || 0), 0);
    const totalFat = parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.fat || 0), 0);

    return {
      imageUrl: imagePath,
      confidence: parsed.confidence || 85,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      detectedFoods: parsed.detectedFoods
    };

  } catch (error) {
    console.error("Error analyzing food with OpenAI:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    
    // Fallback to a basic response if AI fails
    return {
      imageUrl: imagePath,
      confidence: 50,
      totalCalories: 300,
      totalProtein: 15,
      totalCarbs: 30,
      totalFat: 12,
      detectedFoods: [
        {
          name: "AI Analysis Failed",
          portion: "Error occurred",
          calories: 300,
          protein: 15,
          carbs: 30,
          fat: 12,
          icon: "apple-alt"
        }
      ]
    };
  }
}
