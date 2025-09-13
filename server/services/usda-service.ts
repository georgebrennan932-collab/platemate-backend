// Use Node.js built-in fetch (available in Node 18+)

export interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients: {
    nutrient: {
      id: number;
      number: string;
      name: string;
      rank: number;
      unitName: string;
    };
    amount: number;
  }[];
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
}

export interface USDASearchResult {
  foods: USDAFood[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

export interface NutritionData {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  fiber?: number;  // grams
  sugar?: number;  // grams
  sodium?: number; // mg
}

export class USDAService {
  private apiKey: string;
  private baseUrl = 'https://api.nal.usda.gov/fdc/v1';
  private cache = new Map<string, any>();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.apiKey = process.env.USDA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('USDA_API_KEY not found in environment variables');
    }
  }

  /**
   * Search for foods in the USDA database
   */
  async searchFoods(query: string, pageSize: number = 25): Promise<USDASearchResult> {
    if (!this.apiKey) {
      throw new Error('USDA API key not configured');
    }

    const cacheKey = `search:${query}:${pageSize}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📋 USDA search cache hit for: ${query}`);
      return cached;
    }

    try {
      console.log(`🔍 Searching USDA database for: ${query}`);
      
      const url = `${this.baseUrl}/foods/search?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR%20Legacy,Survey%20%28FNDDS%29`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('USDA API rate limit exceeded');
        }
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as USDASearchResult;
      
      // Cache the result
      this.setCache(cacheKey, data);
      
      console.log(`✅ Found ${data.foods.length} foods in USDA database for: ${query}`);
      return data;

    } catch (error: any) {
      console.error(`❌ USDA search failed for "${query}":`, error.message);
      throw error;
    }
  }

  /**
   * Get detailed nutrition information for a specific food
   */
  async getFoodDetails(fdcId: number): Promise<USDAFood> {
    if (!this.apiKey) {
      throw new Error('USDA API key not configured');
    }

    const cacheKey = `food:${fdcId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📋 USDA food cache hit for ID: ${fdcId}`);
      return cached;
    }

    try {
      console.log(`📊 Getting USDA food details for ID: ${fdcId}`);
      
      const url = `${this.baseUrl}/food/${fdcId}?api_key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('USDA API rate limit exceeded');
        }
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as USDAFood;
      
      // Cache the result
      this.setCache(cacheKey, data);
      
      console.log(`✅ Retrieved USDA food details for: ${data.description}`);
      return data;

    } catch (error: any) {
      console.error(`❌ USDA food details failed for ID ${fdcId}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract standard nutrition data from USDA food object
   */
  extractNutritionData(usdaFood: USDAFood, portionGrams: number = 100): NutritionData {
    const nutrients = usdaFood.foodNutrients;
    
    // USDA nutrient IDs for key macronutrients
    const findNutrient = (numbers: string[]) => {
      for (const number of numbers) {
        const nutrient = nutrients.find(n => n.nutrient.number === number);
        if (nutrient) return nutrient.amount;
      }
      return 0;
    };

    // Extract key nutrients (per 100g in USDA database)
    const calories = findNutrient(['208']); // Energy
    const protein = findNutrient(['203']); // Protein
    const carbs = findNutrient(['205']); // Carbohydrate, by difference
    const fat = findNutrient(['204']); // Total lipid (fat)
    const fiber = findNutrient(['291']); // Fiber, total dietary
    const sugar = findNutrient(['269']); // Sugars, total including NLEA
    const sodium = findNutrient(['307']); // Sodium, Na

    // Scale to requested portion size
    const scaleFactor = portionGrams / 100;

    return {
      calories: Math.round(calories * scaleFactor),
      protein: Math.round(protein * scaleFactor * 10) / 10, // 1 decimal
      carbs: Math.round(carbs * scaleFactor * 10) / 10,
      fat: Math.round(fat * scaleFactor * 10) / 10,
      fiber: fiber > 0 ? Math.round(fiber * scaleFactor * 10) / 10 : undefined,
      sugar: sugar > 0 ? Math.round(sugar * scaleFactor * 10) / 10 : undefined,
      sodium: sodium > 0 ? Math.round(sodium * scaleFactor) : undefined, // mg
    };
  }

  /**
   * Find the best matching USDA food for a detected food name
   */
  async findBestMatch(foodName: string): Promise<{ usdaFood: USDAFood; nutrition: NutritionData } | null> {
    try {
      const searchResults = await this.searchFoods(foodName, 10);
      
      if (searchResults.foods.length === 0) {
        console.log(`❌ No USDA matches found for: ${foodName}`);
        return null;
      }

      // Simple scoring: prefer foods with more complete nutrient data
      const scoredFoods = searchResults.foods.map(food => {
        const nutrientCount = food.foodNutrients.length;
        const hasBasicNutrients = ['203', '204', '205', '208'].every(id => 
          food.foodNutrients.some(n => n.nutrient.number === id && n.amount > 0)
        );
        
        // Score based on nutrient completeness and basic nutrient availability
        const score = nutrientCount + (hasBasicNutrients ? 100 : 0);
        return { food, score };
      });

      // Get the highest scoring food
      const bestMatch = scoredFoods.sort((a, b) => b.score - a.score)[0];
      const nutrition = this.extractNutritionData(bestMatch.food);

      console.log(`✅ Best USDA match for "${foodName}": ${bestMatch.food.description}`);
      
      return {
        usdaFood: bestMatch.food,
        nutrition
      };

    } catch (error: any) {
      console.error(`❌ USDA lookup failed for "${foodName}":`, error.message);
      return null;
    }
  }

  /**
   * Get multiple food matches efficiently
   */
  async findMultipleMatches(foodNames: string[]): Promise<Map<string, { usdaFood: USDAFood; nutrition: NutritionData }>> {
    const results = new Map();
    
    // Process foods sequentially to avoid rate limiting
    for (const foodName of foodNames) {
      try {
        const match = await this.findBestMatch(foodName);
        if (match) {
          results.set(foodName, match);
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`❌ Failed to find USDA match for "${foodName}":`, error.message);
        // Continue with other foods
      }
    }

    return results;
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const { data, timestamp } = cached;
    if (Date.now() - timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Simple cache cleanup - remove oldest entries if cache gets too large
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 200 entries
      for (let i = 0; i < 200; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Health check for USDA service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    if (!this.apiKey) {
      return { status: 'unhealthy', message: 'USDA API key not configured' };
    }

    try {
      // Simple test search
      await this.searchFoods('apple', 1);
      return { status: 'healthy', message: 'USDA API is responding normally' };
    } catch (error: any) {
      return { status: 'unhealthy', message: `USDA API error: ${error.message}` };
    }
  }
}

// Export singleton instance
export const usdaService = new USDAService();