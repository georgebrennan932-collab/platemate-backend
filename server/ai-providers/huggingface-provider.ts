import { promises as fs } from "fs";
import { AIProvider, FoodAnalysisResult, FoodDetectionResult, DietAdviceResult, DiaryEntry, ProviderError, DailyCoaching, EducationalTip } from "./types";

export class HuggingFaceProvider extends AIProvider {
  public readonly name = "HuggingFace";
  public readonly priority = 3; // Third priority (after Gemini)
  public readonly maxRetries = 2;

  private apiKey: string;
  private baseUrl = "https://api-inference.huggingface.co/models";

  constructor() {
    super();
    this.apiKey = process.env.HUGGINGFACE_API_KEY || "";
  }

  async performHealthCheck(): Promise<any> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY not configured");
      }

      // Simple health check with a text generation model
      const response = await fetch(`${this.baseUrl}/meta-llama/Llama-3.2-3B-Instruct`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "Health check"
        })
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return {
        providerName: this.name,
        healthy: true,
        responseTime,
        timestamp: new Date(),
        details: {
          model: "meta-llama/Llama-3.2-3B-Instruct",
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

  private async queryVisionModel(imageBase64: string, prompt: string): Promise<string> {
    // Use BLIP or LLaVA for image analysis
    const response = await fetch(`${this.baseUrl}/Salesforce/blip-image-captioning-large`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: imageBase64
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace vision API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0]?.generated_text || "" : result.generated_text || "";
  }

  private async queryTextModel(prompt: string, maxTokens: number = 1000): Promise<string> {
    const response = await fetch(`${this.baseUrl}/meta-llama/Llama-3.2-3B-Instruct`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Check for rate limiting or quota errors
      if (response.status === 429 || errorText.includes('rate limit')) {
        const retryAfter = response.headers.get('retry-after');
        throw this.createError(
          'RATE_LIMIT',
          'HuggingFace rate limit exceeded',
          true,
          true,
          retryAfter ? parseInt(retryAfter) : 60
        );
      }
      
      throw new Error(`HuggingFace text API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0]?.generated_text || "" : result.generated_text || "";
  }

  async analyzeFoodImage(imagePath: string): Promise<FoodAnalysisResult> {
    try {
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY not configured");
      }

      // Read image file
      const imageBytes = await fs.readFile(imagePath);
      const imageBase64 = imageBytes.toString("base64");
      
      // First, get a caption of the image
      const caption = await this.queryVisionModel(imageBase64, "Describe this food image");

      // Then use text model to analyze the food
      const prompt = `Based on this food image description: "${caption}"

Analyze this food and identify all visible food items with their nutritional information.

CRITICAL UK FOOD PORTIONS:
- UK crisps/chips: Single-serve packets are typically 25g (NOT 30g). Use "25g" for standard crisp packets.

Return ONLY a JSON object with this exact structure (no additional text):

{
  "confidence": number (0-100),
  "detectedFoods": [
    {
      "name": "Food Name",
      "portion": "estimated portion size with weight/volume",
      "icon": "appropriate icon name from: egg, bacon, bread-slice, apple-alt"
    }
  ]
}

Only return the JSON object, nothing else.`;

      const responseText = await this.queryTextModel(prompt, 800);
      
      // Clean the response text by removing markdown formatting
      const cleanedText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      // Parse the JSON response
      const parsed = JSON.parse(cleanedText);
      
      // Validate the response structure
      if (!parsed.detectedFoods || !Array.isArray(parsed.detectedFoods)) {
        throw new Error("Invalid response format from HuggingFace");
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
        confidence: Math.round(parsed.confidence || 70),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        detectedFoods: mockNutritionFoods
      };

      this.recordSuccess();
      return result;

    } catch (error: any) {
      console.error("HuggingFace food analysis error:", error);
      
      let providerError: ProviderError;
      
      if (error?.message?.includes('quota') || error?.message?.includes('rate') || error.isRateLimit) {
        providerError = this.createError(
          'RATE_LIMIT',
          'HuggingFace rate limit exceeded',
          true,
          true,
          error.retryAfter || 60
        );
      } else if (error?.message?.includes('API') || error?.message?.includes('network')) {
        providerError = this.createError(
          'API_ERROR',
          error.message,
          false,
          true
        );
      } else {
        providerError = this.createError(
          'UNKNOWN_ERROR',
          error.message,
          false,
          true
        );
      }
      
      this.recordError(providerError);
      throw providerError;
    }
  }

  async analyzeFoodText(foodDescription: string): Promise<FoodAnalysisResult> {
    try {
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY not configured");
      }

      const prompt = `Analyze this food description: "${foodDescription}"

Identify the food items and provide nutritional estimates.

Return ONLY a JSON object with this exact structure (no additional text):

{
  "confidence": number (0-100),
  "detectedFoods": [
    {
      "name": "Food Name",
      "portion": "estimated portion size",
      "icon": "appropriate icon name from: egg, bacon, bread-slice, apple-alt"
    }
  ]
}`;

      const responseText = await this.queryTextModel(prompt, 500);
      
      const cleanedText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const parsed = JSON.parse(cleanedText);
      
      const mockNutritionFoods = parsed.detectedFoods.map((food: any) => ({
        name: food.name,
        portion: food.portion,
        calories: 100,
        protein: 5,
        carbs: 10,
        fat: 3,
        icon: food.icon
      }));

      const totalCalories = mockNutritionFoods.reduce((sum: number, food: any) => sum + food.calories, 0);
      const totalProtein = mockNutritionFoods.reduce((sum: number, food: any) => sum + food.protein, 0);
      const totalCarbs = mockNutritionFoods.reduce((sum: number, food: any) => sum + food.carbs, 0);
      const totalFat = mockNutritionFoods.reduce((sum: number, food: any) => sum + food.fat, 0);

      this.recordSuccess();
      return {
        imageUrl: '',
        confidence: Math.round(parsed.confidence || 80),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        detectedFoods: mockNutritionFoods
      };

    } catch (error: any) {
      console.error("HuggingFace text analysis error:", error);
      const providerError = this.createError('ANALYSIS_ERROR', error.message, false, true);
      this.recordError(providerError);
      throw providerError;
    }
  }

  async detectFoodNames(imagePath: string): Promise<FoodDetectionResult> {
    try {
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY not configured");
      }

      const imageBytes = await fs.readFile(imagePath);
      const imageBase64 = imageBytes.toString("base64");
      
      const caption = await this.queryVisionModel(imageBase64, "List the foods in this image");

      const prompt = `Based on this food image description: "${caption}"

List only the food names detected. Return a JSON object:

{
  "confidence": number (0-100),
  "detectedFoodNames": ["food1", "food2", ...],
  "referenceObjects": ["plate", "fork", ...]
}`;

      const responseText = await this.queryTextModel(prompt, 300);
      const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      this.recordSuccess();
      return {
        confidence: parsed.confidence || 70,
        detectedFoodNames: parsed.detectedFoodNames || [],
        referenceObjects: parsed.referenceObjects || []
      };

    } catch (error: any) {
      console.error("HuggingFace food detection error:", error);
      const providerError = this.createError('DETECTION_ERROR', error.message, false, true);
      this.recordError(providerError);
      throw providerError;
    }
  }

  async generateDietAdvice(entries: DiaryEntry[], userProfile?: any): Promise<DietAdviceResult> {
    try {
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY not configured");
      }

      const prompt = `Based on the user's recent meals, provide personalized diet advice.

User Profile: ${JSON.stringify(userProfile || {})}
Recent Entries: ${entries.length} meals logged

Return ONLY a JSON object:

{
  "personalizedAdvice": ["tip1", "tip2", "tip3"],
  "nutritionGoals": ["goal1", "goal2"],
  "improvements": ["improve1", "improve2"],
  "generalTips": ["tip1", "tip2"],
  "mealIdeas": []
}`;

      const responseText = await this.queryTextModel(prompt, 1000);
      const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      this.recordSuccess();
      return {
        personalizedAdvice: parsed.personalizedAdvice || [],
        nutritionGoals: parsed.nutritionGoals || [],
        improvements: parsed.improvements || [],
        generalTips: parsed.generalTips || [],
        mealIdeas: parsed.mealIdeas || []
      };

    } catch (error: any) {
      console.error("HuggingFace diet advice error:", error);
      const providerError = this.createError('ADVICE_ERROR', error.message, false, true);
      this.recordError(providerError);
      throw providerError;
    }
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
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY not configured");
      }

      const prompt = `You are a nutrition coach. Answer this question: "${question}"

User context:
- Profile: ${JSON.stringify(userProfile || {})}
- Recent meals: ${entries.length} logged
- Goals: ${JSON.stringify(nutritionGoals || {})}

Provide a helpful, personalized response.`;

      const response = await this.queryTextModel(prompt, 500);
      
      this.recordSuccess();
      return response.trim();

    } catch (error: any) {
      console.error("HuggingFace question answering error:", error);
      const providerError = this.createError('QUESTION_ERROR', error.message, false, true);
      this.recordError(providerError);
      throw providerError;
    }
  }

  async generateDailyCoaching(entries: DiaryEntry[], userProfile?: any): Promise<DailyCoaching> {
    try {
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY not configured");
      }

      const prompt = `Generate daily coaching message for a nutrition app user.

User has logged ${entries.length} meals.

Return ONLY a JSON object:

{
  "motivation": "motivational message",
  "nutritionTip": "nutrition tip",
  "encouragement": "encouraging message",
  "todaysFocus": "focus for today",
  "streak": 1,
  "achievement": "achievement message"
}`;

      const responseText = await this.queryTextModel(prompt, 500);
      const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      this.recordSuccess();
      return {
        motivation: parsed.motivation || "Keep up the great work!",
        nutritionTip: parsed.nutritionTip || "Stay hydrated throughout the day.",
        encouragement: parsed.encouragement || "You're doing amazing!",
        todaysFocus: parsed.todaysFocus || "Focus on balanced meals.",
        streak: parsed.streak || 1,
        achievement: parsed.achievement
      };

    } catch (error: any) {
      console.error("HuggingFace coaching error:", error);
      const providerError = this.createError('COACHING_ERROR', error.message, false, true);
      this.recordError(providerError);
      throw providerError;
    }
  }

  async generateEducationalTips(category: 'all' | 'nutrition' | 'medication' | 'motivation'): Promise<EducationalTip[]> {
    try {
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY not configured");
      }

      const prompt = `Generate 3 educational tips for category: ${category}

Return ONLY a JSON array:

[
  {
    "id": "tip1",
    "title": "Tip Title",
    "content": "Tip content",
    "category": "nutrition",
    "importance": "high"
  }
]`;

      const responseText = await this.queryTextModel(prompt, 600);
      const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      this.recordSuccess();
      return Array.isArray(parsed) ? parsed : [];

    } catch (error: any) {
      console.error("HuggingFace tips generation error:", error);
      const providerError = this.createError('TIPS_ERROR', error.message, false, true);
      this.recordError(providerError);
      throw providerError;
    }
  }
}
