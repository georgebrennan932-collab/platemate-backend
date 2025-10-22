import { storage } from "../storage";
import type { UserProfile, DiaryEntry, WeightEntry, DrinkEntry, ShiftSchedule } from "@shared/schema";

/**
 * User Context Service
 * 
 * Aggregates all relevant user data for AI Coach personalization.
 * This service collects data from multiple sources to provide comprehensive
 * context about the user's nutrition habits, progress, and preferences.
 */

// Extended types for context
interface NutritionGoalsExtended {
  dailyCalories: number | null;
  dailyProtein: number | null;
  dailyCarbs: number | null;
  dailyFat: number | null;
  dailyWater: number | null;
}

interface DiaryEntryWithAnalysis extends DiaryEntry {
  analysis?: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
}

export interface UserContext {
  // User profile and preferences
  profile: UserProfile | null;
  nutritionGoals: NutritionGoalsExtended | null;
  
  // Recent activity (last 7 days)
  recentDiary: DiaryEntryWithAnalysis[];
  recentWeights: WeightEntry[];
  recentDrinks: DrinkEntry[];
  todaySteps: number;
  
  // Patterns and trends
  weeklyMealCount: number;
  averageDailyCalories: number;
  weightTrend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  
  // Shopping and preferences
  shoppingList: any[];
  
  // Shift schedule (current week)
  shiftSchedules: ShiftSchedule[];
  
  // Engagement metrics
  currentStreak: number;
  activeChallenges: any[];
  totalPoints: number;
}

class UserContextService {
  /**
   * Gather comprehensive user context for AI personalization
   */
  async getUserContext(userId: string): Promise<UserContext> {
    try {
      // Get current week's date range for shift schedules (timezone-safe)
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start on Sunday
      startOfWeek.setUTCHours(0, 0, 0, 0); // Reset to UTC midnight
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday
      endOfWeek.setUTCHours(0, 0, 0, 0); // Reset to UTC midnight
      
      // Use timezone-safe date formatting to avoid off-by-one day errors
      const startDate = startOfWeek.toLocaleDateString('en-CA', { timeZone: 'UTC' });
      const endDate = endOfWeek.toLocaleDateString('en-CA', { timeZone: 'UTC' });
      
      // Fetch all data in parallel for better performance
      const [
        profile,
        nutritionGoals,
        recentDiary,
        recentWeights,
        recentDrinks,
        shoppingList,
        stepsData,
        challengeData,
        shiftSchedules,
      ] = await Promise.all([
        storage.getUserProfile(userId),
        storage.getNutritionGoals(userId),
        storage.getDiaryEntries(userId, 30), // Last 30 entries
        storage.getWeightEntries(userId), // Get all weights
        storage.getDrinkEntries(userId, 50), // Last 50 drink entries
        this.getShoppingList(userId),
        this.getStepsToday(userId),
        this.getChallengeData(userId),
        storage.getShiftSchedules(userId, startDate, endDate),
      ]);

      // Enrich diary entries with analysis data
      const enrichedDiary = await this.enrichDiaryEntries(recentDiary.slice(0, 30));

      // Calculate patterns and trends
      const weeklyMealCount = this.calculateWeeklyMealCount(enrichedDiary);
      const averageDailyCalories = this.calculateAverageDailyCalories(enrichedDiary);
      const weightTrend = this.calculateWeightTrend(recentWeights.slice(0, 30));
      
      return {
        profile: profile || null,
        nutritionGoals: nutritionGoals ? {
          dailyCalories: nutritionGoals.dailyCalories,
          dailyProtein: nutritionGoals.dailyProtein,
          dailyCarbs: nutritionGoals.dailyCarbs,
          dailyFat: nutritionGoals.dailyFat,
          dailyWater: nutritionGoals.dailyWater,
        } : null,
        recentDiary: enrichedDiary.slice(0, 20), // Only include most recent 20 for context
        recentWeights: recentWeights.slice(0, 10), // Last 10 weigh-ins
        recentDrinks: recentDrinks.slice(0, 20), // Last 20 drink entries
        todaySteps: stepsData.stepCount,
        weeklyMealCount,
        averageDailyCalories,
        weightTrend,
        shoppingList,
        shiftSchedules: shiftSchedules || [],
        currentStreak: challengeData.streak,
        activeChallenges: challengeData.active,
        totalPoints: challengeData.points,
      };
    } catch (error) {
      console.error('Error gathering user context:', error);
      // Return minimal context on error
      return {
        profile: null,
        nutritionGoals: null,
        recentDiary: [],
        recentWeights: [],
        recentDrinks: [],
        todaySteps: 0,
        weeklyMealCount: 0,
        averageDailyCalories: 0,
        weightTrend: 'insufficient_data',
        shoppingList: [],
        shiftSchedules: [],
        currentStreak: 0,
        activeChallenges: [],
        totalPoints: 0,
      };
    }
  }

