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
        const nutrient = nutrients.find(n => n.nutrient && n.nutrient.number === number);
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
   * Preprocess food names for better USDA matching
   */
  private preprocessFoodName(foodName: string): string {
    const name = foodName.toLowerCase().trim();
    
    // Handle British/International food terms
    if (name.includes('back bacon') || name.includes('bacon back')) {
      return 'pork bacon cured';
    }
    if (name.includes('black pudding')) {
      return 'blood sausage';
    }
    if (name.includes('streaky bacon')) {
      return 'pork bacon belly';
    }
    if (name.includes('rashers')) {
      return 'bacon strips';
    }
    
    // Force pork variants for generic meat terms to avoid meatless alternatives
    if (name.includes('bacon') && !name.includes('turkey') && !name.includes('chicken') && !name.includes('beef') && !name.includes('meatless') && !name.includes('veggie')) {
      if (name.includes('slice') || name.includes('rashers')) {
        return 'pork bacon slice';
      }
      return 'pork bacon cured';
    }
    
    if (name.includes('sausage') && !name.includes('chicken') && !name.includes('turkey') && !name.includes('meatless') && !name.includes('veggie')) {
      if (name.includes('link')) {
        return 'pork breakfast sausage link';
      }
      if (name.includes('patty')) {
        return 'pork breakfast sausage patty';
      }
      return 'pork breakfast sausage';
    }
    
    // Handle common modifiers that confuse USDA search
    let processed = name
      .replace(/\b(2|two|3|three|1|one)\s+(slice|slices|piece|pieces|strip|strips)\b/g, '') // Remove portion descriptors
      .replace(/\b(approx\.?|approximately)\s*\d+g?\b/g, '') // Remove weight estimates
      .replace(/\b\d+g\b/g, '') // Remove gram measurements
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // If we removed too much, return the original
    if (processed.length < 3) {
      return foodName;
    }
    
    return processed;
  }

  /**
   * Find the best matching USDA food for a detected food name
   */
  async findBestMatch(foodName: string): Promise<{ usdaFood: USDAFood; nutrition: NutritionData } | null> {
    try {
      // Preprocess food names to improve USDA matching
      const searchTerm = this.preprocessFoodName(foodName);
      console.log(`🔍 Preprocessed "${foodName}" → "${searchTerm}" for USDA search`);
      
      const searchResults = await this.searchFoods(searchTerm, 10);
      
      if (searchResults.foods.length === 0) {
        console.log(`❌ No USDA matches found for: ${foodName}`);
        return null;
      }

      // Enhanced scoring: prefer generic/average entries over branded/extreme ones
      const scoredFoods = searchResults.foods.map(food => {
        const description = food.description.toLowerCase();
        const nutrientCount = food.foodNutrients.length;
        const hasBasicNutrients = ['203', '204', '205', '208'].every(id => 
          food.foodNutrients.some(n => n.nutrient && n.nutrient.number === id && n.amount > 0)
        );
        
        let score = nutrientCount + (hasBasicNutrients ? 100 : 0);
        
        // Handle British/International food names
        const searchName = foodName.toLowerCase();
        
        // Hard filter meatless alternatives when searching for real meat (unless explicitly requested)
        const isMeatlessAlternative = /(meatless|vegetarian|veggie|plant[- ]based|meat substitute)/i.test(description);
        const requestedMeatless = /(meatless|vegetarian|veggie|plant[- ]based)/i.test(searchName);
        if (isMeatlessAlternative && !requestedMeatless) {
          console.log(`🚫 Filtering meatless alternative: ${food.description}`);
          score -= 1000; // Heavy penalty to ensure real meat products rank higher
        }

        // ===== ENHANCED GENERIC/AVERAGE PREFERENCE LOGIC =====
        
        // Heavily penalize branded entries (identifiable by ALL CAPS brands)
        const brandPatterns = [
          /\b[A-Z]{2,}\s+[A-Z]{2,}/, // Multiple ALL CAPS words (test against original description)
          /\b(WENDY'S|MCDONALD'S|BURGER KING|KFC|TACO BELL|SUBWAY|DOMINO'S|PIZZA HUT)\b/i,
          /\b(OSCAR MAYER|JOHNSONVILLE|HORMEL|TYSON|BUTTERBALL|HILLSHIRE FARM)\b/i,
          /\b(KRAFT|HEINZ|CAMPBELL'S|NESTLE|KELLOGG'S|GENERAL MILLS)\b/i
        ];
        
        // Test ALL CAPS pattern against original description, others against lowercased
        const isBranded = brandPatterns.some((pattern, index) => {
          if (index === 0) { // First pattern checks ALL CAPS - test original description
            return pattern.test(food.description);
          }
          return pattern.test(description); // Other patterns use /i flag - test lowercased
        });
        if (isBranded) {
          score -= 200; // Heavy penalty for branded items
          console.log(`📉 Branded entry penalty: ${food.description}`);
        }
        
        // Boost generic/simple descriptions
        const genericBoosts = [
          { pattern: /^[a-z\s,]+, raw$/, boost: 150, label: "raw generic" },
          { pattern: /^[a-z\s,]+, cooked$/, boost: 140, label: "cooked generic" },
          { pattern: /^[a-z\s,]+, fresh$/, boost: 130, label: "fresh generic" },
          { pattern: /^\w+, \w+$/, boost: 120, label: "simple two-word" }, // e.g., "Bacon, pork"
          { pattern: /^(pork|beef|chicken|fish|turkey), /, boost: 110, label: "generic meat" },
          { pattern: /, average/, boost: 100, label: "average entry" },
          { pattern: /, typical/, boost: 95, label: "typical entry" },
          { pattern: /, standard/, boost: 90, label: "standard entry" }
        ];
        
        for (const { pattern, boost, label } of genericBoosts) {
          if (pattern.test(description)) {
            score += boost;
            console.log(`📈 Generic boost (+${boost}) for ${label}: ${food.description}`);
            break; // Apply only the first matching boost
          }
        }
        
        // Penalize extreme/jumbo portions
        const extremePatterns = [
          { pattern: /\b(jumbo|giant|super|mega|extra[\s-]large|xl|xxl)\b/i, penalty: 150, label: "jumbo size" },
          { pattern: /\b(double|triple|quad)\b/i, penalty: 120, label: "multiple portions" },
          { pattern: /\b(premium|deluxe|gourmet|specialty)\b/i, penalty: 80, label: "premium variant" },
          { pattern: /\b(loaded|stuffed|supreme)\b/i, penalty: 100, label: "loaded variant" }
        ];
        
        for (const { pattern, penalty, label } of extremePatterns) {
          if (pattern.test(description)) {
            score -= penalty;
            console.log(`📉 Extreme penalty (-${penalty}) for ${label}: ${food.description}`);
            break; // Apply only the first matching penalty
          }
        }
        
        // Boost USDA SR Legacy and Foundation data (more reliable)
        if (description.includes('includes foods for usda')) {
          score += 80;
          console.log(`📈 USDA reliable data boost: ${food.description}`);
        }
        
        // Penalize overly specific preparations unless requested
        const specificPreparations = [
          'breaded and fried', 'with sauce', 'in gravy', 'with cheese sauce',
          'honey glazed', 'teriyaki', 'bbq', 'buffalo', 'ranch'
        ];
        
        const hasSpecificPrep = specificPreparations.some(prep => description.includes(prep));
        if (hasSpecificPrep && !searchName.includes('sauce') && !searchName.includes('glazed')) {
          score -= 60;
          console.log(`📉 Specific preparation penalty: ${food.description}`);
        }
        
        if (searchName.includes('back bacon') || searchName.includes('bacon')) {
          if (description.includes('pork') && description.includes('bacon')) score += 150;
          if (description.includes('chicken') || description.includes('turkey')) score -= 200; // Avoid poultry for bacon
        }
        if (searchName.includes('black pudding')) {
          if (description.includes('sausage') || description.includes('blood')) score += 150;
          if (description.includes('banana') || description.includes('chocolate')) score -= 200; // Avoid desserts
        }
        
        // Boost breakfast sausage forms when searching for sausage
        if (searchName.includes('sausage')) {
          if (description.includes('pork') && (description.includes('breakfast') || description.includes('link') || description.includes('patty'))) {
            score += 150;
          }
        }
        
        // Boost whole foods
        if (description.includes('raw') || description.includes('fresh')) score += 50;
        if (description.split(',').length <= 2) score += 30; // Prefer simple descriptions
        
        // Penalize processed foods
        if (description.includes('croissant') || description.includes('cake') || description.includes('cookie')) score -= 100;
        if (description.includes('canned') || description.includes('frozen prepared')) score -= 20;
        if (description.includes('with ') || description.includes('sauce') || description.includes('dressing')) score -= 15;
        
        // CRITICAL: Heavy penalty for processed egg products when searching for simple eggs
        if (searchName.includes('egg') && !searchName.includes('custard') && !searchName.includes('mix')) {
          if (description.includes('custard') || description.includes('mix') || description.includes('prepared') || 
              description.includes('scrambled') || description.includes('deviled') || description.includes('salad')) {
            score -= 300; // Heavy penalty for processed egg products
            console.log(`📉 Processed egg penalty (-300): ${food.description}`);
          }
          
          // Boost simple, raw eggs when searching for basic eggs
          if ((description.includes('eggs, grade') || description.includes('egg, whole')) && 
              (description.includes('raw') || !description.includes('cooked'))) {
            score += 200; // Huge boost for simple raw eggs
            console.log(`📈 Simple egg boost (+200): ${food.description}`);
          }
        }
        
        // Exact matches get huge boost
        if (description.startsWith(foodName.toLowerCase())) score += 200;
        
        // Boost bacon-related foods when searching for bacon
        if (searchName.includes('bacon')) {
          if (description.includes('bacon') && description.includes('pork')) score += 100;
          if (description.includes('cured') && description.includes('pork')) score += 75;
        }
        
        return { food, score };
      });

      // Get the highest scoring food and fetch full details for accurate nutrition
      const bestMatch = scoredFoods.sort((a, b) => b.score - a.score)[0];
      
      // Replace debug logs with compact summary
      console.log(`🔍 Top candidates for "${foodName}":`, scoredFoods
        .slice(0, 3)
        .map(x => `${x.food.description} [${x.score}]`)
        .join(' | '));
      
      // Fetch full food details for complete nutrition data
      const fullFoodDetails = await this.getFoodDetails(bestMatch.food.fdcId);
      const nutrition = this.extractNutritionData(fullFoodDetails);
      
      console.log(`🧪 Nutrient numbers present:`, fullFoodDetails.foodNutrients.map(n => n.nutrient?.number));
      console.log(`✅ Best USDA match for "${foodName}": ${fullFoodDetails.description}`);
      
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
   * Clear the entire cache to force fresh searches
   */
  clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cleared USDA cache (${cacheSize} entries removed)`);
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