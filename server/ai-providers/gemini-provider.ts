import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import { AIProvider, FoodAnalysisResult, DietAdviceResult, DiaryEntry, ProviderError } from "./types";

export class GeminiProvider extends AIProvider {
  public readonly name = "Gemini";
  public readonly priority = 2; // Secondary priority
  public readonly maxRetries = 2;

  private client: GoogleGenAI;

  constructor() {
    super();
    this.client = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "" 
    });
  }

  async analyzeFoodImage(imagePath: string): Promise<FoodAnalysisResult> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      // Read image file
      const imageBytes = await fs.readFile(imagePath);
      
      const contents = [
        {
          inlineData: {
            data: imageBytes.toString("base64"),
            mimeType: "image/jpeg",
          },
        },
        `Analyze this food image and identify all visible food items. For each food item, estimate the portion size and provide nutritional information (calories, protein, carbs, fat in grams). 

Return the response as a JSON object with this exact structure:
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

Be as accurate as possible with portion estimates and nutritional values. If you can't clearly identify something, don't include it. Use standard USDA nutritional values. Only return the JSON object, no additional text.`,
      ];

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error("No response from Gemini");
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
        throw new Error("Invalid response format from Gemini");
      }

      // Calculate totals
      const totalCalories = parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.calories || 0), 0);
      const totalProtein = parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.protein || 0), 0);
      const totalCarbs = parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.carbs || 0), 0);
      const totalFat = parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.fat || 0), 0);

      const result: FoodAnalysisResult = {
        imageUrl: imagePath,
        confidence: parsed.confidence || 80,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        detectedFoods: parsed.detectedFoods
      };

      this.recordSuccess();
      return result;

    } catch (error: any) {
      console.error("Gemini food analysis error:", error);
      
      let providerError: ProviderError;
      
      if (error?.message?.includes('quota') || error?.message?.includes('rate')) {
        providerError = this.createError(
          'RATE_LIMIT',
          'Gemini rate limit exceeded',
          true,
          true,
          120 // Retry after 2 minutes
        );
      } else if (error?.message?.includes('GEMINI_API_KEY')) {
        providerError = this.createError(
          'CONFIG_ERROR',
          'Gemini API key not configured',
          false,
          false
        );
      } else {
        providerError = this.createError(
          'ANALYSIS_ERROR',
          `Gemini analysis failed: ${error.message}`,
          false,
          true,
          60
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  async generateDietAdvice(entries: DiaryEntry[]): Promise<DietAdviceResult> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

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
      }, {} as Record<string, number>);

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

      const systemPrompt = `You are a certified nutritionist and diet advisor. 
Analyze the user's eating patterns and provide helpful, personalized advice.
Respond with JSON in this format: 
{
  "personalizedAdvice": ["advice based on specific patterns..."],
  "nutritionGoals": ["specific goals to work towards..."],
  "improvements": ["areas where can improve..."],
  "generalTips": ["helpful nutrition tips..."]
}

Keep each array item to 1-2 sentences. Be encouraging and specific. Focus on practical, actionable advice.`;

      const userPrompt = `Analyze my eating patterns and provide diet advice. Here's my data from the last 30 days:

${JSON.stringify(analysisData, null, 2)}`;

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              personalizedAdvice: { type: "array", items: { type: "string" } },
              nutritionGoals: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } },
              generalTips: { type: "array", items: { type: "string" } },
            },
            required: ["personalizedAdvice", "nutritionGoals", "improvements", "generalTips"],
          },
        },
        contents: userPrompt,
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error("No response from Gemini");
      }

      const adviceData = JSON.parse(responseText);
      
      this.recordSuccess();
      return adviceData;

    } catch (error: any) {
      console.error("Gemini diet advice error:", error);
      
      let providerError: ProviderError;
      
      if (error?.message?.includes('quota') || error?.message?.includes('rate')) {
        providerError = this.createError(
          'RATE_LIMIT',
          'Gemini rate limit exceeded',
          true,
          true,
          120
        );
      } else if (error?.message?.includes('GEMINI_API_KEY')) {
        providerError = this.createError(
          'CONFIG_ERROR',
          'Gemini API key not configured',
          false,
          false
        );
      } else {
        providerError = this.createError(
          'ADVICE_ERROR',
          `Gemini advice generation failed: ${error.message}`,
          false,
          true,
          60
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }
}