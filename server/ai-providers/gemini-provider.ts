import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import { AIProvider, FoodAnalysisResult, FoodDetectionResult, DietAdviceResult, DiaryEntry, ProviderError, DailyCoaching, EducationalTip } from "./types";
import { mapUKFoodTerms } from "../uk-food-mapping";

export class GeminiProvider extends AIProvider {
  public readonly name = "Gemini";
  public readonly priority = 1; // Highest priority (free, unlimited)
  public readonly maxRetries = 2;

  private client: GoogleGenAI;

  constructor() {
    super();
    this.client = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "" 
    });
  }

  async performHealthCheck(): Promise<any> {
    const startTime = Date.now();
    
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Health check",
      });

      const responseTime = Date.now() - startTime;
      
      return {
        providerName: this.name,
        healthy: true,
        responseTime,
        timestamp: new Date(),
        details: {
          model: "gemini-2.5-flash",
          apiVersion: "1.0"
        }
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        providerName: this.name,
        healthy: false,
        responseTime,
        error: error.message,
        timestamp: new Date()
      };
    }
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
        `Analyze this food image and identify all visible food items with high accuracy. Focus on recognizing common meals, dishes, and ingredients that people typically eat.

IMPORTANT: Look for reference objects in the image to help estimate scale and portion sizes:
- Plate, bowl, or dish (standard dinner plate = 10-12 inches)
- Utensils (fork = 7 inches, spoon = 6 inches)  
- Hand or fingers for scale
- Common objects like coins, phones, etc.

CRITICAL UK FOOD PORTIONS:
- UK crisps/chips: Single-serve packets are typically 25g (NOT 30g). Use "25g" for standard crisp packets.
- If you see a crisp packet, bag, or single-serve portion, estimate as "25g" unless it's clearly a sharing size.
- Common UK crisp flavors (Ready Salted, Cheese & Onion, Salt & Vinegar, Prawn Cocktail) are typically 25g packets.

PROTEIN SHAKES & SUPPLEMENTS (CRITICAL):
- Protein shakes, Herbalife, protein powder, BCAAs, pre-workout drinks are made with WATER (not milk) unless milk is explicitly visible
- If you see protein powder/shake but no milk carton/bottle in the image, assume it's made with water
- Examples: "Herbalife shake made with water", "protein powder with water", "BCAA drink"
- Only specify "made with milk" if you can actually see milk being used in the image

Guidelines for accurate food identification:
- Focus on identifying actual food items, not random objects
- Look for typical breakfast, lunch, dinner, or snack foods
- Consider the context - is this a meal photo, home cooking, restaurant food?
- If something looks unclear, err on the side of common foods rather than exotic items
- Only identify foods you can clearly see and recognize

For each food item detected, provide ONLY the food name and estimated portion - DO NOT include nutritional information as we will look that up from the USDA database for accuracy.

Return the response as a JSON object with this exact structure:

{
  "confidence": number (0-100),
  "referenceObjects": ["list of reference objects spotted for scale estimation"],
  "detectedFoods": [
    {
      "name": "Food Name",
      "portion": "estimated portion size with weight/volume",
      "icon": "appropriate icon name from: egg, bacon, bread-slice, apple-alt"
    }
  ]
}

Focus on accurate food identification and portion estimation using any reference objects you can see. Be specific with portions (e.g., "100g", "1 medium slice", "150ml", "25g" for UK crisps). Only return the JSON object, no additional text.`,
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

      // Convert to legacy format with mock nutrition - will be replaced by USDA lookup
      const mockNutritionFoods = parsed.detectedFoods.map((food: any) => ({
        name: food.name,
        portion: food.portion,
        calories: 100, // Mock - will be replaced by USDA lookup
        protein: 5,
        carbs: 10,
        fat: 3,
        icon: food.icon
      }));

      // Calculate totals from mock data
      const totalCalories = mockNutritionFoods.reduce((sum: number, food: any) => sum + food.calories, 0);
      const totalProtein = mockNutritionFoods.reduce((sum: number, food: any) => sum + food.protein, 0);
      const totalCarbs = mockNutritionFoods.reduce((sum: number, food: any) => sum + food.carbs, 0);
      const totalFat = mockNutritionFoods.reduce((sum: number, food: any) => sum + food.fat, 0);

      const result: FoodAnalysisResult = {
        imageUrl: imagePath,
        confidence: Math.round(parsed.confidence || 80),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        detectedFoods: mockNutritionFoods,
        // Store reference objects in a custom property for now
        referenceObjects: parsed.referenceObjects || []
      } as any;

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

  async detectFoodNames(imagePath: string): Promise<FoodDetectionResult> {
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
        `Analyze this food image and identify all visible food items. Return ONLY the food names, separated by commas.

Examples:
- "banana, chicken breast, broccoli"
- "pizza, salad"
- "rice, beans, grilled chicken"

DO NOT provide nutrition information, portions, or any other details. Only return the food names as a simple comma-separated list.

If you can't clearly identify something, don't include it. Be as accurate as possible with food identification.`,
      ];

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error("No response from Gemini");
      }

      console.log(`🤖 Gemini detected food names: ${responseText}`);

      // Parse the comma-separated food names
      const detectedFoodNames = responseText
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      const result: FoodDetectionResult = {
        confidence: 80, // Default confidence for food detection
        detectedFoodNames
      };

      this.recordSuccess();
      return result;

    } catch (error: any) {
      console.error("Gemini food detection error:", error);
      
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
          'DETECTION_ERROR',
          `Gemini food detection failed: ${error.message}`,
          false,
          true,
          60
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  async analyzeFoodText(foodDescription: string, clientTimeInfo?: { timeString: string, timeOfDay: string, hours: number, minutes: number }): Promise<FoodAnalysisResult> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      // Apply UK to US food term mapping BEFORE sending to AI
      const mappedDescription = mapUKFoodTerms(foodDescription);

      // Add time context for better analysis (use client's local time if provided, otherwise server time)
      let timeString: string;
      let timeOfDay: string;
      
      if (clientTimeInfo) {
        // Use pre-calculated client local time (no timezone conversion needed)
        timeString = clientTimeInfo.timeString;
        timeOfDay = clientTimeInfo.timeOfDay;
      } else {
        // Fallback to server time
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        timeOfDay = hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening';
      }

      const prompt = `Current time: ${timeString} (${timeOfDay})

Analyze this food description and extract nutritional information. Parse the quantity, unit, and food name from: "${mappedDescription}"

CRITICAL FOOD INTERPRETATION RULES:
- "rice" = cooked white/brown rice (NOT rice paper, rice cakes, or rice noodles)
- "chicken" = grilled/baked chicken breast unless specified otherwise
- "beef" = lean beef/ground beef
- "pasta" = cooked pasta (NOT raw weight)
- "bread" = sliced bread
- When user says "X and Y" (e.g., "chicken and rice"), create TWO separate food items

COMMON MEAL EXAMPLES:
- "chicken and rice" → [{"name": "Grilled chicken breast", "portion": "150g"}, {"name": "Cooked white rice", "portion": "200g"}]
- "salmon and broccoli" → [{"name": "Baked salmon fillet", "portion": "150g"}, {"name": "Steamed broccoli", "portion": "100g"}]
- "eggs and toast" → [{"name": "Scrambled eggs", "portion": "2 large eggs"}, {"name": "Whole wheat bread", "portion": "2 slices"}]
- "steak and potatoes" → [{"name": "Grilled sirloin steak", "portion": "200g"}, {"name": "Roasted potatoes", "portion": "150g"}]

DEFAULT PORTION SIZES (use when not specified):
- Chicken breast: 150g cooked
- Fish fillet: 150g cooked
- Rice (cooked): 200g (1 cup)
- Pasta (cooked): 200g (1 cup)
- Vegetables: 100g
- Eggs: 2 large
- Bread: 2 slices

CRITICAL QUANTITY HANDLING:
- If user specifies quantity (e.g., "4 Weetabix", "2 eggs"), multiply nutrition by that quantity
- Preserve original portion description with quantity

SANITY CHECKS - Flag if values seem wrong:
- Simple meal >800 calories is suspicious
- Chicken breast >250 cal per 100g is wrong
- Rice >150 cal per 100g cooked is wrong
- Single egg >80 calories is wrong

Provide accurate nutritional information based on standard USDA values. Return the response as a JSON object with this exact structure:

{
  "confidence": number (0-100),
  "detectedFoods": [
    {
      "name": "Simple, basic food name (e.g., 'Grilled chicken breast', 'Cooked white rice')",
      "portion": "Specific amount with unit (e.g., '150g', '2 large eggs', '1 cup')",
      "quantity": number (default 1),
      "calories": number (per 100g: chicken ~165, rice ~130, egg ~72 each),
      "protein": number,
      "carbs": number,
      "fat": number,
      "icon": "🍽️"
    }
  ]
}

IMPORTANT: Create SEPARATE items for "X and Y" patterns. Use realistic portions and accurate nutrition values. Only return the JSON object, no additional text.`;

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
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
        fat: Math.round(food.fat || 0),
        icon: food.icon || '🍽️'
      }));

      const result: FoodAnalysisResult = {
        imageUrl: `voice-input-${Date.now()}.txt`, // Placeholder for voice input
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
      console.error("Gemini text analysis error:", error);
      
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
          `Gemini text analysis failed: ${error.message}`,
          false,
          false
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  async generateDietAdvice(entries: DiaryEntry[], userProfile?: any): Promise<DietAdviceResult> {
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
        ).filter(Boolean),
        userProfile: userProfile ? {
          age: userProfile.age,
          sex: userProfile.sex,
          heightCm: userProfile.heightCm,
          currentWeightKg: userProfile.currentWeightKg,
          goalWeightKg: userProfile.goalWeightKg,
          activityLevel: userProfile.activityLevel,
          weightGoal: userProfile.weightGoal,
          weeklyWeightChangeKg: userProfile.weeklyWeightChangeKg,
          medication: userProfile.medication
        } : null
      };

      const systemPrompt = `You are a certified nutritionist and diet advisor. 
Analyze the user's eating patterns and personal profile to provide highly personalized advice including specific meal ideas tailored to their individual needs, goals, health considerations, and lifestyle factors.
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
      "benefits": "Why this meal is good for the user based on their patterns",
      "recipeLink": "https://www.example.com/recipe-name",
      "cookingInstructions": [
        "Step 1: Brief cooking instruction",
        "Step 2: Next step in preparation",
        "Step 3: Final cooking steps"
      ]
    }
  ]
}

Generate 4-6 meal ideas that address the user's specific nutritional needs, deficiencies, and goals based on their eating patterns AND personal profile (age, sex, weight goals, activity level, medication). Consider their current vs goal weight, activity level, and any weight loss medication when recommending portions and meal types. Include a variety of meal types (breakfast, lunch, dinner, snacks). For each meal idea, include a realistic recipe link (use popular cooking websites like allrecipes.com, foodnetwork.com, or BBC Good Food) and provide 3-4 simple cooking instructions. Keep advice items to 1-2 sentences. Be encouraging and specific. Focus on practical, actionable advice that considers their personal goals and health status.`;

      const userPrompt = `Analyze my eating patterns and personal profile to provide highly personalized diet advice with meal ideas tailored specifically to my goals, health status, and lifestyle. Here's my comprehensive data from the last 30 days:

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
                    benefits: { type: "string" },
                    recipeLink: { type: "string" },
                    cookingInstructions: { type: "array", items: { type: "string" } }
                  },
                  required: ["mealType", "name", "description", "calories", "protein", "carbs", "fat", "ingredients", "benefits", "recipeLink", "cookingInstructions"]
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

  async answerNutritionQuestion(
    question: string, 
    entries: DiaryEntry[], 
    userProfile?: any,
    nutritionGoals?: any,
    coachMemory?: any,
    personality?: any
  ): Promise<string> {
    try {
      // Prepare context from user's nutrition data
      const contextData = this.prepareNutritionContextData(entries);
      
      // Build profile context if available
      let profileContext = "";
      let userDisplayName = "";
      if (userProfile) {
        const profileParts = [];
        
        // Set user display name (prefer nickname, fall back to name)
        if (userProfile.nickname) {
          userDisplayName = userProfile.nickname;
          profileParts.push(`Preferred Name: ${userProfile.nickname}`);
        } else if (userProfile.name) {
          userDisplayName = userProfile.name;
          profileParts.push(`Name: ${userProfile.name}`);
        }
        
        if (userProfile.dietaryRequirements && userProfile.dietaryRequirements.length > 0) {
          profileParts.push(`Dietary Requirements: ${userProfile.dietaryRequirements.join(', ')}`);
        }
        if (userProfile.allergies && userProfile.allergies.length > 0) {
          profileParts.push(`Allergies/Intolerances: ${userProfile.allergies.join(', ')}`);
        }
        if (userProfile.foodDislikes) {
          profileParts.push(`Foods They Dislike: ${userProfile.foodDislikes}`);
        }
        if (userProfile.healthConditions) {
          profileParts.push(`Health Conditions: ${userProfile.healthConditions}`);
        }
        
        if (profileParts.length > 0) {
          profileContext = `\n\nUser Profile:\n${profileParts.join('\n')}`;
        }
      }
      
      // Build coach memory context if available
      let memoryContext = "";
      if (coachMemory) {
        const memoryParts = [];
        
        if (coachMemory.age) memoryParts.push(`Age: ${coachMemory.age}`);
        if (coachMemory.occupation) memoryParts.push(`Occupation: ${coachMemory.occupation}`);
        if (coachMemory.lifestyleDetails) memoryParts.push(`Lifestyle: ${coachMemory.lifestyleDetails}`);
        if (coachMemory.workSchedule) memoryParts.push(`Work Schedule: ${coachMemory.workSchedule}`);
        if (coachMemory.exerciseFrequency) memoryParts.push(`Exercise Frequency: ${coachMemory.exerciseFrequency}`);
        if (coachMemory.interests && coachMemory.interests.length > 0) {
          memoryParts.push(`Interests: ${coachMemory.interests.join(', ')}`);
        }
        if (coachMemory.fitnessGoals) memoryParts.push(`Fitness Goals: ${coachMemory.fitnessGoals}`);
        if (coachMemory.stressGoals) memoryParts.push(`Stress Management Goals: ${coachMemory.stressGoals}`);
        if (coachMemory.sleepGoals) memoryParts.push(`Sleep Goals: ${coachMemory.sleepGoals}`);
        if (coachMemory.mentalHealthGoals) memoryParts.push(`Mental Health Goals: ${coachMemory.mentalHealthGoals}`);
        
        if (memoryParts.length > 0) {
          memoryContext = `\n\nPersonal Information:\n${memoryParts.join('\n')}`;
        }
      }
      
      // Build goals context if available
      let goalsContext = "";
      if (nutritionGoals) {
        const goalsParts = [];
        if (nutritionGoals.caloriesGoal) goalsParts.push(`Calorie Goal: ${nutritionGoals.caloriesGoal} kcal`);
        if (nutritionGoals.proteinGoal) goalsParts.push(`Protein Goal: ${nutritionGoals.proteinGoal}g`);
        if (nutritionGoals.carbsGoal) goalsParts.push(`Carbs Goal: ${nutritionGoals.carbsGoal}g`);
        if (nutritionGoals.fatGoal) goalsParts.push(`Fat Goal: ${nutritionGoals.fatGoal}g`);
        if (nutritionGoals.waterGoal) goalsParts.push(`Water Goal: ${nutritionGoals.waterGoal} glasses`);
        
        if (goalsParts.length > 0) {
          goalsContext = `\n\nNutrition Goals:\n${goalsParts.join('\n')}`;
        }
      }
      
      // Get personality settings or use defaults
      const personalitySettings = personality || {
        name: 'Zen Wellness Coach',
        systemPrompt: 'You are a calm, mindful wellness coach who focuses on balance and self-compassion.',
        greetingPhrase: 'Welcome! Let\'s work together on your journey to better health.',
        encouragementPhrases: ['You\'re doing great!', 'Every step forward is progress.'],
        responseStyle: {
          tone: 'Calm and supportive',
          formality: 'Casual',
          emoji: false,
          directness: 'Gentle'
        }
      };
      
      // Extract shift pattern information from user profile
      let shiftGuidance = "";
      if (userProfile) {
        const today = new Date().toISOString().split('T')[0];
        let currentShift = userProfile.defaultShiftType || 'regular';
        
        // Use today's override if set
        if (userProfile.todayShiftDate === today && userProfile.todayShiftType) {
          currentShift = userProfile.todayShiftType;
        }
        
        // Build shift-specific guidance
        if (currentShift === 'day_off') {
          shiftGuidance = `\n\nSHIFT PATTERN GUIDANCE (Day Off):
