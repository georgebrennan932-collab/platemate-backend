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

export abstract class AIProvider {
  public abstract readonly name: string;
  public abstract readonly priority: number; // Lower number = higher priority
  public abstract readonly maxRetries: number;

  protected requestCount = 0;
  protected errorCount = 0;
  protected lastError?: ProviderError;
  protected lastSuccess?: Date;

  abstract analyzeFoodImage(imagePath: string): Promise<FoodAnalysisResult>;
  abstract generateDietAdvice(entries: DiaryEntry[]): Promise<DietAdviceResult>;
  abstract answerNutritionQuestion(question: string, entries: DiaryEntry[]): Promise<string>;

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