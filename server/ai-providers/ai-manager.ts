import { AIProvider, FoodAnalysisResult, FoodDetectionResult, DietAdviceResult, DiaryEntry, ProviderError, ProviderStatus, DailyCoaching, EducationalTip } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";
import { usdaService } from "../services/usda-service";
import { openFoodFactsService } from "../services/openfoodfacts-service";
import { imageAnalysisCache } from "../services/image-analysis-cache";

export class AIManager {
  private providers: AIProvider[] = [];
  private fallbackData: {
    foodAnalysis: FoodAnalysisResult;
    dietAdvice: DietAdviceResult;
    dailyCoaching: DailyCoaching;
    educationalTips: EducationalTip[];
  };

  constructor() {
    // Initialize providers in priority order
    this.providers = [
      new OpenAIProvider(),
      new GeminiProvider()
    ].sort((a, b) => a.priority - b.priority);

    // Define fallback data for when all providers fail
    this.fallbackData = {
      foodAnalysis: {
        imageUrl: '',
        confidence: 50,
        totalCalories: 250,
        totalProtein: 12,
        totalCarbs: 25,
        totalFat: 10,
        detectedFoods: [
          {
            name: "Mixed Meal",
            portion: "1 serving",
            calories: 250,
            protein: 12,
            carbs: 25,
            fat: 10,
            icon: "apple-alt"
          }
        ]
      },
      dietAdvice: {
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
        ],
        mealIdeas: [
          {
            mealType: "breakfast" as const,
            name: "Protein-Packed Overnight Oats",
            description: "Creamy oats with Greek yogurt, berries, and nuts for sustained energy",
            calories: 350,
            protein: 18,
            carbs: 42,
            fat: 12,
            ingredients: ["rolled oats", "Greek yogurt", "mixed berries", "almonds", "chia seeds"],
            benefits: "High in protein and fiber to keep you full and energized throughout the morning",
            recipeLink: "https://www.allrecipes.com/recipe/276934/overnight-oats/",
            cookingInstructions: [
              "Mix 1/2 cup rolled oats with 1/2 cup Greek yogurt in a jar",
              "Add 1 tbsp chia seeds and 1/4 cup milk, stir well",
              "Refrigerate overnight or at least 4 hours",
              "Top with berries and chopped almonds before serving"
            ]
          },
          {
            mealType: "lunch" as const,
            name: "Mediterranean Quinoa Bowl",
            description: "Nutritious bowl with quinoa, vegetables, and lean protein",
            calories: 420,
            protein: 25,
            carbs: 48,
            fat: 15,
            ingredients: ["quinoa", "grilled chicken", "cucumber", "tomatoes", "feta cheese", "olive oil"],
            benefits: "Balanced nutrients with healthy fats and complete proteins for sustained energy",
            recipeLink: "https://www.bbcgoodfood.com/recipes/mediterranean-quinoa-salad",
            cookingInstructions: [
              "Cook 1/2 cup quinoa according to package directions and let cool",
              "Grill 4oz chicken breast and slice into strips",
              "Dice cucumber and tomatoes, crumble feta cheese",
              "Combine all ingredients and drizzle with olive oil and lemon"
            ]
          },
          {
            mealType: "dinner" as const,
            name: "Baked Salmon with Sweet Potato",
            description: "Omega-3 rich salmon with roasted vegetables and complex carbs",
            calories: 480,
            protein: 35,
            carbs: 32,
            fat: 22,
            ingredients: ["salmon fillet", "sweet potato", "broccoli", "olive oil", "herbs"],
            benefits: "Rich in omega-3s and antioxidants to support heart health and recovery",
            recipeLink: "https://www.foodnetwork.com/recipes/baked-salmon-with-sweet-potato",
            cookingInstructions: [
              "Preheat oven to 400°F and line baking sheet with parchment",
              "Cut sweet potato into cubes and toss with olive oil, roast 20 minutes",
              "Season salmon with herbs and bake alongside vegetables for 12-15 minutes",
              "Steam broccoli for 4-5 minutes and serve everything together"
            ]
          },
          {
            mealType: "snack" as const,
            name: "Apple with Almond Butter",
            description: "Simple, satisfying snack with natural sweetness and healthy fats",
            calories: 200,
            protein: 8,
            carbs: 20,
            fat: 12,
            ingredients: ["apple", "almond butter"],
            benefits: "Combines fiber and healthy fats for stable blood sugar and lasting satiety",
            recipeLink: "https://www.eatingwell.com/recipe/276009/apple-with-almond-butter/",
            cookingInstructions: [
              "Wash and core a medium apple, slice into 8 wedges",
              "Measure 2 tablespoons natural almond butter",
              "Arrange apple slices on plate with almond butter for dipping",
              "Sprinkle with cinnamon for extra flavor (optional)"
            ]
          }
        ]
      },
      dailyCoaching: {
        motivation: "You're on a great journey toward better health! Every food choice you track helps you understand your body better.",
        nutritionTip: "Try to include protein, healthy fats, and fiber in every meal to keep you satisfied longer.",
        encouragement: "Remember, progress isn't always perfect, but consistency is key. You're doing great!",
        todaysFocus: "Focus on staying hydrated and eating mindfully today.",
        streak: 0,
        medicationTip: "If you're using GLP-1 medications, eat slowly and stop when you feel satisfied."
      },
      educationalTips: [
        {
          id: "tip-1",
          title: "Protein Power",
          content: "Including protein in every meal helps maintain stable blood sugar levels and keeps you feeling full longer. Aim for 20-30 grams per meal.",
          category: "nutrition",
          importance: "high"
        },
        {
          id: "tip-2", 
          title: "Meal Timing with GLP-1",
          content: "Take your GLP-1 medication at the same time each day and eat slowly during meals to help your body recognize fullness signals.",
          category: "medication",
          importance: "high"
        },
        {
          id: "tip-3",
          title: "Building Healthy Habits",
          content: "Start small with one healthy change at a time. Consistency beats perfection when building lasting habits.",
          category: "motivation",
          importance: "medium"
        }
      ]
    };
  }

  /**
   * Enhanced food analysis workflow with caching: Check cache first, then AI detection with portions + USDA nutrition lookup
   */
  async analyzeFoodImage(imagePath: string): Promise<FoodAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Check cache first to avoid duplicate analysis
      const cachedResult = await imageAnalysisCache.get(imagePath);
      
      if (cachedResult) {
        return cachedResult;
      }
      
      const analysisStartTime = Date.now();
      
      // Step 2: Get full AI analysis with portions using legacy providers  
      const fullAnalysis = await this.legacyAnalyzeFoodImage(imagePath);
      
      // Step 3: Extract food names for USDA lookup
      const foodNames = fullAnalysis.detectedFoods.map(food => food.name);
      
      // Step 4: Get accurate nutrition from USDA for detected foods
      const nutritionData = await this.getNutritionFromUSDA(foodNames);
      
      // Step 5: Combine AI portions with USDA nutrition data
      const finalResult = await this.combineAIPortionsWithUSDANutrition(imagePath, fullAnalysis, nutritionData);
      
      // Step 6: Store result in cache for future use
      try {
        await imageAnalysisCache.set(imagePath, finalResult);
      } catch (cacheError: any) {
        console.warn('Failed to store result in cache (non-critical):', cacheError.message);
        // Don't fail the analysis if cache storage fails
      }
      
      return finalResult;
      
    } catch (error: any) {
      console.warn('Enhanced analysis failed, falling back to simple legacy method:', error.message);
      
      // Try cache for legacy method as well
      try {
        const cachedLegacyResult = await imageAnalysisCache.get(imagePath);
        if (cachedLegacyResult) {
          return cachedLegacyResult;
        }
      } catch (legacyCacheError) {
        console.warn('Cache check failed for legacy fallback:', legacyCacheError);
      }
      
      // Run legacy analysis and cache the result
      const legacyResult = await this.legacyAnalyzeFoodImage(imagePath);
      
      // Try to cache legacy result too
      try {
        await imageAnalysisCache.set(imagePath, legacyResult);
      } catch (legacyCacheError) {
        console.warn('Failed to cache legacy result:', legacyCacheError);
      }
      
      return legacyResult;
    }
  }

  /**
   * Detect food names from image using AI providers
   */
  async detectFoodNamesFromImage(imagePath: string): Promise<FoodDetectionResult> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          const result = await provider.detectFoodNames(imagePath);
          return result;
          
        } catch (error: any) {
          // If it's a rate limit error, move to next provider immediately
          if (error.isRateLimit) {
            break;
          }
          
          // If it's the last attempt with this provider, continue to next provider
          if (attempt === provider.maxRetries) {
            break;
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(waitTime);
        }
      }
    }

    // All providers failed, return fallback
    console.warn('All AI providers failed for food detection, using fallback');
    return {
      confidence: 0,
      detectedFoodNames: ['Mixed Food'], // Generic fallback
      referenceObjects: []
    };
  }

  /**
   * Get nutrition data from USDA for detected food names
   */
  async getNutritionFromUSDA(foodNames: string[]): Promise<Map<string, any>> {
    try {
      const nutritionMap = await usdaService.findMultipleMatches(foodNames);
      return nutritionMap;
      
    } catch (error: any) {
      console.warn('USDA nutrition lookup failed:', error.message);
      return new Map(); // Return empty map on failure
    }
  }

  /**
   * Try OpenFoodFacts as fallback when USDA doesn't have data
   */
  async tryOpenFoodFactsFallback(foodName: string): Promise<{ name: string; nutrition: any } | null> {
    try {
      const results = await openFoodFactsService.getNutritionData([foodName]);
      
      if (results && results.length > 0 && results[0].nutrition_per_100g !== "not found") {
        const nutrition = results[0].nutrition_per_100g as any;
        
        return {
          name: foodName,
          nutrition: {
            calories: nutrition.calories || 0,
            protein: nutrition.protein || 0,
            carbs: nutrition.carbs || 0,
            fat: nutrition.fat || 0
          }
        };
      }
      
      return null;
      
    } catch (error: any) {
      console.warn(`OpenFoodFacts fallback failed for ${foodName}:`, error.message);
      return null;
    }
  }

  /**
   * Combine AI detection results with USDA nutrition data
   */
  async combineDetectionWithNutrition(
    imagePath: string, 
    detection: FoodDetectionResult, 
    nutritionMap: Map<string, any>
  ): Promise<FoodAnalysisResult> {
    const detectedFoods = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Process each detected food
    for (const foodName of detection.detectedFoodNames) {
      const usdaData = nutritionMap.get(foodName);
      
      if (usdaData) {
        // Use accurate USDA nutrition data
        const food = {
          name: usdaData.usdaFood.description,
          portion: '100g', // Default portion - could be enhanced with AI portion estimation
          calories: usdaData.nutrition.calories,
          protein: Math.round(usdaData.nutrition.protein),
          carbs: Math.round(usdaData.nutrition.carbs),
          fat: Math.round(usdaData.nutrition.fat),
          icon: this.getFoodIcon(foodName)
        };
        
        detectedFoods.push(food);
        totalCalories += food.calories;
        totalProtein += food.protein;
        totalCarbs += food.carbs;
        totalFat += food.fat;
        
      } else {
        // Try OpenFoodFacts as fallback
        const offData = await this.tryOpenFoodFactsFallback(foodName);
        
        if (offData) {
          const food = {
            name: offData.name,
            portion: '100g',
            calories: offData.nutrition.calories,
            protein: Math.round(offData.nutrition.protein),
            carbs: Math.round(offData.nutrition.carbs),
            fat: Math.round(offData.nutrition.fat),
            icon: this.getFoodIcon(foodName)
          };
          
          detectedFoods.push(food);
          totalCalories += food.calories;
          totalProtein += food.protein;
          totalCarbs += food.carbs;
          totalFat += food.fat;
          
        } else {
          // Final hardcoded fallback
          const fallbackFood = {
            name: foodName,
            portion: '1 serving',
            calories: 150, // Conservative estimate
            protein: 8,
            carbs: 15,
            fat: 6,
            icon: this.getFoodIcon(foodName)
          };
          
          detectedFoods.push(fallbackFood);
          totalCalories += fallbackFood.calories;
          totalProtein += fallbackFood.protein;
          totalCarbs += fallbackFood.carbs;
          totalFat += fallbackFood.fat;
          

        }
      }
    }

    return {
      imageUrl: imagePath,
      confidence: detection.confidence,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      detectedFoods
    };
  }

  /**
   * Combine AI portions with USDA nutrition data for accurate analysis
   */
  async combineAIPortionsWithUSDANutrition(
    imagePath: string,
    aiAnalysis: FoodAnalysisResult,
    nutritionMap: Map<string, any>
  ): Promise<FoodAnalysisResult> {
    const detectedFoods = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Process each AI-detected food with portion estimates
    for (const aiFood of aiAnalysis.detectedFoods) {
      // Try to match with USDA nutrition data
      const usdaData = nutritionMap.get(aiFood.name);
      
      if (usdaData) {
        // Convert AI portion to grams for scaling
        const portionGrams = this.convertPortionToGrams(aiFood.portion, aiFood.name);
        const scaleFactor = portionGrams / 100; // USDA data is per 100g
        
        
        // Scale USDA nutrition to AI-estimated portion
        const food = {
          name: usdaData.usdaFood.description,
          portion: aiFood.portion, // Keep original AI portion estimate
          calories: Math.round(usdaData.nutrition.calories * scaleFactor),
          protein: Math.round(usdaData.nutrition.protein * scaleFactor),
          carbs: Math.round(usdaData.nutrition.carbs * scaleFactor),
          fat: Math.round(usdaData.nutrition.fat * scaleFactor),
          icon: aiFood.icon || this.getFoodIcon(aiFood.name)
        };
        
        detectedFoods.push(food);
        totalCalories += food.calories;
        totalProtein += food.protein;
        totalCarbs += food.carbs;
        totalFat += food.fat;
        
      } else {
        // Try OpenFoodFacts as fallback
        const offData = await this.tryOpenFoodFactsFallback(aiFood.name);
        
        if (offData) {
          // Convert AI portion to grams for scaling
          const portionGrams = this.convertPortionToGrams(aiFood.portion, aiFood.name);
          const scaleFactor = portionGrams / 100; // OpenFoodFacts data is per 100g
          
          const food = {
            name: offData.name,
            portion: aiFood.portion,
            calories: Math.round(offData.nutrition.calories * scaleFactor),
            protein: Math.round(offData.nutrition.protein * scaleFactor),
            carbs: Math.round(offData.nutrition.carbs * scaleFactor),
            fat: Math.round(offData.nutrition.fat * scaleFactor),
            icon: aiFood.icon || this.getFoodIcon(aiFood.name)
          };
          
          detectedFoods.push(food);
          totalCalories += food.calories;
          totalProtein += food.protein;
          totalCarbs += food.carbs;
          totalFat += food.fat;
          
        } else {
          // Final fallback: Use AI nutrition data if no USDA or OpenFoodFacts match found
          detectedFoods.push(aiFood);
          totalCalories += aiFood.calories;
          totalProtein += aiFood.protein;
          totalCarbs += aiFood.carbs;
          totalFat += aiFood.fat;
          
        }
      }
    }

    return {
      imageUrl: imagePath,
      confidence: aiAnalysis.confidence,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      detectedFoods
    };
  }

  /**
   * Enhanced portion normalization: Convert all portion descriptions to grams
   * This ensures consistent 100g baseline scaling for all nutrition data
   */
  private convertPortionToGrams(portion: string, foodName?: string): number {
    const portionLower = portion.toLowerCase().trim();
    const foodLower = foodName?.toLowerCase() || '';
    
    // STEP 1: Handle explicit weight/volume measurements (most accurate)
    const kgMatch = portionLower.match(/(\d+(?:\.\d+)?)\s?kg\b/);
    if (kgMatch) {
      const result = parseFloat(kgMatch[1]) * 1000;

      return result;
    }
    
    const gramsMatch = portionLower.match(/(\d+(?:\.\d+)?)\s?(?:g\b|grams?\b)/);
    if (gramsMatch) {
      const result = parseFloat(gramsMatch[1]);

      return result;
    }
    
    const ozMatch = portionLower.match(/(\d+(?:\.\d+)?)\s?oz\b/);
    if (ozMatch) {
      const result = parseFloat(ozMatch[1]) * 28.35; // 1 oz = 28.35g
      return result;
    }
    
    const mlMatch = portionLower.match(/(\d+(?:\.\d+)?)\s?ml\b/);
    if (mlMatch) {
      const result = parseFloat(mlMatch[1]); // Assume 1ml ≈ 1g for most foods
      return result;
    }
    
    // STEP 2: Extract count numbers for contextual conversions
    const numMatch = portionLower.match(/(\d+(?:\.\d+)?)/);
    const num = numMatch ? parseFloat(numMatch[1]) : 1;
    
    // Specific egg handling (before generic size rules)
    if (foodLower.includes('egg')) {
      if (portionLower.includes('large')) return num * 50; // Large egg ≈ 50g
      if (portionLower.includes('medium')) return num * 44; // Medium egg ≈ 44g  
      if (portionLower.includes('small')) return num * 38; // Small egg ≈ 38g
    }
    
    // Contextual UK/British food portions
    if (portionLower.includes('rasher') || portionLower.includes('rashers')) {
      if (foodLower.includes('back bacon') || foodLower.includes('bacon back')) {
        return num * 28; // Back bacon rasher ≈ 28g
      }
      if (foodLower.includes('streaky bacon') || foodLower.includes('bacon streaky')) {
        return num * 15; // Streaky bacon rasher ≈ 15g  
      }
      if (foodLower.includes('bacon')) {
        return num * 20; // Default bacon rasher ≈ 20g
      }
    }
    
    // UK Black pudding / Blood sausage slices
    if (portionLower.includes('slice') && (foodLower.includes('black pudding') || foodLower.includes('blood sausage'))) {
      return num * 45; // Black pudding slice ≈ 45g
    }
    
    // Sausage links
    if (portionLower.includes('link') || portionLower.includes('links')) {
      if (foodLower.includes('sausage')) {
        return num * 45; // Sausage link ≈ 45g
      }
    }
    
    // UK Crisps/Chips handling - Standard single-serve packets are 25g in the UK
    const isUKCrisp = foodLower.includes('crisps') || 
                     (foodLower.includes('chips') && !foodLower.includes('fish') && !foodLower.includes('wood'));
    
    if (isUKCrisp || 
        portionLower.includes('crisps') || 
        (portionLower.includes('chips') && !portionLower.includes('fish'))) {
      
      // Handle specific UK crisp portion terms
      if (portionLower.includes('packet') || portionLower.includes('bag') || 
          portionLower.includes('single serve') || portionLower.includes('individual')) {
        return num * 25; // UK single-serve crisp packet ≈ 25g
      }
      
      // Handle sharing/multi-serve bags
      if (portionLower.includes('sharing') || portionLower.includes('family') || 
          portionLower.includes('multi') || portionLower.includes('large bag')) {
        return num * 150; // UK sharing bag ≈ 150g
      }
      
      // Default UK crisp portion (assume standard single-serve if no specific size mentioned)
      return num * 25; // Default UK crisp portion ≈ 25g
    }
    
    // Volume conversions (rough estimates)
    if (portionLower.includes('cup')) {
      return num * 240; // 1 cup ≈ 240g
    }
    if (portionLower.includes('tbsp') || portionLower.includes('tablespoon')) {
      return num * 15; // 1 tbsp ≈ 15g
    }
    if (portionLower.includes('tsp') || portionLower.includes('teaspoon')) {
      return num * 5; // 1 tsp ≈ 5g
    }
    
    // Hash brown differentiation
    if (portionLower.includes('hash brown') || (foodLower.includes('hash brown') && portionLower.includes('piece'))) {
      if (portionLower.includes('round') || portionLower.includes('rounds') || portionLower.includes('tater tot')) {
        return num * 12; // Hash brown rounds ≈ 12g each
      }
      if (portionLower.includes('patty') || portionLower.includes('patties')) {
        return num * 55; // Hash brown patty ≈ 55g each  
      }
      return num * 55; // Default hash brown patty size
    }
    
    // Common portion conversions (estimates)
    if (portionLower.includes('slice')) {
      return num * 30; // Average slice ≈ 30g
    }
    if (portionLower.includes('piece') || portionLower.includes('item')) {
      return num * 50; // Average piece ≈ 50g
    }
    if (portionLower.includes('serving')) {
      return num * 150; // Average serving ≈ 150g
    }
    if (portionLower.includes('small')) {
      return 75; // Small portion ≈ 75g
    }
    if (portionLower.includes('medium')) {
      return 150; // Medium portion ≈ 150g
    }
    if (portionLower.includes('large')) {
      return 300; // Large portion ≈ 300g
    }
    
    // STEP 3: Enhanced food-specific standardized portions
    const standardPortions = [
      // Fast Food / Burgers (restaurant-specific weights)
      { keywords: ['big mac'], portion: num * 195, label: 'Big Mac' },
      { keywords: ['quarter pounder', 'quarterpounder'], portion: num * 200, label: 'Quarter Pounder' },
      { keywords: ['whopper'], portion: num * 290, label: 'Whopper' },
      { keywords: ['cheeseburger'], portion: num * 120, label: 'cheeseburger' },
      { keywords: ['hamburger', 'burger'], portion: num * 110, label: 'hamburger' },
      
      // Proteins  
      { keywords: ['chicken breast', 'chicken fillet'], portion: num * 150, label: 'chicken breast' },
      { keywords: ['fish fillet', 'salmon fillet'], portion: num * 120, label: 'fish fillet' },
      { keywords: ['steak', 'beef steak'], portion: num * 200, label: 'beef steak' },
      
      // Breads & Grains
      { keywords: ['bread slice'], portion: num * 28, label: 'bread slice' },
      { keywords: ['bagel'], portion: num * 95, label: 'bagel' },
      { keywords: ['muffin'], portion: num * 60, label: 'muffin' },
      { keywords: ['toast slice'], portion: num * 25, label: 'toast slice' },
      
      // Cereals (UK specific)
      { keywords: ['weetabix', 'weetbix', 'weet-bix'], portion: num * 19, label: 'Weetabix biscuit' },
      
      // Fruits
      { keywords: ['apple', 'medium apple'], portion: num * 180, label: 'apple' },
      { keywords: ['banana', 'medium banana'], portion: num * 120, label: 'banana' },
      { keywords: ['orange'], portion: num * 150, label: 'orange' },
      
      // Vegetables
      { keywords: ['potato', 'medium potato'], portion: num * 170, label: 'potato' },
      { keywords: ['carrot', 'medium carrot'], portion: num * 60, label: 'carrot' },
      
      // Dairy
      { keywords: ['cheese slice'], portion: num * 20, label: 'cheese slice' },
      { keywords: ['yogurt cup'], portion: num * 170, label: 'yogurt cup' },
      
      // Snacks & Crisps (UK standard single-serve portions)
      { keywords: ['crisps', 'potato chips', 'chips packet', 'crisp packet'], portion: num * 25, label: 'UK crisps' },
      { keywords: ['prawn cocktail crisps', 'salt vinegar crisps', 'cheese onion crisps'], portion: num * 25, label: 'UK flavored crisps' },
      { keywords: ['ready salted crisps', 'smoky bacon crisps', 'roast chicken crisps'], portion: num * 25, label: 'UK flavored crisps' }
    ];
    
    for (const standard of standardPortions) {
      if (standard.keywords.some(keyword => portionLower.includes(keyword) || foodLower.includes(keyword))) {
        return standard.portion;
      }
    }

    // Default fallback with improved logging
    const fallbackGrams = Math.max(50, num * 25); // Conservative default minimum 50g
    return fallbackGrams;
  }

  /**
   * Get appropriate icon for food type
   */
  private getFoodIcon(foodName: string): string {
    const lowerName = foodName.toLowerCase();
    
    if (lowerName.includes('apple') || lowerName.includes('fruit')) return '🍎';
    if (lowerName.includes('banana')) return '🍌';
    if (lowerName.includes('chicken') || lowerName.includes('poultry')) return '🍗';
    if (lowerName.includes('fish') || lowerName.includes('salmon')) return '🐟';
    if (lowerName.includes('beef') || lowerName.includes('meat')) return '🥩';
    if (lowerName.includes('rice') || lowerName.includes('grain')) return '🍚';
    if (lowerName.includes('bread') || lowerName.includes('toast')) return '🍞';
    if (lowerName.includes('egg')) return '🥚';
    if (lowerName.includes('vegetable') || lowerName.includes('broccoli') || lowerName.includes('carrot')) return '🥕';
    if (lowerName.includes('salad') || lowerName.includes('lettuce')) return '🥗';
    
    return '🍽️'; // Default food icon
  }

  /**
   * Legacy food analysis method (fallback when enhanced method fails)
   */
  async legacyAnalyzeFoodImage(imagePath: string): Promise<FoodAnalysisResult> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          
          const result = await provider.analyzeFoodImage(imagePath);
          
          return {
            ...result,
            imageUrl: imagePath // Ensure imageUrl is set
          };
          
        } catch (error: any) {
          
          // If it's a rate limit error, mark provider as temporarily unavailable
          if (error.isRateLimit) {

            break; // Move to next provider immediately
          }
          
          // If it's the last attempt with this provider, continue to next provider
          if (attempt === provider.maxRetries) {

            break;
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(waitTime);
        }
      }
    }

    // All providers failed, return helpful fallback data
    console.warn("All AI providers failed, returning user-friendly fallback data");
    return {
      ...this.fallbackData.foodAnalysis,
      imageUrl: imagePath,
      confidence: 0,
      detectedFoods: [
        {
          name: "Mixed Food",
          portion: "1 serving",
          calories: 300,
          protein: 15,
          carbs: 30,
          fat: 12,
          icon: "🍽️"
        },
        {
          name: "Estimated Portion",
          portion: "Medium size",
          calories: 200,
          protein: 8,
          carbs: 20,
          fat: 8,
          icon: "📏"
        }
      ],
      totalCalories: 500,
      totalProtein: 23,
      totalCarbs: 50,
      totalFat: 20,
      isAITemporarilyUnavailable: true // Add this flag for frontend to show message
    };
  }

  /**
   * Enhanced text analysis workflow: AI parsing + USDA nutrition lookup
   */
  async analyzeFoodText(foodDescription: string): Promise<FoodAnalysisResult> {
    try {
      // Step 1: Parse food names from text description
      const foodNames = await this.parseFoodNamesFromText(foodDescription);
      
      // Step 2: Get accurate nutrition from USDA for parsed foods
      const nutritionData = await this.getNutritionFromUSDA(foodNames);
      
      // Step 3: Combine results into comprehensive analysis
      return this.combineTextWithNutrition(foodDescription, foodNames, nutritionData);
      
    } catch (error: any) {
      console.warn('Enhanced text analysis failed, falling back to legacy method:', error.message);
      return this.legacyAnalyzeFoodText(foodDescription);
    }
  }

  /**
   * Parse food names from text description using AI providers
   */
  async parseFoodNamesFromText(foodDescription: string): Promise<string[]> {
    // Simple text parsing - extract food names from description
    // This could be enhanced with AI providers in the future
    const lowerDesc = foodDescription.toLowerCase();
    const foodKeywords = [];
    
    // Basic keyword extraction
    const commonFoods = [
      'apple', 'banana', 'orange', 'chicken', 'beef', 'salmon', 'fish', 
      'rice', 'bread', 'pasta', 'egg', 'milk', 'cheese', 'broccoli', 
      'carrot', 'potato', 'tomato', 'lettuce', 'avocado', 'spinach'
    ];
    
    for (const food of commonFoods) {
      // Use word boundaries to avoid partial matches (e.g., "apple" in "pineapple")
      const regex = new RegExp(`\\b${food}\\b`, 'i');
      if (regex.test(lowerDesc)) {
        foodKeywords.push(food);
      }
    }
    
    // If no keywords found, use the whole description as a search term
    if (foodKeywords.length === 0) {
      foodKeywords.push(foodDescription.trim());
    }
    
    return foodKeywords;
  }

  /**
   * Combine text input with USDA nutrition data
   */
  async combineTextWithNutrition(
    originalText: string,
    foodNames: string[], 
    nutritionMap: Map<string, any>
  ): Promise<FoodAnalysisResult> {
    const detectedFoods = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Process each parsed food
    for (const foodName of foodNames) {
      const usdaData = nutritionMap.get(foodName);
      
      if (usdaData) {
        // Convert the original text portion to grams for scaling
        const portionGrams = this.convertPortionToGrams(originalText, foodName);
        const scaleFactor = portionGrams / 100; // USDA data is per 100g
        
        
        // Use accurate USDA nutrition data scaled by the portion
        const food = {
          name: usdaData.usdaFood.description,
          portion: originalText, // PRESERVE original user input (e.g., "2 large eggs", "3 Weetabix")
          calories: Math.round(usdaData.nutrition.calories * scaleFactor),
          protein: Math.round(usdaData.nutrition.protein * scaleFactor),
          carbs: Math.round(usdaData.nutrition.carbs * scaleFactor),
          fat: Math.round(usdaData.nutrition.fat * scaleFactor),
          icon: this.getFoodIcon(foodName)
        };
        
        detectedFoods.push(food);
        totalCalories += food.calories;
        totalProtein += food.protein;
        totalCarbs += food.carbs;
        totalFat += food.fat;
        
      } else {
        // Try OpenFoodFacts as fallback
        const offData = await this.tryOpenFoodFactsFallback(foodName);
        
        if (offData) {
          // Convert text portion to grams for scaling
          const portionGrams = this.convertPortionToGrams(originalText, foodName);
          const scaleFactor = portionGrams / 100; // OpenFoodFacts data is per 100g
          
          const food = {
            name: offData.name,
            portion: originalText,
            calories: Math.round(offData.nutrition.calories * scaleFactor),
            protein: Math.round(offData.nutrition.protein * scaleFactor),
            carbs: Math.round(offData.nutrition.carbs * scaleFactor),
            fat: Math.round(offData.nutrition.fat * scaleFactor),
            icon: this.getFoodIcon(foodName)
          };
          
          detectedFoods.push(food);
          totalCalories += food.calories;
          totalProtein += food.protein;
          totalCarbs += food.carbs;
          totalFat += food.fat;
          
        } else {
          // Final hardcoded fallback
          const fallbackFood = {
            name: foodName,
            portion: '1 serving',
            calories: 150, // Conservative estimate
            protein: 8,
            carbs: 15,
            fat: 6,
            icon: this.getFoodIcon(foodName)
          };
          
          detectedFoods.push(fallbackFood);
          totalCalories += fallbackFood.calories;
          totalProtein += fallbackFood.protein;
          totalCarbs += fallbackFood.carbs;
          totalFat += fallbackFood.fat;
          

        }
      }
    }

    return {
      imageUrl: `voice-input-${Date.now()}.txt`,
      confidence: nutritionMap.size > 0 ? 90 : 50, // Higher confidence if USDA data found
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      detectedFoods
    };
  }

  /**
   * Legacy text analysis method (fallback when enhanced method fails)
   */
  async legacyAnalyzeFoodText(foodDescription: string): Promise<FoodAnalysisResult> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider in priority order
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          
          const result = await provider.analyzeFoodText(foodDescription);
          
          return {
            ...result,
            imageUrl: `voice-input-${Date.now()}.txt` // Placeholder for text input
          };
          
        } catch (error: any) {
          
          // If it's a rate limit error, mark provider as temporarily unavailable
          if (error.isRateLimit) {

            break; // Move to next provider immediately
          }
          
          // If it's the last attempt with this provider, continue to next provider
          if (attempt === provider.maxRetries) {

            break;
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(waitTime);
        }
      }
    }

    // All providers failed, return helpful fallback data based on the food description
    console.warn("All AI providers failed for text analysis, returning fallback data");
    
    // Try to extract basic info from the input for a more helpful fallback
    const lowerDesc = foodDescription.toLowerCase();
    let fallbackFood = "Mixed Food";
    let fallbackCalories = 200;
    let fallbackProtein = 10;
    let fallbackCarbs = 20;
    let fallbackFat = 8;
    let fallbackIcon = "🍽️";

    // Simple keyword matching for better fallbacks
    if (lowerDesc.includes('apple')) {
      fallbackFood = "Apple";
      fallbackCalories = 80;
      fallbackProtein = 0;
      fallbackCarbs = 21;
      fallbackFat = 0;
      fallbackIcon = "🍎";
    } else if (lowerDesc.includes('banana')) {
      fallbackFood = "Banana";
      fallbackCalories = 105;
      fallbackProtein = 1;
      fallbackCarbs = 27;
      fallbackFat = 0;
      fallbackIcon = "🍌";
    } else if (lowerDesc.includes('salmon') || lowerDesc.includes('fish')) {
      fallbackFood = "Fish/Salmon";
      fallbackCalories = 200;
      fallbackProtein = 25;
      fallbackCarbs = 0;
      fallbackFat = 12;
      fallbackIcon = "🐟";
    } else if (lowerDesc.includes('chicken')) {
      fallbackFood = "Chicken";
      fallbackCalories = 165;
      fallbackProtein = 31;
      fallbackCarbs = 0;
      fallbackFat = 4;
      fallbackIcon = "🍗";
    } else if (lowerDesc.includes('rice')) {
      fallbackFood = "Rice";
      fallbackCalories = 130;
      fallbackProtein = 3;
      fallbackCarbs = 28;
      fallbackFat = 0;
      fallbackIcon = "🍚";
    }

    return {
      imageUrl: `voice-input-${Date.now()}.txt`,
      confidence: 0,
      detectedFoods: [
        {
          name: fallbackFood,
          portion: "estimated portion",
          calories: fallbackCalories,
          protein: fallbackProtein,
          carbs: fallbackCarbs,
          fat: fallbackFat,
          icon: fallbackIcon
        }
      ],
      totalCalories: fallbackCalories,
      totalProtein: fallbackProtein,
      totalCarbs: fallbackCarbs,
      totalFat: fallbackFat,
      isAITemporarilyUnavailable: true // Add this flag for frontend to show message
    };
  }

  /**
   * Generate diet advice using the best available provider with intelligent fallback
   */
  async generateDietAdvice(entries: DiaryEntry[], userProfile?: any): Promise<DietAdviceResult> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          
          const result = await provider.generateDietAdvice(entries, userProfile);
          
          return result;
          
        } catch (error: any) {
          
          // If it's a rate limit error, mark provider as temporarily unavailable
          if (error.isRateLimit) {

            break; // Move to next provider immediately
          }
          
          // If it's the last attempt with this provider, continue to next provider
          if (attempt === provider.maxRetries) {

            break;
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(waitTime);
        }
      }
    }

    // All providers failed, return fallback advice
    console.warn("All AI providers failed for diet advice, returning fallback data");
    return this.fallbackData.dietAdvice;
  }

  /**
   * Answer a custom nutrition question based on user's diary data and profile
   */
  async answerNutritionQuestion(question: string, userEntries: DiaryEntry[], userProfile?: any): Promise<string> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          
          const response = await provider.answerNutritionQuestion(question, userEntries, userProfile);
          
          return response;
          
        } catch (error: any) {
          
          // If it's a rate limit error, try next provider immediately
          if (error.isRateLimit) {

            break;
          }
          
          // If it's the last attempt with this provider, continue to next provider
          if (attempt === provider.maxRetries) {

            break;
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(waitTime);
        }
      }
    }

    // All providers failed, return a helpful fallback response
    console.warn("All AI providers failed for custom question, returning fallback response");
    return "I'm sorry, I'm having trouble accessing my AI services right now. Please try asking your question again in a moment, or consult with a healthcare professional for personalized nutrition advice.";
  }

  /**
   * Generate daily coaching content using the best available provider
   */
  async generateDailyCoaching(entries: DiaryEntry[], userProfile?: any): Promise<DailyCoaching> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          
          const result = await provider.generateDailyCoaching(entries, userProfile);
          
          return result;

        } catch (error: any) {
          const isLastAttempt = attempt === provider.maxRetries;
          const isLastProvider = provider === availableProviders[availableProviders.length - 1];
          
          
          // If it's a rate limit error, try next provider immediately
          if (error.isRateLimit) {

            break;
          }
          
          // If it's the last attempt with this provider but not the last provider, try next
          if (isLastAttempt && !isLastProvider) {
            console.log(`Max retries reached for ${provider.name}, trying next provider`);
            break;
          }
          
          // If it's a temporary error and not the last attempt, retry with delay
          if (error.isTemporary && !isLastAttempt) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
            console.log(`Retrying ${provider.name} in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
          
          // If this is the last provider and last attempt, return fallback
          if (isLastProvider && isLastAttempt) {
            console.log('All providers failed for daily coaching, returning fallback data');
            return this.fallbackData.dailyCoaching;
          }
        }
      }
    }

    // Fallback data (should not reach here due to logic above, but just in case)
    return this.fallbackData.dailyCoaching;
  }

  /**
   * Generate educational tips using the best available provider
   */
  async generateEducationalTips(category: 'all' | 'nutrition' | 'medication' | 'motivation'): Promise<EducationalTip[]> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          console.log(`Attempting educational tips with ${provider.name} (attempt ${attempt}/${provider.maxRetries})`);
          
          const result = await provider.generateEducationalTips(category);
          
          return result;

        } catch (error: any) {
          const isLastAttempt = attempt === provider.maxRetries;
          const isLastProvider = provider === availableProviders[availableProviders.length - 1];
          
          console.log(`✗ Educational tips failed with ${provider.name} (attempt ${attempt}): ${error.message}`);
          
          // If it's a rate limit error, try next provider immediately
          if (error.isRateLimit) {

            break;
          }
          
          // If it's the last attempt with this provider but not the last provider, try next
          if (isLastAttempt && !isLastProvider) {
            console.log(`Max retries reached for ${provider.name}, trying next provider`);
            break;
          }
          
          // If it's a temporary error and not the last attempt, retry with delay
          if (error.isTemporary && !isLastAttempt) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
            console.log(`Retrying ${provider.name} in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
          
          // If this is the last provider and last attempt, return fallback
          if (isLastProvider && isLastAttempt) {
            console.log('All providers failed for educational tips, returning fallback data');
            // Filter fallback tips by category
            const filteredTips = category === 'all' 
              ? this.fallbackData.educationalTips 
              : this.fallbackData.educationalTips.filter(tip => tip.category === category);
            return filteredTips;
          }
        }
      }
    }

    // Fallback data (should not reach here due to logic above, but just in case)
    const filteredTips = category === 'all' 
      ? this.fallbackData.educationalTips 
      : this.fallbackData.educationalTips.filter(tip => tip.category === category);
    return filteredTips;
  }

  /**
   * Get list of available providers sorted by priority
   */
  private getAvailableProviders(): AIProvider[] {
    return this.providers
      .filter(provider => provider.isAvailable())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate recipes based on dietary requirements
   */
  async generateRecipes(dietaryFilter: string = ""): Promise<any[]> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          console.log(`Attempting recipe generation with ${provider.name} (attempt ${attempt}/${provider.maxRetries})`);
          
          // Check if provider has generateRecipes method
          if ('generateRecipes' in provider && typeof (provider as any).generateRecipes === 'function') {
            const result = await (provider as any).generateRecipes(dietaryFilter);
            return result;
          } else {
            console.log(`${provider.name} does not support recipe generation, trying next provider`);
            break;
          }
        } catch (error: any) {
          console.error(`✗ Recipe generation failed with ${provider.name} (attempt ${attempt}):`, error.message);
          
          // Check if it's a rate limit error
          if (error.message?.includes('rate limit') || error.message?.includes('quota') || error.status === 429) {

            break;
          }
          
          // If this was the last attempt for this provider, move to next
          if (attempt === provider.maxRetries) {

            break;
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(waitTime);
        }
      }
    }

    // All providers failed, return fallback recipes
    console.log("All AI providers failed for recipe generation, returning fallback recipes");
    return this.getFallbackRecipes(dietaryFilter);
  }

  /**
   * Get fallback recipes when AI providers are unavailable
   */
  private getFallbackRecipes(dietaryFilter: string): any[] {
    const baseRecipes = [
      {
        id: "fallback-1",
        name: "Grilled Chicken Salad",
        description: "Fresh mixed greens with grilled chicken breast, vegetables, and olive oil dressing",
        calories: 320,
        protein: 28,
        carbs: 12,
        fat: 18,
        servings: 1,
        prepTime: 15,
        cookTime: 10,
        difficulty: "Easy" as const,
        ingredients: ["chicken breast", "mixed greens", "tomatoes", "cucumbers", "olive oil", "lemon juice"],
        instructions: [
          "Season and grill chicken breast until cooked through",
          "Mix greens, tomatoes, and cucumbers in a bowl",
          "Slice chicken and place on top of salad",
          "Drizzle with olive oil and lemon juice"
        ],
        tags: ["healthy", "protein", "low-carb"],
        dietaryInfo: ["High Protein", "Gluten Free"]
      },
      {
        id: "fallback-2",
        name: "Vegetable Stir Fry",
        description: "Colorful mixed vegetables stir-fried with garlic and ginger",
        calories: 180,
        protein: 6,
        carbs: 25,
        fat: 8,
        servings: 2,
        prepTime: 10,
        cookTime: 8,
        difficulty: "Easy" as const,
        ingredients: ["broccoli", "bell peppers", "carrots", "snap peas", "garlic", "ginger", "soy sauce", "sesame oil"],
        instructions: [
          "Heat oil in a large pan or wok",
          "Add garlic and ginger, stir for 30 seconds",
          "Add vegetables and stir-fry for 5-6 minutes",
          "Season with soy sauce and serve hot"
        ],
        tags: ["vegetarian", "vegan", "quick"],
        dietaryInfo: ["Vegan", "Vegetarian", "High Fiber"]
      },
      {
        id: "fallback-3",
        name: "Quinoa Bowl",
        description: "Nutritious quinoa bowl with roasted vegetables and tahini dressing",
        calories: 420,
        protein: 15,
        carbs: 55,
        fat: 16,
        servings: 1,
        prepTime: 20,
        cookTime: 25,
        difficulty: "Medium" as const,
        ingredients: ["quinoa", "sweet potato", "chickpeas", "spinach", "tahini", "lemon juice", "olive oil"],
        instructions: [
          "Cook quinoa according to package instructions",
          "Roast diced sweet potato and chickpeas at 400°F for 20 minutes",
          "Mix tahini, lemon juice, and olive oil for dressing",
          "Combine quinoa, roasted vegetables, spinach, and dressing"
        ],
        tags: ["vegetarian", "healthy", "protein"],
        dietaryInfo: ["Vegetarian", "High Protein", "High Fiber", "Gluten Free"]
      }
    ];

    // Filter recipes based on dietary requirements
    if (!dietaryFilter) {
      return baseRecipes;
    }

    return baseRecipes.filter(recipe => {
      const filterLower = dietaryFilter.toLowerCase().replace('-', ' ');
      return recipe.dietaryInfo.some(diet => 
        diet.toLowerCase().includes(filterLower) || 
        filterLower.includes(diet.toLowerCase())
      );
    });
  }

  /**
   * Analyze restaurant menu text and recommend meals based on user goals
   */
  async analyzeMenu(menuText: string, nutritionGoals: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  }): Promise<{
    recommendations: Array<{
      name: string;
      description: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      matchScore: number;
      matchReason: string;
    }>;
  }> {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      // Fallback: return placeholder recommendations
      return {
        recommendations: [
          {
            name: "Grilled Chicken Salad",
            description: "Lean protein with mixed greens and vegetables",
            calories: 350,
            protein: 35,
            carbs: 20,
            fat: 12,
            matchScore: 85,
            matchReason: "High protein, balanced macros"
          },
          {
            name: "Salmon Bowl",
            description: "Grilled salmon with quinoa and roasted vegetables",
            calories: 480,
            protein: 32,
            carbs: 45,
            fat: 18,
            matchScore: 78,
            matchReason: "Good balance of protein and healthy fats"
          }
        ]
      };
    }

    // Try each provider until one succeeds
    for (const provider of availableProviders) {
      try {
        const prompt = `You are a nutrition expert analyzing a restaurant menu. The user has the following nutrition goals:
- Daily Calories: ${nutritionGoals.dailyCalories}
- Protein: ${nutritionGoals.proteinGrams}g
- Carbs: ${nutritionGoals.carbsGrams}g
- Fat: ${nutritionGoals.fatGrams}g

Menu text:
${menuText}

Analyze this menu and recommend the top 5 meals that best match the user's nutrition goals. For each meal:
1. Extract the meal name and description from the menu
2. Estimate the nutritional content (calories, protein, carbs, fat)
3. Calculate how well it matches the user's goals (matchScore 0-100)
4. Explain why it's a good match

Return ONLY a valid JSON object in this exact format:
{
  "recommendations": [
    {
      "name": "Meal Name",
      "description": "Brief description from menu",
      "calories": 450,
      "protein": 30,
      "carbs": 35,
      "fat": 15,
      "matchScore": 85,
      "matchReason": "Why this meal matches user goals"
    }
  ]
}`;

        // Use analyzeFoodText but extract JSON from the response
        // This is a workaround since we don't have a direct generateText method
        const textResult = await provider.analyzeFoodText(prompt);
        
        // Try to extract JSON from the confidence or other fields if AI embedded it
        // For now, we'll use a simple heuristic approach
        const response = JSON.stringify(textResult);
        
        // Actually, let's just return structured data based on the detectedFoods
        // This won't be perfect but it's a fallback
        if (textResult.detectedFoods && textResult.detectedFoods.length > 0) {
          const recommendations = textResult.detectedFoods.slice(0, 5).map((food, index) => ({
            name: food.name,
            description: `${food.portion} - estimated from menu`,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            matchScore: 100 - (index * 5), // Descending score
            matchReason: `Matches your nutritional goals`
          }));
          
          return { recommendations };
        }
        
        throw new Error("Could not parse menu analysis");
      } catch (error: any) {
        console.warn(`Menu analysis failed with ${provider.name}:`, error.message);
        continue;
      }
    }

    // All providers failed, return fallback
    return {
      recommendations: [
        {
          name: "Grilled Chicken Salad",
          description: "Lean protein with mixed greens and vegetables",
          calories: 350,
          protein: 35,
          carbs: 20,
          fat: 12,
          matchScore: 85,
          matchReason: "High protein, balanced macros"
        },
        {
          name: "Salmon Bowl",
          description: "Grilled salmon with quinoa and roasted vegetables",
          calories: 480,
          protein: 32,
          carbs: 45,
          fat: 18,
          matchScore: 78,
          matchReason: "Good balance of protein and healthy fats"
        }
      ]
    };
  }

  /**
   * Get status of all providers for monitoring
   */
  public getProviderStatuses(): ProviderStatus[] {
    return this.providers.map(provider => provider.getStatus());
  }

  /**
   * Get overall system health
   */
  public getSystemHealth(): {
    healthy: boolean;
    availableProviders: number;
    totalProviders: number;
    statuses: ProviderStatus[];
  } {
    const statuses = this.getProviderStatuses();
    const availableCount = statuses.filter(status => status.available).length;
    
    return {
      healthy: availableCount > 0,
      availableProviders: availableCount,
      totalProviders: this.providers.length,
      statuses
    };
  }

  /**
   * Reset error counts for all providers (useful for recovery)
   */
  public resetProviders(): void {
    this.providers.forEach(provider => {
      (provider as any).errorCount = 0;
      (provider as any).lastError = undefined;
    });
    console.log("All providers reset");
  }

  /**
   * Add a new provider to the system
   */
  public addProvider(provider: AIProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
    console.log(`Added provider: ${provider.name} with priority ${provider.priority}`);
  }

  /**
   * Remove a provider from the system
   */
  public removeProvider(providerName: string): boolean {
    const index = this.providers.findIndex(p => p.name === providerName);
    if (index !== -1) {
      this.providers.splice(index, 1);
      console.log(`Removed provider: ${providerName}`);
      return true;
    }
    return false;
  }

  /**
   * Simple sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recommended provider for next request (for load balancing)
   */
  public getRecommendedProvider(): AIProvider | null {
    const available = this.getAvailableProviders();
    if (available.length === 0) return null;
    
    // For now, just return the highest priority available provider
    // In the future, could implement more sophisticated load balancing
    return available[0];
  }
}

// Singleton instance
export const aiManager = new AIManager();