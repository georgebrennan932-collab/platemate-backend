import { storage } from "../storage";
import { OpenAIProvider } from "../ai-providers/openai-provider";
import { GeminiProvider } from "../ai-providers/gemini-provider";
export class ReflectionService {
    constructor() {
        this.openaiProvider = new OpenAIProvider();
        this.geminiProvider = new GeminiProvider();
    }
    /**
     * Generate a daily reflection for the user based on yesterday's nutrition data
     */
    async generateDailyReflection(userId) {
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
    async getOrGenerateDailyReflection(userId) {
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
    async getNutritionSummary(userId, startDate, endDate) {
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
    async generateReflectionContent(summary) {
        const prompt = this.buildReflectionPrompt(summary);
        // Try OpenAI first, fallback to Gemini
        let response;
        let provider = 'openai';
        let model = 'gpt-4o-mini';
        try {
            const openaiResponse = await this.openaiProvider.answerNutritionQuestion(prompt, []);
            response = openaiResponse;
        }
        catch (error) {
            console.log('OpenAI failed, trying Gemini:', error);
            try {
                const geminiResponse = await this.geminiProvider.answerNutritionQuestion(prompt, []);
                response = geminiResponse;
                provider = 'gemini';
                model = 'gemini-1.5-flash';
            }
            catch (geminiError) {
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
    buildReflectionPrompt(summary) {
        const { totalCalories, totalProtein, totalCarbs, totalFat, totalWater, mealCount, goals } = summary;
        const calorieGoal = goals?.dailyCalories || 2000;
        const proteinGoal = goals?.dailyProtein || 150;
        const waterGoal = goals?.dailyWater || 2000;
        const caloriePercent = Math.round((totalCalories / calorieGoal) * 100);
        const proteinPercent = Math.round((totalProtein / proteinGoal) * 100);
        const waterPercent = Math.round((totalWater / waterGoal) * 100);
        return `You are an honest, accountability-focused nutrition coach. Generate a truthful daily reflection based on the user's actual performance yesterday. Hold them accountable while remaining polite.

Nutrition Data:
- Calories: ${totalCalories} / ${calorieGoal} (${caloriePercent}%)
- Protein: ${totalProtein}g / ${proteinGoal}g (${proteinPercent}%)
- Carbs: ${totalCarbs}g
- Fat: ${totalFat}g
- Water: ${totalWater}ml / ${waterGoal}ml (${waterPercent}%)
- Meals logged: ${mealCount}

IMPORTANT SCORING GUIDELINES:
- If mealCount is 0: Express polite disappointment that no tracking occurred. sentimentScore should be 20-30. Do NOT praise them.
- If calories/protein are <50% of goals: Acknowledge the significant shortfall. sentimentScore should be 30-50.
- If calories/protein are 50-80% of goals: Note room for improvement. sentimentScore should be 50-70.
- If calories/protein are >80% of goals: Give genuine encouragement. sentimentScore should be 70-90.
- Only celebrate when there's actual achievement to celebrate.

Respond in the following JSON format:
{
  "wentWell": "Honest observations about what went well (or acknowledge nothing if mealCount is 0)",
  "couldImprove": "Direct feedback about what needs to change",
  "actionSteps": ["specific action 1", "specific action 2", "specific action 3"],
  "sentimentScore": 0-100
}

Be honest and hold them accountable. If they didn't track or fell short, say so clearly but politely. The sentimentScore must accurately reflect their actual performance, not fake encouragement.`;
    }
    /**
     * Parse AI response into reflection format
     */
    parseReflectionResponse(response, provider, model) {
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
        }
        catch (error) {
            console.error('Failed to parse AI response:', error);
        }
        // Fallback if parsing fails
        return this.getFallbackReflection(provider, model);
    }
    /**
     * Get fallback reflection when AI fails
     */
    getFallbackReflection(provider = 'fallback', model = 'none') {
        return {
            wentWell: 'Unable to generate personalized reflection at this time.',
            couldImprove: 'Please review your tracking data manually to assess your progress. Consistent tracking is essential for achieving your nutrition goals.',
            actionSteps: [
                'Log all meals and snacks throughout the day',
                'Track water intake to stay hydrated',
                'Review your daily goals and plan ahead'
            ],
            sentimentScore: 50,
            provider,
            model,
        };
    }
}
export const reflectionService = new ReflectionService();