  /**
   * Format context into a readable string for AI prompts
   */
  formatContextForAI(context: UserContext): string {
    const sections: string[] = [];

    // User Profile
    if (context.profile) {
      const profile = context.profile;
      
      sections.push(`USER PROFILE:
- Name: ${profile.name || 'Not set'}
- Age: ${profile.age || 'Not set'}
- Sex: ${profile.sex || 'Not set'}
- Height: ${profile.heightCm ? `${profile.heightCm}cm` : 'Not set'}
- Current Weight: ${profile.currentWeightKg ? `${profile.currentWeightKg}kg` : 'Not set'}
- Goal Weight: ${profile.goalWeightKg ? `${profile.goalWeightKg}kg` : 'Not set'}
- Activity Level: ${profile.activityLevel || 'Not set'}
- Weight Goal: ${profile.weightGoal || 'Not set'}
- Dietary Requirements: ${profile.dietaryRequirements?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}
- Food Dislikes: ${profile.foodDislikes || 'None'}
- Health Conditions: ${profile.healthConditions || 'None'}
- Medication: ${profile.medication || 'None'}`);
    }

    // Shift Schedule (Current Week)
    if (context.shiftSchedules && context.shiftSchedules.length > 0) {
      // Get today's date in timezone-safe format
      const todayDate = new Date();
      todayDate.setUTCHours(0, 0, 0, 0);
      const today = todayDate.toLocaleDateString('en-CA', { timeZone: 'UTC' });
      
      const shiftLabels: Record<string, string> = {
        'day_off': 'Day Off',
        'regular': 'Regular (9am-5pm)',
        'early_shift': 'Early Shift (6am-2pm)',
        'late_shift': 'Late Shift (2pm-10pm)',
        'night_shift': 'Night Shift (Overnight)',
        'long_shift': 'Long Shift (12.5hrs)',
        'custom': 'Custom Shift'
      };

      // Create a map of scheduled shifts for easy lookup
      const shiftMap = new Map(context.shiftSchedules.map(s => [s.shiftDate, s]));
      
      // Generate full week schedule, showing gaps
      const startOfWeek = new Date(todayDate);
      startOfWeek.setDate(todayDate.getDate() - todayDate.getDay());
      startOfWeek.setUTCHours(0, 0, 0, 0);
      
      const weekSchedule: string[] = [];
      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        const dateStr = currentDay.toLocaleDateString('en-CA', { timeZone: 'UTC' });
        const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
        const isToday = dateStr === today;
        const todayMarker = isToday ? ' ← TODAY' : '';
        
        const shift = shiftMap.get(dateStr);
        
        if (shift) {
          let shiftInfo = shiftLabels[shift.shiftType] || shift.shiftType;
          
          if (shift.shiftType === 'custom' && shift.customShiftStart && shift.customShiftEnd) {
            shiftInfo = `Custom (${shift.customShiftStart}-${shift.customShiftEnd})`;
          }
          
          let breakInfo = '';
          if (shift.breakWindows && shift.breakWindows.length > 0) {
            breakInfo = `, Breaks: ${shift.breakWindows.join(', ')}`;
          }
          
          weekSchedule.push(`  ${dayName} ${dateStr}: ${shiftInfo}${breakInfo}${todayMarker}`);
        } else {
          weekSchedule.push(`  ${dayName} ${dateStr}: No schedule logged${todayMarker}`);
        }
      }

      sections.push(`WORK SHIFT SCHEDULE (This Week):
${weekSchedule.join('\n')}

**Important**: Use this shift schedule to provide personalized nutrition advice. Consider shift timing when suggesting meals, account for night shifts when recommending sleep/eating patterns, and acknowledge days off for meal prep opportunities. If days show "No schedule logged," the user hasn't planned their shifts for those days yet.`);
    }