The user has no shift today. They have more flexibility for meal timing and preparation.
- Suggest balanced meals throughout the day at regular intervals
- This is a good opportunity for meal prep or batch cooking
- Recommend more complex recipes that require time`;
        } else if (currentShift === 'night_shift') {
          shiftGuidance = `\n\nSHIFT PATTERN GUIDANCE (Night Shift):
The user is working overnight hours. Adapt all meal advice for night shift:
- Avoid heavy carbs during night hours (causes drowsiness)
- Focus on meals that stabilize blood sugar without disrupting post-shift sleep
- Recommend protein-rich snacks to maintain energy during shift
- Suggest light, easily digestible meals before bedtime after shift
- Adjust circadian calorie timing (lower calories after midnight, more before shift)`;
        } else if (currentShift === 'long_shift') {
          shiftGuidance = `\n\nSHIFT PATTERN GUIDANCE (Long 12.5hr Clinical Shift):
The user is working a long NHS/emergency shift with limited eating windows.
- Compress meal suggestions into 2-3 slots (pre-shift + breaks)
- Recommend meals that can be eaten cold or reheated quickly
- Increase calories in pre-shift meal to prevent hunger
- Suggest portable, easy-to-eat foods (wraps, protein bars, fruit)
- Add post-shift recovery meal with protein and anti-inflammatory foods
${userProfile.customBreakWindows && userProfile.customBreakWindows.length > 0 ? `- Break times available: ${userProfile.customBreakWindows.join(', ')}` : ''}`;
        } else if (currentShift === 'early_shift') {
          shiftGuidance = `\n\nSHIFT PATTERN GUIDANCE (Early Shift):
