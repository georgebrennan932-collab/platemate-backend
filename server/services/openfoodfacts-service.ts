interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface CachedFood {
  food: string;
  nutrition_per_100g: NutritionData | "not found";
  cachedAt: number;
}

interface OpenFoodFactsResponse {
  products: Array<{
    product_name: string;
    nutriments: {
      'energy-kcal_100g'?: number;
      'proteins_100g'?: number;
      'carbohydrates_100g'?: number;
      'fat_100g'?: number;
    };
  }>;
}

export class OpenFoodFactsService {
  private cache = new Map<string, CachedFood>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly BASE_URL = 'https://world.openfoodfacts.org/api/v2/search';
  private readonly USER_AGENT = 'PlateMate/1.0 (platemate@replit.app)';

  /**
   * Get nutrition data for a list of food names
   */
  async getNutritionData(foodNames: string[]): Promise<Array<{ food: string; nutrition_per_100g: NutritionData | "not found" }>> {
    const results = [];
    
    for (const foodName of foodNames) {
      const nutrition = await this.getFoodNutrition(foodName.trim());
      results.push({
        food: foodName.trim(),
        nutrition_per_100g: nutrition
      });
    }
    
    return results;
  }

  /**
   * Get nutrition data for a single food item
   */
  private async getFoodNutrition(foodName: string): Promise<NutritionData | "not found"> {
    // Check cache first
    const cached = this.getCachedData(foodName);
    if (cached) {
      return cached.nutrition_per_100g;
    }

    try {
      // Query Open Food Facts API
      const url = `${this.BASE_URL}?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=1&fields=product_name,nutriments`;
      
      console.log(`🌍 Querying Open Food Facts for: ${foodName}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OpenFoodFactsResponse = await response.json();
      
      if (!data.products || data.products.length === 0) {
        console.log(`❌ No data found for: ${foodName}`);
        this.setCachedData(foodName, "not found");
        return "not found";
      }

      const product = data.products[0];
      const nutriments = product.nutriments;

      // Extract nutrition data per 100g
      const nutrition: NutritionData = {
        calories: Math.round(nutriments['energy-kcal_100g'] || 0),
        protein: Math.round((nutriments['proteins_100g'] || 0) * 10) / 10, // Round to 1 decimal
        carbs: Math.round((nutriments['carbohydrates_100g'] || 0) * 10) / 10,
        fat: Math.round((nutriments['fat_100g'] || 0) * 10) / 10
      };

      console.log(`✅ Found nutrition data for ${foodName}:`, nutrition);
      
      // Cache the result
      this.setCachedData(foodName, nutrition);
      
      return nutrition;
      
    } catch (error) {
      console.error(`❌ Error fetching nutrition data for ${foodName}:`, error);
      this.setCachedData(foodName, "not found");
      return "not found";
    }
  }

  /**
   * Get cached data if valid
   */
  private getCachedData(foodName: string): CachedFood | null {
    const normalizedName = foodName.toLowerCase().trim();
    const cached = this.cache.get(normalizedName);
    
    if (!cached) {
      return null;
    }

    // Check if cache is still valid (24 hours)
    const now = Date.now();
    if (now - cached.cachedAt > this.CACHE_DURATION) {
      console.log(`⏰ Cache expired for: ${foodName}`);
      this.cache.delete(normalizedName);
      return null;
    }

    console.log(`💾 Using cached data for: ${foodName}`);
    return cached;
  }

  /**
   * Cache nutrition data
   */
  private setCachedData(foodName: string, nutrition: NutritionData | "not found"): void {
    const normalizedName = foodName.toLowerCase().trim();
    this.cache.set(normalizedName, {
      food: foodName,
      nutrition_per_100g: nutrition,
      cachedAt: Date.now()
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        food: key,
        hasData: value.nutrition_per_100g !== "not found",
        cachedAt: new Date(value.cachedAt).toISOString()
      }))
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of Array.from(this.cache.entries())) {
      if (now - value.cachedAt > this.CACHE_DURATION) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    console.log(`🧹 Cleared ${cleared} expired cache entries`);
    return cleared;
  }
}

// Export singleton instance
export const openFoodFactsService = new OpenFoodFactsService();