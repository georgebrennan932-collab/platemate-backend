export class OpenFoodFactsService {
    constructor() {
        this.cache = new Map();
        this.barcodeCache = new Map();
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.BASE_URL = 'https://world.openfoodfacts.org/api/v2/search';
        this.PRODUCT_URL = 'https://world.openfoodfacts.org/api/v0/product';
        this.USER_AGENT = 'PlateMate/1.0 (platemate@replit.app)';
    }
    /**
     * Get nutrition data for a list of food names
     */
    async getNutritionData(foodNames) {
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
    async getFoodNutrition(foodName) {
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
            const data = await response.json();
            if (!data.products || data.products.length === 0) {
                console.log(`❌ No data found for: ${foodName}`);
                this.setCachedData(foodName, "not found");
                return "not found";
            }
            const product = data.products[0];
            const nutriments = product.nutriments;
            // Extract nutrition data per 100g
            const nutrition = {
                calories: Math.round(nutriments['energy-kcal_100g'] || 0),
                protein: Math.round((nutriments['proteins_100g'] || 0) * 10) / 10, // Round to 1 decimal
                carbs: Math.round((nutriments['carbohydrates_100g'] || 0) * 10) / 10,
                fat: Math.round((nutriments['fat_100g'] || 0) * 10) / 10
            };
            console.log(`✅ Found nutrition data for ${foodName}:`, nutrition);
            // Cache the result
            this.setCachedData(foodName, nutrition);
            return nutrition;
        }
        catch (error) {
            console.error(`❌ Error fetching nutrition data for ${foodName}:`, error);
            this.setCachedData(foodName, "not found");
            return "not found";
        }
    }
    /**
     * Get cached data if valid
     */
    getCachedData(foodName) {
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
    setCachedData(foodName, nutrition) {
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
     * Lookup product by barcode
     */
    async lookupByBarcode(barcode) {
        // Check barcode cache first
        const cached = this.getBarcodeCache(barcode);
        if (cached) {
            return {
                food: cached.food,
                nutrition_per_100g: cached.nutrition_per_100g,
                brand: cached.food.split(' (')[1]?.replace(')', ''),
                imageUrl: undefined // We don't cache images for now
            };
        }
        try {
            console.log(`🔍 Looking up barcode: ${barcode}`);
            const url = `${this.PRODUCT_URL}/${barcode}.json`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.USER_AGENT
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.status === 0 || !data.product) {
                console.log(`❌ Product not found for barcode: ${barcode}`);
                this.setBarcodeCache(barcode, `Unknown Product (${barcode})`, "not found");
                return {
                    food: `Unknown Product (${barcode})`,
                    nutrition_per_100g: "not found"
                };
            }
            const product = data.product;
            const productName = product.product_name_en || product.product_name || `Product ${barcode}`;
            const brand = product.brands?.split(',')[0]?.trim();
            const nutriments = product.nutriments || {};
            // Extract nutrition data per 100g
            const nutrition = {
                calories: Math.round(nutriments['energy-kcal_100g'] || 0),
                protein: Math.round((nutriments['proteins_100g'] || 0) * 10) / 10,
                carbs: Math.round((nutriments['carbohydrates_100g'] || 0) * 10) / 10,
                fat: Math.round((nutriments['fat_100g'] || 0) * 10) / 10
            };
            const displayName = brand ? `${productName} (${brand})` : productName;
            console.log(`✅ Found product: ${displayName}`);
            // Cache the result
            this.setBarcodeCache(barcode, displayName, nutrition);
            return {
                food: displayName,
                nutrition_per_100g: nutrition,
                brand,
                imageUrl: product.image_front_url || product.image_url
            };
        }
        catch (error) {
            console.error(`❌ Error looking up barcode ${barcode}:`, error);
            this.setBarcodeCache(barcode, `Unknown Product (${barcode})`, "not found");
            return {
                food: `Unknown Product (${barcode})`,
                nutrition_per_100g: "not found"
            };
        }
    }
    /**
     * Get cached barcode data if valid
     */
    getBarcodeCache(barcode) {
        const cached = this.barcodeCache.get(barcode);
        if (!cached) {
            return null;
        }
        // Check if cache is still valid (24 hours)
        const now = Date.now();
        if (now - cached.cachedAt > this.CACHE_DURATION) {
            console.log(`⏰ Barcode cache expired for: ${barcode}`);
            this.barcodeCache.delete(barcode);
            return null;
        }
        console.log(`💾 Using cached barcode data for: ${barcode}`);
        return cached;
    }
    /**
     * Cache barcode data
     */
    setBarcodeCache(barcode, productName, nutrition) {
        this.barcodeCache.set(barcode, {
            food: productName,
            nutrition_per_100g: nutrition,
            cachedAt: Date.now()
        });
    }
    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        let cleared = 0;
        for (const [key, value] of Array.from(this.cache.entries())) {
            if (now - value.cachedAt > this.CACHE_DURATION) {
                this.cache.delete(key);
                cleared++;
            }
        }
        // Clear barcode cache too
        for (const [key, value] of Array.from(this.barcodeCache.entries())) {
            if (now - value.cachedAt > this.CACHE_DURATION) {
                this.barcodeCache.delete(key);
                cleared++;
            }
        }
        console.log(`🧹 Cleared ${cleared} expired cache entries`);
        return cleared;
    }
}
// Export singleton instance
export const openFoodFactsService = new OpenFoodFactsService();