The user works early hours (typically 6am-2pm).
- Suggest quick, energizing breakfast options (can eat before 6am)
- Mid-morning snack is crucial for sustained energy
- Recommend having main meal after shift ends (early afternoon)
- Evening meals can be lighter since shift ends early`;
        } else if (currentShift === 'late_shift') {
          shiftGuidance = `\n\nSHIFT PATTERN GUIDANCE (Late Shift):
The user works late hours (typically 2pm-10pm).
- Suggest substantial late breakfast/brunch
- Light pre-shift meal around 1pm
- Recommend snacks during shift (6-7pm)
- Late dinner after shift ends (post-10pm) should be lighter`;
        } else if (currentShift === 'custom' && userProfile.customShiftStart && userProfile.customShiftEnd) {
          shiftGuidance = `\n\nSHIFT PATTERN GUIDANCE (Custom Shift):
The user works ${userProfile.customShiftStart} to ${userProfile.customShiftEnd}.
- Adapt meal timing around these custom hours
- Suggest meals that fit their available eating windows
${userProfile.customBreakWindows && userProfile.customBreakWindows.length > 0 ? `- Break times available: ${userProfile.customBreakWindows.join(', ')}` : '- Recommend portable foods if break times are limited'}`;
        }
      }

      // Build system prompt with personality as PRIMARY identity
      const systemPrompt = `${personalitySettings.systemPrompt}

