import { type ShiftSchedule, type UserProfile } from "@shared/schema";
import { aiManager } from "../ai-providers/ai-manager";
import { type IStorage } from "../storage";

export interface MealPlanMeal {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre-shift' | 'during-shift' | 'post-shift';
  name: string;
  description: string;
  timing: string; // e.g. "6:30 AM - Before shift starts"
  portability: 'home-only' | 'portable' | 'meal-prep-friendly';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  benefits: string;
  prepTime: string; // e.g. "15 mins"
  tips: string[]; // Shift-specific tips
}

export interface DailyMealPlan {
  date: string;
  shiftType: string;
  shiftStart?: string;
  shiftEnd?: string;
  breakWindows?: string[];
  meals: MealPlanMeal[];
  dailySummary: string;
  calorieDistribution: {
    preShift: number;
    duringShift: number;
    postShift: number;
  };
}

export interface WeeklyMealPlan {
  userId: string;
  startDate: string;
  endDate: string;
  dailyPlans: DailyMealPlan[];
  weeklyNutrition: {
    totalCalories: number;
    avgCaloriesPerDay: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  shoppingList: {
    ingredient: string;
    quantity: string;
    category: string;
  }[];
  weeklyTips: string[];
}

export class ShiftMealPlanService {
  constructor(private storage: IStorage) {}

  async generateWeeklyMealPlan(
    userId: string,
    shifts: ShiftSchedule[],
    userProfile?: UserProfile
  ): Promise<WeeklyMealPlan> {
    if (shifts.length === 0) {
      throw new Error("No shifts provided for meal plan generation");
    }

    // Get user profile if not provided
    if (!userProfile) {
      userProfile = await this.storage.getUserProfile(userId) || undefined;
    }

    // Get nutrition goals for calorie targets
    const nutritionGoals = await this.storage.getNutritionGoals(userId);
    const dailyCalorieTarget = nutritionGoals?.dailyCalories || 2000;

    // Build AI prompt with shift schedule and user context
    const systemPrompt = this.buildSystemPrompt(userProfile, dailyCalorieTarget);
    const userPrompt = this.buildUserPrompt(shifts, userProfile, dailyCalorieTarget);

    try {
      // Get first available provider (prefer Gemini for free tier, fallback to OpenAI)
      const provider = aiManager.getFirstAvailableProvider(['Gemini', 'OpenAI']);
      
      if (!provider) {
        throw new Error("No healthy AI providers available for meal plan generation");
      }

      // Generate meal plan using the available provider
      if (provider.name === 'Gemini') {
        const result = await this.generateWithGemini(provider, systemPrompt, userPrompt, shifts);
        return result;
      } else if (provider.name === 'OpenAI') {
        const result = await this.generateWithOpenAI(provider, systemPrompt, userPrompt, shifts);
        return result;
      }

      throw new Error(`Unsupported provider: ${provider.name}`);
    } catch (error) {
      console.error("Error generating weekly meal plan:", error);
      throw error;
    }
  }

  private buildSystemPrompt(userProfile?: UserProfile, dailyCalorieTarget?: number): string {
    let profileContext = "";
    
    if (userProfile) {
      profileContext = `
User Profile:
- Age: ${userProfile.age || 'not specified'}
- Sex: ${userProfile.sex || 'not specified'}
- Weight: ${userProfile.currentWeightKg ? `${userProfile.currentWeightKg} kg` : 'not specified'}
- Goal Weight: ${userProfile.goalWeightKg ? `${userProfile.goalWeightKg} kg` : 'not specified'}
- Height: ${userProfile.heightCm ? `${userProfile.heightCm} cm` : 'not specified'}
- Activity Level: ${userProfile.activityLevel || 'moderate'}
- Daily Calorie Target: ${dailyCalorieTarget || 2000} calories
- Dietary Requirements: ${userProfile.dietaryRequirements?.join(', ') || 'none'}
- Allergies: ${userProfile.allergies?.join(', ') || 'none'}
- Medication: ${userProfile.medication || 'none'}`;
    }

    return `You are a specialized nutrition AI designed to create weekly meal plans optimized for shift workers. Your expertise includes:

1. **Shift Work Nutrition Science**:
   - Understanding circadian rhythm disruption in shift workers
   - Optimizing meal timing for different shift types (day, night, long, early, late, custom)
   - Managing energy levels during irregular work schedules
   - Preventing shift work sleep disorder through nutrition

2. **Meal Portability & Practicality**:
   - Designing portable, easy-to-transport meals for shift workers
   - Meal prep strategies for busy schedules
   - Quick, no-cook options for break times
   - Temperature-stable foods that don't require refrigeration

3. **Energy & Alertness Optimization**:
   - Strategic caffeine timing
   - Protein distribution for sustained energy
   - Complex carbs for stable blood sugar
   - Avoiding post-meal crashes during shifts

4. **Personalization**:
${profileContext}

**Output Requirements**:
- Generate a complete weekly meal plan with 3-5 meals per day
- Each meal must include: name, description, timing, portability level, full nutrition breakdown, ingredients, benefits, prep time, and shift-specific tips
- Provide strategic calorie distribution (pre-shift, during-shift, post-shift) for each day
- Generate a consolidated shopping list categorized by food group
- Include weekly tips for shift work nutrition success
- All meals must respect dietary restrictions and allergies
- Prioritize UK-available ingredients and realistic portions

**Shift Type Strategies**:
- **Day Shift (9am-5pm)**: Normal meal timing, focus on sustained energy
- **Night Shift (10pm-6am)**: Light pre-shift meal, protein-rich during-shift snacks, avoid heavy carbs late
- **Long Shift (12+ hours)**: Multiple small meals, high protein, portable options
- **Early Shift (6am start)**: Quick breakfast, prep-ahead meals
- **Late Shift (2pm-10pm)**: Strategic lunch timing, avoid late heavy meals
- **Custom Shifts**: Adapt based on specific times and break windows

Return a structured JSON response following the schema exactly.`;
  }

