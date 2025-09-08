import OpenAI from "openai";
import { promises as fs } from "fs";
import { AIProvider, FoodAnalysisResult, DietAdviceResult, DiaryEntry, ProviderError } from "./types";

export class OpenAIProvider extends AIProvider {
  public readonly name = "OpenAI";
  public readonly priority = 1; // Highest priority
  public readonly maxRetries = 2;

  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeFoodImage(imagePath: string): Promise<FoodAnalysisResult> {
    try {
      // Convert image to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = 'image/jpeg';

      const response = await this.client.chat.completions.create({
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
        confidence: Math.round(parsed.confidence || 85),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        detectedFoods: roundedDetectedFoods
      };

      this.recordSuccess();
      return result;

    } catch (error: any) {
      console.error("OpenAI food analysis error:", error);
      
      let providerError: ProviderError;
      
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        providerError = this.createError(
          'RATE_LIMIT',
          'OpenAI rate limit exceeded',
          true,
          true,
          60 // Retry after 1 minute
        );
      } else if (error?.status >= 500) {
        providerError = this.createError(
          'SERVER_ERROR',
          `OpenAI server error: ${error.message}`,
          false,
          true,
          30
        );
      } else {
        providerError = this.createError(
          'ANALYSIS_ERROR',
          `OpenAI analysis failed: ${error.message}`,
          false,
          false
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  async generateDietAdvice(entries: DiaryEntry[]): Promise<DietAdviceResult> {
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

      const response = await this.client.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a certified nutritionist and diet advisor. Analyze the user's eating patterns and provide helpful, personalized advice including specific meal ideas tailored to their individual needs."
          },
          {
            role: "user",
            content: `Analyze my eating patterns and provide diet advice with personalized meal ideas. Here's my data from the last 30 days:

${JSON.stringify(analysisData, null, 2)}

Please provide advice in the following JSON format:
{
  "personalizedAdvice": ["advice based on my specific patterns..."],
  "nutritionGoals": ["specific goals I should work towards..."],
  "improvements": ["areas where I can improve..."],
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

Generate 4-6 meal ideas that address the user's specific nutritional needs, deficiencies, or goals based on their eating patterns. Include a variety of meal types (breakfast, lunch, dinner, snacks). Keep advice items to 1-2 sentences. Be encouraging and specific. Focus on practical, actionable advice.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const adviceData = JSON.parse(response.choices[0].message.content || '{}');
      
      this.recordSuccess();
      return adviceData;

    } catch (error: any) {
      console.error("OpenAI diet advice error:", error);
      
      let providerError: ProviderError;
      
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        providerError = this.createError(
          'RATE_LIMIT',
          'OpenAI rate limit exceeded',
          true,
          true,
          60
        );
      } else if (error?.status >= 500) {
        providerError = this.createError(
          'SERVER_ERROR',
          `OpenAI server error: ${error.message}`,
          false,
          true,
          30
        );
      } else {
        providerError = this.createError(
          'ADVICE_ERROR',
          `OpenAI advice generation failed: ${error.message}`,
          false,
          false
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  async answerNutritionQuestion(question: string, entries: DiaryEntry[]): Promise<string> {
    try {
      // Prepare context from user's nutrition data
      const contextData = this.prepareAnalysisData(entries);
      
      const response = await this.client.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are PlateMate's AI nutrition assistant. Answer the user's nutrition question based on their eating patterns and provide personalized, helpful advice. Be conversational but informative.

User's Recent Nutrition Data:
${contextData}

Guidelines:
- Provide personalized advice based on their actual eating patterns
- Be encouraging and supportive
- Give practical, actionable recommendations
- If the question requires medical advice, recommend consulting a healthcare professional
- Keep responses focused and helpful (200-300 words max)
- Use a friendly, conversational tone`
          },
          {
            role: "user",
            content: question
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const answer = response.choices[0].message.content || "I'm sorry, I couldn't generate a response to your question right now.";
      
      this.recordSuccess();
      return answer;

    } catch (error: any) {
      console.error("OpenAI question answering error:", error);
      
      let providerError: ProviderError;
      
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        providerError = this.createError(
          'RATE_LIMIT',
          'OpenAI rate limit exceeded',
          true,
          true,
          60
        );
      } else if (error?.status >= 500) {
        providerError = this.createError(
          'SERVER_ERROR',
          `OpenAI server error: ${error.message}`,
          false,
          true,
          30
        );
      } else {
        providerError = this.createError(
          'QUESTION_ERROR',
          `OpenAI question answering failed: ${error.message}`,
          false,
          false
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }
}