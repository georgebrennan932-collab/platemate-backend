import { storage } from "../storage";
import type { DiaryEntryWithAnalysis, DrinkEntry, NutritionGoals, Reflection } from "@shared/schema";
import { OpenAIProvider } from "../ai-providers/openai-provider";
import { GeminiProvider } from "../ai-providers/gemini-provider";

interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalWater: number;
  mealCount: number;
  goals?: NutritionGoals;
}

export class ReflectionService {
  private openaiProvider = new OpenAIProvider();
  private geminiProvider = new GeminiProvider();

  /**
   * Generate a daily reflection for the user based on yesterday's nutrition data
   */
  async generateDailyReflection(userId: string): Promise<Reflection> {
    // Get yesterday's date range
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Gather nutrition data
    const summary = await this.getNutritionSummary(userId, yesterday, endOfYesterday);
    
    // Generate reflection using AI
    const reflectionContent = await this.generateReflectionContent(summary);
    
    // Save to database
    const reflection = await storage.createReflection({
      userId,
      reflectionPeriod: 'daily',
      periodStart: yesterday.toISOString(),
      periodEnd: endOfYesterday.toISOString(),
      wentWell: reflectionContent.wentWell,
      couldImprove: reflectionContent.couldImprove,
      actionSteps: reflectionContent.actionSteps,
      sentimentScore: reflectionContent.sentimentScore,
      aiProvider: reflectionContent.provider,
      aiModel: reflectionContent.model,
      status: 'final',
    });

    return reflection;
  }

  /**
   * Get the latest daily reflection or generate a new one if needed
   */
  async getOrGenerateDailyReflection(userId: string): Promise<Reflection> {
    // Check if we already have today's reflection
    const latest = await storage.getLatestReflection(userId, 'daily');
    
    if (latest) {
      // Check if it's from today
      const latestDate = new Date(latest.createdAt);
      const today = new Date();
      
      if (latestDate.toDateString() === today.toDateString()) {
        return latest;
      }
    }

    // Generate new reflection
    return await this.generateDailyReflection(userId);
  }

  /**
   * Gather nutrition summary for a given period
   */
  private async getNutritionSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<NutritionSummary> {
    // Get diary entries
    const diaryEntries = await storage.getDiaryEntriesByDateRange(userId, startDate, endDate);
    
    // Get drink entries
    const drinkEntries = await storage.getDrinkEntries(userId);
    const periodDrinks = drinkEntries.filter(d => {
      const drinkDate = new Date(d.loggedAt);
      return drinkDate >= startDate && drinkDate <= endDate;
    });

    // Get nutrition goals
    const goals = await storage.getNutritionGoals(userId);

    // Calculate totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalWater = 0;

    diaryEntries.forEach(entry => {
      const multiplier = (entry.portionMultiplier || 100) / 100;
      totalCalories += entry.analysis.totalCalories * multiplier;
      totalProtein += entry.analysis.totalProtein * multiplier;
      totalCarbs += entry.analysis.totalCarbs * multiplier;
      totalFat += entry.analysis.totalFat * multiplier;
    });

    periodDrinks.forEach(drink => {
      if (drink.drinkType === 'water') {
        totalWater += drink.amount;
      }
      totalCalories += drink.calories || 0;
    });

    return {
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      totalWater,
      mealCount: diaryEntries.length,
      goals,
    };
  }

  /**
   * Generate reflection content using AI
   */
  private async generateReflectionContent(summary: NutritionSummary): Promise<{
    wentWell: string;
    couldImprove: string;
    actionSteps: string[];
    sentimentScore: number;
    provider: string;
    model: string;
  }> {
    const prompt = this.buildReflectionPrompt(summary);

    // Try OpenAI first, fallback to Gemini
    let response;
    let provider = 'openai';
    let model = 'gpt-4o-mini';

    try {
      const openaiResponse = await this.openaiProvider.answerNutritionQuestion(prompt, []);
      response = openaiResponse;
    } catch (error) {
      console.log('OpenAI failed, trying Gemini:', error);
      try {
        const geminiResponse = await this.geminiProvider.answerNutritionQuestion(prompt, []);
        response = geminiResponse;
        provider = 'gemini';
        model = 'gemini-1.5-flash';
      } catch (geminiError) {
        console.error('Both AI providers failed:', geminiError);
        // Return fallback reflection
        return this.getFallbackReflection();
      }
    }

    // Parse AI response
    return this.parseReflectionResponse(response, provider, model);
  }

  /**
   * Build the prompt for AI reflection generation
   */
  private buildReflectionPrompt(summary: NutritionSummary): string {
    const { totalCalories, totalProtein, totalCarbs, totalFat, totalWater, mealCount, goals } = summary;

    const calorieGoal = goals?.dailyCalories || 2000;
    const proteinGoal = goals?.dailyProtein || 150;
    const waterGoal = goals?.dailyWater || 2000;

    const caloriePercent = Math.round((totalCalories / calorieGoal) * 100);
    const proteinPercent = Math.round((totalProtein / proteinGoal) * 100);
    const waterPercent = Math.round((totalWater / waterGoal) * 100);

    return `You are a supportive nutrition coach. Generate a brief, encouraging daily reflection for a user based on their nutrition data from yesterday.

Nutrition Data:
- Calories: ${totalCalories} / ${calorieGoal} (${caloriePercent}%)
- Protein: ${totalProtein}g / ${proteinGoal}g (${proteinPercent}%)
- Carbs: ${totalCarbs}g
- Fat: ${totalFat}g
- Water: ${totalWater}ml / ${waterGoal}ml (${waterPercent}%)
- Meals logged: ${mealCount}

Respond in the following JSON format:
{
  "wentWell": "2-3 positive observations about what they did well",
  "couldImprove": "2-3 constructive suggestions for improvement",
  "actionSteps": ["specific action 1", "specific action 2", "specific action 3"],
  "sentimentScore": 0-100
}

Keep the tone warm, encouraging, and actionable. Focus on progress, not perfection. The sentimentScore should reflect overall positivity (0=very negative, 100=very positive).`;
  }

  /**
   * Parse AI response into reflection format
   */
  private parseReflectionResponse(response: string, provider: string, model: string): {
    wentWell: string;
    couldImprove: string;
    actionSteps: string[];
    sentimentScore: number;
    provider: string;
    model: string;
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          wentWell: parsed.wentWell || 'You logged your meals consistently.',
          couldImprove: parsed.couldImprove || 'Consider tracking water intake more regularly.',
          actionSteps: parsed.actionSteps || ['Keep logging your meals', 'Stay hydrated', 'Aim for balanced nutrition'],
          sentimentScore: parsed.sentimentScore || 75,
          provider,
          model,
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback if parsing fails
    return this.getFallbackReflection(provider, model);
  }

  /**
   * Get fallback reflection when AI fails
   */
  private getFallbackReflection(provider = 'fallback', model = 'none'): {
    wentWell: string;
    couldImprove: string;
    actionSteps: string[];
    sentimentScore: number;
    provider: string;
    model: string;
  } {
    return {
      wentWell: 'You took the time to track your nutrition, which is a great habit to maintain. Every logged meal brings you closer to your health goals.',
      couldImprove: 'Consider setting specific daily goals for water intake and meal timing. Small, consistent improvements add up over time.',
      actionSteps: [
        'Set a reminder to drink water every 2 hours',
        'Plan tomorrow\'s meals in advance',
        'Aim for 3 balanced meals throughout the day'
      ],
      sentimentScore: 70,
      provider,
      model,
    };
  }
}

export const reflectionService = new ReflectionService();