  private buildUserPrompt(shifts: ShiftSchedule[], userProfile?: UserProfile, dailyCalorieTarget?: number): string {
    const shiftDetails = shifts.map((shift, index) => {
      let details = `Day ${index + 1} (${shift.shiftDate}): ${shift.shiftType}`;
      
      if (shift.shiftType === 'custom' && shift.customShiftStart && shift.customShiftEnd) {
        details += ` from ${shift.customShiftStart} to ${shift.customShiftEnd}`;
      }
      
      if (shift.breakWindows && shift.breakWindows.length > 0) {
        details += `, Break windows: ${shift.breakWindows.join(', ')}`;
      }
      
      return details;
    }).join('\n');

    return `Create a complete weekly meal plan for a ${userProfile?.sex || 'person'} shift worker with the following schedule:

${shiftDetails}

Target: ${dailyCalorieTarget || 2000} calories per day (adjust based on shift intensity)
Dietary Requirements: ${userProfile?.dietaryRequirements?.join(', ') || 'none'}
Allergies: ${userProfile?.allergies?.join(', ') || 'none'}

Please generate:
1. A complete daily meal plan for each scheduled shift day
2. Meals optimized for the specific shift type and timing
3. Portable, practical options that can be prepared in advance
4. Strategic calorie distribution to maintain energy throughout each shift
5. A consolidated weekly shopping list
6. Practical tips for succeeding with this meal plan during shift work

Focus on realistic, affordable meals using ingredients commonly available in UK supermarkets. Prioritize meal prep efficiency and portability.`;
  }

  private async generateWithGemini(
    provider: any,
    systemPrompt: string,
    userPrompt: string,
    shifts: ShiftSchedule[]
  ): Promise<WeeklyMealPlan> {
    const client = (provider as any).client;
    
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash", // Use flash for cost efficiency
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            dailyPlans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  shiftType: { type: "string" },
                  shiftStart: { type: "string" },
                  shiftEnd: { type: "string" },
                  breakWindows: { type: "array", items: { type: "string" } },
                  meals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        mealType: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        timing: { type: "string" },
                        portability: { type: "string" },
                        calories: { type: "number" },
                        protein: { type: "number" },
                        carbs: { type: "number" },
                        fat: { type: "number" },
                        ingredients: { type: "array", items: { type: "string" } },
                        benefits: { type: "string" },
                        prepTime: { type: "string" },
                        tips: { type: "array", items: { type: "string" } }
                      },
                      required: ["mealType", "name", "description", "timing", "portability", "calories", "protein", "carbs", "fat", "ingredients", "benefits", "prepTime", "tips"]
                    }
                  },
                  dailySummary: { type: "string" },
                  calorieDistribution: {
                    type: "object",
                    properties: {
                      preShift: { type: "number" },
                      duringShift: { type: "number" },
                      postShift: { type: "number" }
                    },
                    required: ["preShift", "duringShift", "postShift"]
                  }
                },
                required: ["date", "shiftType", "meals", "dailySummary", "calorieDistribution"]
              }
            },
            weeklyNutrition: {
              type: "object",
              properties: {
                totalCalories: { type: "number" },
                avgCaloriesPerDay: { type: "number" },
                totalProtein: { type: "number" },
                totalCarbs: { type: "number" },
                totalFat: { type: "number" }
              },
              required: ["totalCalories", "avgCaloriesPerDay", "totalProtein", "totalCarbs", "totalFat"]
            },
            shoppingList: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ingredient: { type: "string" },
                  quantity: { type: "string" },
                  category: { type: "string" }
                },
                required: ["ingredient", "quantity", "category"]
              }
            },
            weeklyTips: { type: "array", items: { type: "string" } }
          },
          required: ["userId", "startDate", "endDate", "dailyPlans", "weeklyNutrition", "shoppingList", "weeklyTips"]
        }
      },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }]
    });

    const result = response.text;
    const parsed = JSON.parse(result);
    
    // Ensure userId is set correctly
    parsed.userId = shifts[0].userId;
    
    return parsed as WeeklyMealPlan;
  }

  private async generateWithOpenAI(
    provider: any,
    systemPrompt: string,
    userPrompt: string,
    shifts: ShiftSchedule[]
  ): Promise<WeeklyMealPlan> {
    const client = (provider as any).client;
    
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Cost-efficient model for meal planning
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000
    });

    const responseText = response.choices[0].message.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(responseText);
    
    // Ensure userId is set correctly
    parsed.userId = shifts[0].userId;
    
    return parsed as WeeklyMealPlan;
  }
}

// Export singleton instance
export const shiftMealPlanService = new ShiftMealPlanService(
  {} as IStorage // Will be injected by routes
);
