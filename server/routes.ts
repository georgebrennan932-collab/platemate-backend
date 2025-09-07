import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodAnalysisSchema, insertDiaryEntrySchema } from "@shared/schema";
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

      // Analyze the data and provide advice
      const advice = await generateDietAdvice(entries);
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

      const advice = await generateDietAdvice(entries);
      res.json(advice);
    } catch (error) {
      console.error("Generate diet advice error:", error);
      res.status(500).json({ error: "Failed to generate diet advice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Generate diet advice using OpenAI
async function generateDietAdvice(entries: any[]) {
  try {
    // Analyze eating patterns
    const totalEntries = entries.length;
    const totalCalories = entries.reduce((sum, entry) => sum + (entry.analysis?.totalCalories || 0), 0);
    const avgCalories = totalCalories / totalEntries;
    
    const totalProtein = entries.reduce((sum, entry) => sum + (entry.analysis?.totalProtein || 0), 0);
    const totalCarbs = entries.reduce((sum, entry) => sum + (entry.analysis?.totalCarbs || 0), 0);
    const totalFat = entries.reduce((sum, entry) => sum + (entry.analysis?.totalFat || 0), 0);
    
    // Count meal types
    const mealTypeCounts = entries.reduce((counts, entry) => {
      counts[entry.mealType] = (counts[entry.mealType] || 0) + 1;
      return counts;
    }, {});

    const analysisData = {
      totalMeals: totalEntries,
      averageCalories: Math.round(avgCalories),
      totalNutrients: {
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat)
      },
      mealPattern: mealTypeCounts,
      recentFoods: entries.slice(0, 10).map(entry => 
        entry.analysis?.detectedFoods?.map((food: any) => food.name).join(', ') || 'Unknown'
      ).filter(Boolean)
    };

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a certified nutritionist and diet advisor. Analyze the user's eating patterns and provide helpful, personalized advice."
        },
        {
          role: "user",
          content: `Analyze my eating patterns and provide diet advice. Here's my data from the last 30 days:

${JSON.stringify(analysisData, null, 2)}

Please provide advice in the following JSON format:
{
  "personalizedAdvice": ["advice based on my specific patterns..."],
  "nutritionGoals": ["specific goals I should work towards..."],
  "improvements": ["areas where I can improve..."],
  "generalTips": ["helpful nutrition tips..."]
}

Keep each array item to 1-2 sentences. Be encouraging and specific. Focus on practical, actionable advice.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const adviceData = JSON.parse(response.choices[0].message.content || '{}');
    return adviceData;
  } catch (error) {
    console.error("Error generating diet advice:", error);
    // Return fallback advice if AI fails
    return {
      personalizedAdvice: [
        "Keep tracking your meals to understand your eating patterns better.",
        "Focus on maintaining consistent meal timing throughout the day."
      ],
      nutritionGoals: [
        "Aim for balanced meals with protein, healthy fats, and complex carbs.",
        "Include 5-7 servings of fruits and vegetables daily."
      ],
      improvements: [
        "Consider adding more variety to your food choices.",
        "Stay hydrated by drinking water throughout the day."
      ],
      generalTips: [
        "Plan your meals ahead to make healthier choices.",
        "Listen to your body's hunger and fullness cues."
      ]
    };
  }
}

// Real food analysis function using OpenAI Vision API
async function performRealFoodAnalysis(imagePath: string) {
  try {
    // Convert image to base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg';
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

    const responseText = response.choices[0].message.content;
    
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    // Clean the response text by removing markdown formatting
    const cleanedText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Parse the JSON response
    const parsed = JSON.parse(cleanedText);
    
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

  } catch (error: any) {
    console.error("Error analyzing food with OpenAI:", error);
    
    // Check if it's a rate limit error
    if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
      return {
        imageUrl: imagePath,
        confidence: 0,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        detectedFoods: [
          {
            name: "Rate Limit Reached",
            portion: "OpenAI API limit exceeded",
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            icon: "apple-alt"
          }
        ]
      };
    }
    
    // Fallback for other errors
    return {
      imageUrl: imagePath,
      confidence: 50,
      totalCalories: 250,
      totalProtein: 12,
      totalCarbs: 25,
      totalFat: 10,
      detectedFoods: [
        {
          name: "Analysis Error",
          portion: "Could not process image",
          calories: 250,
          protein: 12,
          carbs: 25,
          fat: 10,
          icon: "apple-alt"
        }
      ]
    };
  }
}
