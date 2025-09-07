import { AIProvider, FoodAnalysisResult, DietAdviceResult, DiaryEntry, ProviderError, ProviderStatus } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";

export class AIManager {
  private providers: AIProvider[] = [];
  private fallbackData: {
    foodAnalysis: FoodAnalysisResult;
    dietAdvice: DietAdviceResult;
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
            benefits: "High in protein and fiber to keep you full and energized throughout the morning"
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
            benefits: "Balanced nutrients with healthy fats and complete proteins for sustained energy"
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
            benefits: "Rich in omega-3s and antioxidants to support heart health and recovery"
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
            benefits: "Combines fiber and healthy fats for stable blood sugar and lasting satiety"
          }
        ]
      }
    };
  }

  /**
   * Analyze food image using the best available provider with intelligent fallback
   */
  async analyzeFoodImage(imagePath: string): Promise<FoodAnalysisResult> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          console.log(`Attempting food analysis with ${provider.name} (attempt ${attempt}/${provider.maxRetries})`);
          
          const result = await provider.analyzeFoodImage(imagePath);
          
          console.log(`✓ Food analysis successful with ${provider.name}`);
          return {
            ...result,
            imageUrl: imagePath // Ensure imageUrl is set
          };
          
        } catch (error: any) {
          console.log(`✗ Food analysis failed with ${provider.name} (attempt ${attempt}): ${error.message}`);
          
          // If it's a rate limit error, mark provider as temporarily unavailable
          if (error.isRateLimit) {
            console.log(`${provider.name} hit rate limit, trying next provider`);
            break; // Move to next provider immediately
          }
          
          // If it's the last attempt with this provider, continue to next provider
          if (attempt === provider.maxRetries) {
            console.log(`${provider.name} exhausted all retries, trying next provider`);
            break;
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(waitTime);
        }
      }
    }

    // All providers failed, return fallback with proper error indication
    console.log("All AI providers failed, returning fallback data");
    return {
      ...this.fallbackData.foodAnalysis,
      imageUrl: imagePath,
      confidence: 0,
      detectedFoods: [
        {
          name: "AI Analysis Unavailable",
          portion: "All AI services temporarily unavailable",
          calories: 250,
          protein: 12,
          carbs: 25,
          fat: 10,
          icon: "apple-alt"
        }
      ]
    };
  }

  /**
   * Generate diet advice using the best available provider with intelligent fallback
   */
  async generateDietAdvice(entries: DiaryEntry[]): Promise<DietAdviceResult> {
    const availableProviders = this.getAvailableProviders();
    
    // Try each available provider
    for (const provider of availableProviders) {
      for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
        try {
          console.log(`Attempting diet advice with ${provider.name} (attempt ${attempt}/${provider.maxRetries})`);
          
          const result = await provider.generateDietAdvice(entries);
          
          console.log(`✓ Diet advice successful with ${provider.name}`);
          return result;
          
        } catch (error: any) {
          console.log(`✗ Diet advice failed with ${provider.name} (attempt ${attempt}): ${error.message}`);
          
          // If it's a rate limit error, mark provider as temporarily unavailable
          if (error.isRateLimit) {
            console.log(`${provider.name} hit rate limit, trying next provider`);
            break; // Move to next provider immediately
          }
          
          // If it's the last attempt with this provider, continue to next provider
          if (attempt === provider.maxRetries) {
            console.log(`${provider.name} exhausted all retries, trying next provider`);
            break;
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.sleep(waitTime);
        }
      }
    }

    // All providers failed, return fallback advice
    console.log("All AI providers failed for diet advice, returning fallback data");
    return this.fallbackData.dietAdvice;
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