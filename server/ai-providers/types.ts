// AI Provider Types and Interfaces

export interface FoodAnalysisResult {
  imageUrl: string;
  confidence: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  detectedFoods: DetectedFood[];
  isAITemporarilyUnavailable?: boolean; // Flag for when AI services are down
}

export interface DetectedFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  icon: string;
}

// Interface for food detection - simple food name detection only
export interface FoodDetectionResult {
  confidence: number; // 0-100
  detectedFoodNames: string[]; // Simple array of food names for USDA lookup
  referenceObjects?: string[]; // Optional reference objects for portion estimation
}

export interface MealIdea {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  benefits: string;
  recipeLink?: string;
  cookingInstructions?: string[];
}

export interface DietAdviceResult {
  personalizedAdvice: string[];
  nutritionGoals: string[];
  improvements: string[];
  generalTips: string[];
  mealIdeas: MealIdea[];
}

export interface DiaryEntry {
  id: string;
  mealType: string;
  analysis?: FoodAnalysisResult;
  createdAt: Date;
}

export interface DailyCoaching {
  motivation: string;
  nutritionTip: string;
  medicationTip?: string;
  encouragement: string;
  todaysFocus: string;
  streak: number;
  achievement?: string;
}

export interface EducationalTip {
  id: string;
  title: string;
  content: string;
  category: 'nutrition' | 'medication' | 'motivation';
  importance: 'high' | 'medium' | 'low';
}

export interface ProviderError {
  code: string;
  message: string;
  isRateLimit: boolean;
  isTemporary: boolean;
  retryAfter?: number;
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  lastError?: ProviderError;
  lastSuccess?: Date;
  requestCount: number;
  errorCount: number;
}

export interface HealthCheckResult {
  providerName: string;
  healthy: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
  details?: {
    model?: string;
    apiVersion?: string;
    rateLimit?: {
      remaining: number;
      resetTime: Date;
    };
  };
}

export abstract class AIProvider {
  public abstract readonly name: string;
  public abstract readonly priority: number; // Lower number = higher priority
  public abstract readonly maxRetries: number;

  protected requestCount = 0;
  protected errorCount = 0;
  protected lastError?: ProviderError;
  protected lastSuccess?: Date;

  abstract analyzeFoodImage(imagePath: string): Promise<FoodAnalysisResult>;
  abstract analyzeFoodText(foodDescription: string): Promise<FoodAnalysisResult>;
  // New method for food detection only (no nutrition calculation)
  abstract detectFoodNames(imagePath: string): Promise<FoodDetectionResult>;
  abstract generateDietAdvice(entries: DiaryEntry[], userProfile?: any): Promise<DietAdviceResult>;
  abstract answerNutritionQuestion(question: string, entries: DiaryEntry[]): Promise<string>;
  abstract generateDailyCoaching(entries: DiaryEntry[], userProfile?: any): Promise<DailyCoaching>;
  abstract generateEducationalTips(category: 'all' | 'nutrition' | 'medication' | 'motivation'): Promise<EducationalTip[]>;
  
  // Health check method for startup optimization
  abstract performHealthCheck(): Promise<HealthCheckResult>;

  public getStatus(): ProviderStatus {
    return {
      name: this.name,
      available: this.isAvailable(),
      lastError: this.lastError,
      lastSuccess: this.lastSuccess,
      requestCount: this.requestCount,
      errorCount: this.errorCount
    };
  }

  public isAvailable(): boolean {
    // Provider is unavailable if it has recent rate limit errors
    if (this.lastError?.isRateLimit) {
      const retryAfter = this.lastError.retryAfter || 60;
      const canRetryAt = new Date((this.lastError as any).timestamp + retryAfter * 1000);
      return new Date() > canRetryAt;
    }
    
    // Provider is unavailable if error rate is too high
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    return errorRate < 0.8; // Available if less than 80% error rate
  }

  protected recordSuccess() {
    this.requestCount++;
    this.lastSuccess = new Date();
    this.lastError = undefined;
  }

  protected recordError(error: ProviderError) {
    this.requestCount++;
    this.errorCount++;
    this.lastError = {
      ...error,
      timestamp: Date.now()
    } as any;
  }

  protected createError(
    code: string, 
    message: string, 
    isRateLimit: boolean = false,
    isTemporary: boolean = true,
    retryAfter?: number
  ): ProviderError {
    return {
      code,
      message,
      isRateLimit,
      isTemporary,
      retryAfter
    };
  }
}