You are a personal AI companion and coach. Stay in character with your unique personality style at all times.

Your communication style:
- Tone: ${personalitySettings.responseStyle.tone}
- Formality: ${personalitySettings.responseStyle.formality}
- Directness: ${personalitySettings.responseStyle.directness}
${personalitySettings.responseStyle.emoji ? '- Use emojis to make conversations more engaging' : '- Keep responses professional without emojis'}

${userDisplayName ? `The user prefers to be called "${userDisplayName}". Use this name naturally when addressing them to make the conversation more personal and friendly.` : ''}

Context about the user (for reference when relevant):
${contextData}${profileContext}${memoryContext}${goalsContext}${shiftGuidance}

Guidelines:
- You can discuss ANY topic: relationships, career, hobbies, news, sports, motivation, life advice, philosophy, entertainment, technology, or anything else the user wants to talk about
- When nutrition/health topics come up, consider their dietary requirements, allergies, and health conditions
- Never suggest foods they're allergic to or that violate their dietary restrictions
- Reference their personal goals, interests, and lifestyle when relevant${userDisplayName ? `\n- Address the user as "${userDisplayName}" to make the conversation feel personal` : ''}
- CRITICAL: Always adapt meal timing, calorie distribution, and food suggestions based on their current shift pattern
- For shift workers: prioritize portable, quick-prep, and shift-friendly foods
- Stay fully in character with your unique personality - this is who you ARE, not just how you talk
- Give practical, actionable advice in your distinctive style
- If medical advice is needed, recommend consulting a healthcare professional
- Keep responses focused and engaging (200-300 words max)`;

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
      
      // Check for 503 service overloaded - this is retryable
      if (error?.status === 503 || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('overloaded')) {
        providerError = this.createError(
          'SERVICE_UNAVAILABLE',
          'Gemini is temporarily overloaded, retrying...',
          true, // retryable
          true, // use fallback
          30 // retry after 30 seconds
        );
      } else if (error?.message?.includes('quota') || error?.message?.includes('rate')) {
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

  async generateDailyCoaching(entries: DiaryEntry[], userProfile?: any): Promise<DailyCoaching> {
    try {
      // Prepare context from user's nutrition data
      const contextData = this.prepareNutritionContextData(entries);
      
      const systemPrompt = `You are PlateMate's AI wellness coach. Generate daily coaching content that's motivational, educational, and personalized. Be encouraging, supportive, and provide actionable advice.