    // Nutrition Goals
    if (context.nutritionGoals) {
      const goals = context.nutritionGoals;
      sections.push(`NUTRITION GOALS:
- Daily Calories: ${goals.dailyCalories || 'Not set'} kcal
- Protein: ${goals.dailyProtein || 'Not set'}g
- Carbs: ${goals.dailyCarbs || 'Not set'}g
- Fat: ${goals.dailyFat || 'Not set'}g
- Water: ${goals.dailyWater || 'Not set'}ml`);
    }

    // Weight Trends
    if (context.recentWeights.length > 0) {
      const latestWeight = context.recentWeights[0];
      const latestWeightKg = latestWeight.weightGrams / 1000;
      
      let weightChangeInfo = '';
      if (context.recentWeights.length > 1) {
        const oldestWeight = context.recentWeights[context.recentWeights.length - 1];
        const oldestWeightKg = oldestWeight.weightGrams / 1000;
        const weightChange = latestWeightKg - oldestWeightKg;
        weightChangeInfo = `\n- Recent Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg`;
      }
      
      sections.push(`WEIGHT TRACKING:
- Current Weight: ${latestWeightKg.toFixed(1)}kg
- Trend: ${context.weightTrend}${weightChangeInfo}
- Total Weigh-ins: ${context.recentWeights.length}`);
    }

    // Recent Eating Patterns
    if (context.recentDiary.length > 0) {
      const recentMeals = context.recentDiary
        .slice(0, 3)
        .map(entry => {
          const cals = entry.analysis?.totalCalories || 0;
          return `${entry.mealType} (${cals}kcal)`;
        })
        .join(', ');
      
      sections.push(`RECENT EATING PATTERNS (Last 7 Days):
- Meals Logged: ${context.weeklyMealCount}
- Average Daily Calories: ${Math.round(context.averageDailyCalories)} kcal
- Most Recent Meals: ${recentMeals || 'None'}`);
    }

    // Hydration
    if (context.recentDrinks.length > 0) {
      const todayDrinks = context.recentDrinks.filter(d => {
        const drinkDate = new Date(d.loggedAt).toDateString();
        const today = new Date().toDateString();
        return drinkDate === today;
      });
      const todayWater = todayDrinks.reduce((sum, d) => sum + d.amount, 0);
      sections.push(`HYDRATION:
- Today's Water Intake: ${todayWater}ml
- Recent Drinks Logged: ${context.recentDrinks.length}`);
    }

    // Activity
    if (context.todaySteps > 0) {
      sections.push(`ACTIVITY:
- Today's Steps: ${context.todaySteps}`);
    }

    // Engagement
    sections.push(`ENGAGEMENT:
- Current Streak: ${context.currentStreak} days
- Active Challenges: ${context.activeChallenges.length}
- Total Points: ${context.totalPoints}`);

