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

      // Calculate totals and round to integers for database compatibility
      const totalCalories = Math.round(parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.calories || 0), 0));
      const totalProtein = Math.round(parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.protein || 0), 0));
      const totalCarbs = Math.round(parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.carbs || 0), 0));
      const totalFat = Math.round(parsed.detectedFoods.reduce((sum: number, food: any) => sum + (food.fat || 0), 0));

      // Round nutritional values in detected foods
      const roundedDetectedFoods = parsed.detectedFoods.map((food: any) => ({
        ...food,
        calories: Math.round(food.calories || 0),
        protein: Math.round(food.protein || 0),
        carbs: Math.round(food.carbs || 0),
        fat: Math.round(food.fat || 0)
      }));

      const result: FoodAnalysisResult = {
        imageUrl: imagePath,
        confidence: Math.round(parsed.confidence || 80),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        detectedFoods: roundedDetectedFoods
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
Analyze the user's eating patterns and provide helpful, personalized advice including specific meal ideas tailored to their individual needs.
Respond with JSON in this format: 
{
  "personalizedAdvice": ["advice based on specific patterns..."],
  "nutritionGoals": ["specific goals to work towards..."],
  "improvements": ["areas where can improve..."],
  "generalTips": ["helpful nutrition tips..."],
  "mealIdeas": [
    {
      "mealType": "breakfast/lunch/dinner/snack",
      "name": "Meal Name",
      "description": "Brief description of the meal",
      "calories": 400,
      "protein": 25,
      "carbs": 35,
      "fat": 15,
      "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
      "benefits": "Why this meal is good for the user based on their patterns"
    }
  ]
}

Generate 4-6 meal ideas that address the user's specific nutritional needs, deficiencies, or goals based on their eating patterns. Include a variety of meal types (breakfast, lunch, dinner, snacks). Keep advice items to 1-2 sentences. Be encouraging and specific. Focus on practical, actionable advice.`;

      const userPrompt = `Analyze my eating patterns and provide diet advice with personalized meal ideas. Here's my data from the last 30 days:

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
              mealIdeas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                    name: { type: "string" },
                    description: { type: "string" },
                    calories: { type: "number" },
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fat: { type: "number" },
                    ingredients: { type: "array", items: { type: "string" } },
                    benefits: { type: "string" }
                  },
                  required: ["mealType", "name", "description", "calories", "protein", "carbs", "fat", "ingredients", "benefits"]
                }
              }
            },
            required: ["personalizedAdvice", "nutritionGoals", "improvements", "generalTips", "mealIdeas"],
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

  private prepareNutritionContextData(entries: DiaryEntry[]) {
    if (!entries || entries.length === 0) {
      return "No recent meal data available.";
    }

    const summary = {
      totalMeals: entries.length,
      recentMeals: entries.slice(0, 10).map(entry => ({
        date: entry.createdAt.toISOString().split('T')[0],
        mealType: entry.mealType,
        calories: entry.analysis?.totalCalories || 0,
        protein: entry.analysis?.totalProtein || 0,
        carbs: entry.analysis?.totalCarbs || 0,
        fat: entry.analysis?.totalFat || 0,
        foods: entry.analysis?.detectedFoods?.map(f => f.name).join(', ') || 'Unknown'
      })),
      averageDaily: {
        calories: Math.round(entries.reduce((sum, e) => sum + (e.analysis?.totalCalories || 0), 0) / Math.max(entries.length, 1)),
        protein: Math.round(entries.reduce((sum, e) => sum + (e.analysis?.totalProtein || 0), 0) / Math.max(entries.length, 1)),
        carbs: Math.round(entries.reduce((sum, e) => sum + (e.analysis?.totalCarbs || 0), 0) / Math.max(entries.length, 1)),
        fat: Math.round(entries.reduce((sum, e) => sum + (e.analysis?.totalFat || 0), 0) / Math.max(entries.length, 1))
      }
    };

    return JSON.stringify(summary, null, 2);
  }

  async answerNutritionQuestion(question: string, entries: DiaryEntry[]): Promise<string> {
    try {
      // Prepare context from user's nutrition data
      const contextData = this.prepareNutritionContextData(entries);
      
      const systemPrompt = `You are PlateMate's AI nutrition assistant. Answer the user's nutrition question based on their eating patterns and provide personalized, helpful advice. Be conversational but informative.

User's Recent Nutrition Data:
${JSON.stringify(contextData, null, 2)}

Guidelines:
- Provide personalized advice based on their actual eating patterns
- Be encouraging and supportive
- Give practical, actionable recommendations
- If the question requires medical advice, recommend consulting a healthcare professional
- Keep responses focused and helpful (200-300 words max)
- Use a friendly, conversational tone`;

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
        },
        contents: question,
      });

      const answer = response.text || "I'm sorry, I couldn't generate a response to your question right now.";
      
      this.recordSuccess();
      return answer;

    } catch (error: any) {
      console.error("Gemini question answering error:", error);
      
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
          'QUESTION_ERROR',
          `Gemini question answering failed: ${error.message}`,
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