User's Recent Nutrition Data:
${contextData}

Generate coaching content with these exact JSON keys:
- motivation: Uplifting, personal message (30-50 words)
- nutritionTip: Practical, actionable advice based on their eating patterns (30-50 words)
- medicationTip: If relevant, gentle reminder about GLP-1 medications and nutrition (20-40 words, optional)
- encouragement: Supportive message acknowledging their efforts (20-40 words)
- todaysFocus: One specific, achievable goal for today (15-30 words)
- achievement: If they've hit a milestone, acknowledge it (optional)

Respond with valid JSON object only.`;

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              motivation: { type: "string" },
              nutritionTip: { type: "string" },
              medicationTip: { type: "string" },
              encouragement: { type: "string" },
              todaysFocus: { type: "string" },
              achievement: { type: "string" }
            },
            required: ["motivation", "nutritionTip", "encouragement", "todaysFocus"]
          }
        },
        contents: "Generate my daily coaching content based on my nutrition data.",
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error("No response from Gemini");
      }

      const parsed = JSON.parse(responseText);
      
      // Calculate actual streak from entries
      const actualStreak = this.calculateStreak(entries);
      
      const coaching: DailyCoaching = {
        motivation: parsed.motivation || "You're doing great! Every healthy choice you make is an investment in your future self.",
        nutritionTip: parsed.nutritionTip || "Try to include a variety of colorful vegetables in your meals for optimal nutrition.",
        medicationTip: parsed.medicationTip,
        encouragement: parsed.encouragement || "Remember, progress isn't always perfect, but consistency is key. You've got this!",
        todaysFocus: parsed.todaysFocus || "Focus on staying hydrated and eating mindfully today.",
        streak: actualStreak,
        achievement: actualStreak >= 7 ? `${actualStreak} day logging streak!` : parsed.achievement
      };

      this.recordSuccess();
      return coaching;

    } catch (error: any) {
      console.error("Gemini coaching generation error:", error);
      
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
          'COACHING_ERROR',
          `Gemini coaching generation failed: ${error.message}`,
          false,
          true,
          60
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  async generateEducationalTips(category: 'all' | 'nutrition' | 'medication' | 'motivation'): Promise<EducationalTip[]> {
    try {
      const categoryFilter = category === 'all' ? 'nutrition, medication, and motivation' : category;
      
      const systemPrompt = `You are a certified nutritionist and wellness expert. Generate 6-8 educational tips about ${categoryFilter}. 