    // Shopping List
    if (context.shoppingList && context.shoppingList.length > 0) {
      const uncheckedItems = context.shoppingList.filter((item: any) => !item.checked || item.checked === 0);
      const checkedItems = context.shoppingList.filter((item: any) => item.checked === 1);
      
      const itemsList = context.shoppingList
        .map((item: any, index: number) => {
          const name = item.itemName || item.name || item;
          const status = item.checked === 1 ? '✓' : '○';
          return `${status} ${name}`;
        })
        .join('\n  ');
      
      sections.push(`SHOPPING LIST (${context.shoppingList.length} items, ${uncheckedItems.length} remaining):
  ${itemsList}`);
    }

    return sections.join('\n\n');
  }

  // Helper methods

  private async enrichDiaryEntries(entries: DiaryEntry[]): Promise<DiaryEntryWithAnalysis[]> {
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        try {
          const analysis = await storage.getFoodAnalysis(entry.analysisId);
          return {
            ...entry,
            analysis: analysis ? {
              totalCalories: analysis.totalCalories,
              totalProtein: analysis.totalProtein,
              totalCarbs: analysis.totalCarbs,
              totalFat: analysis.totalFat,
            } : undefined,
          };
        } catch {
          return { ...entry, analysis: undefined };
        }
      })
    );
    return enriched;
  }

  private async getShoppingList(userId: string): Promise<any[]> {
    try {
      // Check if shopping list functionality exists in storage
      if (typeof (storage as any).getShoppingList === 'function') {
        return await (storage as any).getShoppingList(userId);
      }
      return [];
    } catch {
      return [];
    }
  }

  private async getStepsToday(userId: string): Promise<{ stepCount: number }> {
    try {
      if (typeof (storage as any).getStepsToday === 'function') {
        return await (storage as any).getStepsToday(userId);
      }
      return { stepCount: 0 };
    } catch {
      return { stepCount: 0 };
    }
  }

  private async getChallengeData(userId: string): Promise<{ streak: number; active: any[]; points: number }> {
    try {
      // Streak is stored in localStorage (client-side), so we can't access it here
      // We'll rely on the client to pass this or calculate from diary entries
      const streak = 0;
      
      // Try to get challenge data if available
      let active: any[] = [];
      let points = 0;
      
      if (typeof (storage as any).getActiveChallenges === 'function') {
        active = await (storage as any).getActiveChallenges(userId);
      }
      
      if (typeof (storage as any).getUserPoints === 'function') {
        const pointsData = await (storage as any).getUserPoints(userId);
        points = pointsData?.totalPoints || 0;
      }
      
      return { streak, active, points };
    } catch {
      return { streak: 0, active: [], points: 0 };
    }
  }

  private calculateWeeklyMealCount(diaryEntries: DiaryEntryWithAnalysis[]): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return diaryEntries.filter(entry => {
      const entryDate = new Date(entry.mealDate);
      return entryDate >= oneWeekAgo;
    }).length;
  }

  private calculateAverageDailyCalories(diaryEntries: DiaryEntryWithAnalysis[]): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentEntries = diaryEntries.filter(entry => {
      const entryDate = new Date(entry.mealDate);
      return entryDate >= oneWeekAgo;
    });
    
    if (recentEntries.length === 0) return 0;
    
    const totalCalories = recentEntries.reduce((sum, entry) => {
      return sum + (entry.analysis?.totalCalories || 0);
    }, 0);
    
    const uniqueDays = new Set(
      recentEntries.map(e => new Date(e.mealDate).toDateString())
    ).size;
    
    return uniqueDays > 0 ? totalCalories / uniqueDays : 0;
  }

  private calculateWeightTrend(weightEntries: WeightEntry[]): 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' {
    if (weightEntries.length < 3) return 'insufficient_data';
    
    // Use last 5 entries for trend
    const recentWeights = weightEntries.slice(0, Math.min(5, weightEntries.length));
    const oldestKg = recentWeights[recentWeights.length - 1].weightGrams / 1000;
    const newestKg = recentWeights[0].weightGrams / 1000;
    const change = newestKg - oldestKg;
    
    // Consider stable if change is less than 0.5kg
    if (Math.abs(change) < 0.5) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }
}

export const userContextService = new UserContextService();