Each tip should be:
- Practical and actionable
- Evidence-based
- Easy to understand
- Relevant to people using nutrition tracking apps
- Include proper importance level (high/medium/low)

Focus areas:
- Nutrition: Macro/micronutrients, meal timing, food combinations, healthy eating habits
- Medication: GLP-1 medications, timing with meals, side effects management, interactions
- Motivation: Habit formation, goal setting, overcoming challenges, mindset

Respond with JSON object containing 'tips' array.`;

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              tips: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    content: { type: "string" },
                    category: { type: "string", enum: ["nutrition", "medication", "motivation"] },
                    importance: { type: "string", enum: ["high", "medium", "low"] }
                  },
                  required: ["id", "title", "content", "category", "importance"]
                }
              }
            },
            required: ["tips"]
          }
        },
        contents: `Generate educational tips for: ${categoryFilter}`,
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error("No response from Gemini");
      }

      const parsed = JSON.parse(responseText);
      const tips = parsed.tips || [];
      
      // Filter by category if specific category requested
      const filteredTips = category === 'all' ? tips : tips.filter((tip: any) => tip.category === category);
      
      this.recordSuccess();
      return filteredTips;

    } catch (error: any) {
      console.error("Gemini tips generation error:", error);
      
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
          'TIPS_ERROR',
          `Gemini tips generation failed: ${error.message}`,
          false,
          true,
          60
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  async generateRecipes(dietaryFilter: string = "", userProfile: any = null): Promise<any[]> {
    try {
      const filterText = dietaryFilter ? ` that are suitable for ${dietaryFilter} dietary requirements` : "";
      
      // Build user-specific constraints
      let userConstraints = "";
      let shiftFriendlyGuidance = "";
      if (userProfile) {
        const constraints: string[] = [];
        
        if (userProfile.allergies && userProfile.allergies.length > 0) {
          constraints.push(`CRITICAL: Avoid ALL recipes containing these allergens: ${userProfile.allergies.join(', ')}. Do not include any recipe with these ingredients.`);
        }
        
        if (userProfile.foodDislikes) {
          constraints.push(`Avoid using these foods if possible: ${userProfile.foodDislikes}`);
        }
        
        if (userProfile.healthConditions) {
          constraints.push(`Consider these health conditions: ${userProfile.healthConditions}`);
        }
        
        if (constraints.length > 0) {
          userConstraints = "\n\nUSER-SPECIFIC REQUIREMENTS:\n" + constraints.join('\n');
        }
        
        // Extract shift pattern information
        const today = new Date().toISOString().split('T')[0];
        let currentShift = userProfile.defaultShiftType || 'regular';
        
        // Use today's override if set
        if (userProfile.todayShiftDate === today && userProfile.todayShiftType) {
          currentShift = userProfile.todayShiftType;
        }
        
        // Build shift-specific recipe guidance
        if (currentShift === 'night_shift' || currentShift === 'long_shift') {
          shiftFriendlyGuidance = "\n\nSHIFT-FRIENDLY RECIPE REQUIREMENTS:";
          
          if (currentShift === 'night_shift') {
            shiftFriendlyGuidance += `\nUser works NIGHT SHIFTS. Prioritize recipes that are:
- Portable and easy to pack in containers
- Can be eaten cold or reheated quickly
- Quick prep time (under 20 minutes prep)
- Avoid heavy carbs that cause drowsiness
- Protein-rich to maintain energy during overnight hours
- Include make-ahead/batch-cooking options`;
          } else if (currentShift === 'long_shift') {
            shiftFriendlyGuidance += `\nUser works LONG 12.5hr SHIFTS (NHS/Emergency). Prioritize recipes that are:
- Can be eaten with one hand or on-the-go
- Portable in containers (wraps, bowls, mason jar meals)
- Very quick prep (under 15 minutes) or can be batch-cooked
- Can be eaten cold if microwaves unavailable
- High protein and sustained energy (no sugar crashes)
- Include snack-friendly options (protein bars, energy balls, portable fruits)`;
          }
        } else if (currentShift === 'early_shift' || currentShift === 'late_shift') {
          shiftFriendlyGuidance = "\n\nSHIFT-FRIENDLY RECIPE REQUIREMENTS:";
          
          if (currentShift === 'early_shift') {
            shiftFriendlyGuidance += `\nUser works EARLY SHIFTS (6am-2pm). Include:
- Quick breakfast options that can be prepared in under 10 minutes
- Energizing morning meals
- Make-ahead breakfast options (overnight oats, etc.)`;
          } else if (currentShift === 'late_shift') {
            shiftFriendlyGuidance += `\nUser works LATE SHIFTS (2pm-10pm). Include:
- Substantial brunch/lunch recipes
- Portable snacks for during shift
- Lighter late-evening meal options`;
          }
        }
      }
      
      const systemPrompt = `You are a professional chef and nutritionist. Generate 8-10 healthy and delicious recipes${filterText}.

Each recipe should include:
- Complete ingredient list with measurements
- Step-by-step cooking instructions
- Accurate nutritional information (calories, protein, carbs, fat)
- Cooking time (prep and cook) and difficulty level
- Serving size information
- Dietary tags and information

Focus on:
- Balanced nutrition
- Easy-to-find ingredients
- Clear, actionable instructions
- Variety in meal types (breakfast, lunch, dinner, snacks)
- Different cooking methods and cuisines${userConstraints}${shiftFriendlyGuidance}

Respond with JSON in this exact format:
{
  "recipes": [
    {
      "id": "recipe-1",
      "name": "Recipe Name",
      "description": "Brief description",
      "calories": 400,
      "protein": 25,
      "carbs": 35,
      "fat": 15,
      "servings": 2,
      "prepTime": 15,
      "cookTime": 20,
      "difficulty": "Easy",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["Step 1", "Step 2"],
      "dietaryInfo": ["Vegetarian", "High Protein"]
    }
  ]
}`;

      const userPrompt = dietaryFilter 
        ? `Generate healthy recipes for ${dietaryFilter} diet. Include variety in meal types and cooking methods.`
        : "Generate a variety of healthy recipes for different meal types and dietary preferences.";

      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              recipes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    calories: { type: "number" },
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fat: { type: "number" },
                    servings: { type: "number" },
                    prepTime: { type: "number" },
                    cookTime: { type: "number" },
                    difficulty: { type: "string" },
                    ingredients: { type: "array", items: { type: "string" } },
                    instructions: { type: "array", items: { type: "string" } },
                    dietaryInfo: { type: "array", items: { type: "string" } }
                  },
                  required: ["id", "name", "description", "calories", "protein", "carbs", "fat", "servings", "prepTime", "cookTime", "difficulty", "ingredients", "instructions", "dietaryInfo"]
                }
              }
            },
            required: ["recipes"]
          },
          temperature: 0.8
        },
        contents: userPrompt,
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error("No response from Gemini");
      }

      const parsed = JSON.parse(responseText);
      const recipes = parsed.recipes || [];
      
      this.recordSuccess();
      return recipes;

    } catch (error: any) {
      console.error("Gemini recipe generation error:", error);
      
      let providerError: ProviderError;
      
      if (error?.status === 429 || error?.code === 'RATE_LIMIT_EXCEEDED') {
        providerError = this.createError(
          'RATE_LIMIT',
          'Gemini rate limit exceeded',
          true,
          true,
          60
        );
      } else if (error?.status >= 500) {
        providerError = this.createError(
          'SERVER_ERROR',
          `Gemini server error: ${error.message}`,
          false,
          true,
          30
        );
      } else {
        providerError = this.createError(
          'RECIPE_ERROR',
          `Gemini recipe generation failed: ${error.message}`,
          false,
          false
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  private calculateStreak(entries: DiaryEntry[]): number {
    if (!entries || entries.length === 0) return 0;
    
    // Sort entries by date (most recent first)
    const sortedEntries = entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // Check each day going backwards
    for (let i = 0; i < 30; i++) { // Check last 30 days max
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() - i);
      
      // Find if there's an entry for this date
      const hasEntryForDate = sortedEntries.some(entry => {
        const entryDate = new Date(entry.createdAt);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === checkDate.getTime();
      });
      
      if (hasEntryForDate) {
        streak++;
      } else {
        break; // Streak is broken
      }
    }
    
    return streak;
  }
}