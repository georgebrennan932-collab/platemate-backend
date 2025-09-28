import { type FoodAnalysis, type InsertFoodAnalysis, type DetectedFood, type DiaryEntry, type DiaryEntryWithAnalysis, type InsertDiaryEntry, type DrinkEntry, type InsertDrinkEntry, type WeightEntry, type InsertWeightEntry, type User, type UpsertUser, type NutritionGoals, type InsertNutritionGoals, type UserProfile, type InsertUserProfile, type SimpleFoodEntry, type InsertSimpleFoodEntry, type FoodConfirmation, type InsertFoodConfirmation, type UpdateFoodConfirmation, foodAnalyses, diaryEntries, drinkEntries, weightEntries, users, nutritionGoals, userProfiles, simpleFoodEntries, foodConfirmations } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getFoodAnalysis(id: string): Promise<FoodAnalysis | undefined>;
  createFoodAnalysis(analysis: InsertFoodAnalysis): Promise<FoodAnalysis>;
  updateFoodAnalysis(id: string, updates: Partial<InsertFoodAnalysis>): Promise<FoodAnalysis | undefined>;
  getAllFoodAnalyses(): Promise<FoodAnalysis[]>;
  
  // User methods (for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Diary methods
  createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry>;
  getDiaryEntries(userId?: string, limit?: number): Promise<DiaryEntryWithAnalysis[]>;
  getDiaryEntry(id: string): Promise<DiaryEntryWithAnalysis | undefined>;
  updateDiaryEntry(id: string, entry: Partial<InsertDiaryEntry>): Promise<DiaryEntry | undefined>;
  deleteDiaryEntry(id: string): Promise<boolean>;
  
  // Enhanced diary methods
  searchDiaryEntries(userId: string, query: string): Promise<DiaryEntryWithAnalysis[]>;
  getDiaryEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<DiaryEntryWithAnalysis[]>;
  
  // Drink methods
  createDrinkEntry(entry: InsertDrinkEntry): Promise<DrinkEntry>;
  getDrinkEntries(userId?: string, limit?: number): Promise<DrinkEntry[]>;
  getDrinkEntry(id: string): Promise<DrinkEntry | undefined>;
  deleteDrinkEntry(id: string): Promise<boolean>;
  
  // Weight methods
  createWeightEntry(entry: InsertWeightEntry): Promise<WeightEntry>;
  getWeightEntries(userId: string, options?: { start?: Date; end?: Date; limit?: number }): Promise<WeightEntry[]>;
  getWeightEntry(id: string): Promise<WeightEntry | undefined>;
  updateWeightEntry(id: string, entry: Partial<InsertWeightEntry>): Promise<WeightEntry | undefined>;
  deleteWeightEntry(id: string): Promise<boolean>;
  
  // Nutrition goals methods
  getNutritionGoals(userId: string): Promise<NutritionGoals | undefined>;
  upsertNutritionGoals(goals: InsertNutritionGoals): Promise<NutritionGoals>;
  
  // User profile methods
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  
  // Simple food entry methods (for mobile app compatibility)
  createSimpleFoodEntry(entry: InsertSimpleFoodEntry): Promise<SimpleFoodEntry>;
  getSimpleFoodEntries(userId: string, limit?: number): Promise<SimpleFoodEntry[]>;
  
  // Food confirmation methods (for confidence threshold workflow)
  createFoodConfirmation(confirmation: InsertFoodConfirmation): Promise<FoodConfirmation>;
  getFoodConfirmation(id: string): Promise<FoodConfirmation | undefined>;
  getFoodConfirmationsByUser(userId: string, status?: string): Promise<FoodConfirmation[]>;
  updateFoodConfirmation(id: string, updates: UpdateFoodConfirmation): Promise<FoodConfirmation | undefined>;
  deleteFoodConfirmation(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getFoodAnalysis(id: string): Promise<FoodAnalysis | undefined> {
    const [analysis] = await db.select().from(foodAnalyses).where(eq(foodAnalyses.id, id));
    return analysis || undefined;
  }

  async createFoodAnalysis(insertAnalysis: InsertFoodAnalysis): Promise<FoodAnalysis> {
    const [analysis] = await db
      .insert(foodAnalyses)
      .values({
        imageUrl: insertAnalysis.imageUrl,
        confidence: insertAnalysis.confidence,
        totalCalories: insertAnalysis.totalCalories,
        totalProtein: insertAnalysis.totalProtein,
        totalCarbs: insertAnalysis.totalCarbs,
        totalFat: insertAnalysis.totalFat,
        detectedFoods: insertAnalysis.detectedFoods as DetectedFood[]
      })
      .returning();
    return analysis;
  }

  async updateFoodAnalysis(id: string, updates: Partial<InsertFoodAnalysis>): Promise<FoodAnalysis | undefined> {
    // Only set fields that are actually provided in updates to avoid nulling existing data
    const setClause: any = {};
    
    if (updates.imageUrl !== undefined) setClause.imageUrl = updates.imageUrl;
    if (updates.confidence !== undefined) setClause.confidence = updates.confidence;
    if (updates.totalCalories !== undefined) setClause.totalCalories = updates.totalCalories;
    if (updates.totalProtein !== undefined) setClause.totalProtein = updates.totalProtein;
    if (updates.totalCarbs !== undefined) setClause.totalCarbs = updates.totalCarbs;
    if (updates.totalFat !== undefined) setClause.totalFat = updates.totalFat;
    if (updates.detectedFoods !== undefined) setClause.detectedFoods = updates.detectedFoods as DetectedFood[];

    // If no fields to update, return existing analysis
    if (Object.keys(setClause).length === 0) {
      return await this.getFoodAnalysis(id);
    }

    const [analysis] = await db
      .update(foodAnalyses)
      .set(setClause)
      .where(eq(foodAnalyses.id, id))
      .returning();
    return analysis || undefined;
  }

  async getAllFoodAnalyses(): Promise<FoodAnalysis[]> {
    return await db
      .select()
      .from(foodAnalyses)
      .orderBy(desc(foodAnalyses.createdAt));
  }

  // User methods for authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry> {
    const [diaryEntry] = await db
      .insert(diaryEntries)
      .values({
        ...entry,
        mealDate: typeof entry.mealDate === 'string' ? new Date(entry.mealDate) : entry.mealDate
      })
      .returning();
    return diaryEntry;
  }

  async getDiaryEntries(userId?: string, limit = 50): Promise<DiaryEntryWithAnalysis[]> {
    // Get regular diary entries with full analysis
    const regularEntries = userId 
      ? await db.query.diaryEntries.findMany({
          where: eq(diaryEntries.userId, userId),
          limit: Math.ceil(limit * 0.8), // Reserve some space for simple entries
          orderBy: desc(diaryEntries.mealDate),
          with: {
            analysis: true,
          },
        })
      : await db.query.diaryEntries.findMany({
          limit: Math.ceil(limit * 0.8),
          orderBy: desc(diaryEntries.mealDate),
          with: {
            analysis: true,
          },
        });

    // Get simple food entries and transform them to match diary format
    const simpleEntries = userId 
      ? await db.query.simpleFoodEntries.findMany({
          where: eq(simpleFoodEntries.userId, userId),
          limit: Math.floor(limit * 0.5),
          orderBy: desc(simpleFoodEntries.createdAt),
        })
      : [];

    // Transform simple entries to DiaryEntryWithAnalysis format
    const transformedSimpleEntries: DiaryEntryWithAnalysis[] = simpleEntries.map(entry => ({
      id: `simple-${entry.id}`, // Prefix to distinguish from regular entries
      userId: entry.userId,
      analysisId: `simple-analysis-${entry.id}`,
      mealType: 'snack',
      customMealName: null,
      mealDate: entry.createdAt,
      notes: `Mobile entry: ${entry.food} - ${entry.amount}`,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
      analysis: {
        id: `simple-analysis-${entry.id}`,
        imageUrl: '', // Empty string instead of null
        confidence: 0.8, // Default confidence for manual entries
        totalCalories: 0, // Will show as "Unknown" in UI
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        detectedFoods: [{
          name: entry.food,
          portion: entry.amount,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          confidence: 0.8,
          icon: '🍽️' // Default food icon for mobile entries
        }],
        createdAt: entry.createdAt,
        updatedAt: entry.createdAt
      }
    }));

    // Combine and sort all entries by date (newest first)
    const allEntries = [...regularEntries, ...transformedSimpleEntries];
    allEntries.sort((a, b) => new Date(b.mealDate).getTime() - new Date(a.mealDate).getTime());

    // Apply final limit
    return allEntries.slice(0, limit);
  }

  async getDiaryEntry(id: string): Promise<DiaryEntryWithAnalysis | undefined> {
    return await db.query.diaryEntries.findFirst({
      where: eq(diaryEntries.id, id),
      with: {
        analysis: true,
      },
    });
  }

  async updateDiaryEntry(id: string, entry: Partial<InsertDiaryEntry>): Promise<DiaryEntry | undefined> {
    const updateData: any = { ...entry };
    if (entry.mealDate) {
      updateData.mealDate = typeof entry.mealDate === 'string' ? new Date(entry.mealDate) : entry.mealDate;
    }
    
    const [updatedEntry] = await db
      .update(diaryEntries)
      .set(updateData)
      .where(eq(diaryEntries.id, id))
      .returning();
    
    return updatedEntry || undefined;
  }

  async deleteDiaryEntry(id: string): Promise<boolean> {
    const result = await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async searchDiaryEntries(userId: string, query: string): Promise<DiaryEntryWithAnalysis[]> {
    // Search through food analyses for matching food names
    return await db.query.diaryEntries.findMany({
      where: eq(diaryEntries.userId, userId),
      orderBy: desc(diaryEntries.mealDate),
      with: {
        analysis: true,
      },
    });
    // Note: Full text search would be implemented with proper database search capabilities
  }

  async getDiaryEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<DiaryEntryWithAnalysis[]> {
    return await db.query.diaryEntries.findMany({
      where: eq(diaryEntries.userId, userId),
      orderBy: desc(diaryEntries.mealDate),
      with: {
        analysis: true,
      },
    });
    // Note: Date range filtering would be implemented with proper where clauses
  }

  async createDrinkEntry(entry: InsertDrinkEntry): Promise<DrinkEntry> {
    const [drinkEntry] = await db
      .insert(drinkEntries)
      .values({
        ...entry,
        loggedAt: typeof entry.loggedAt === 'string' ? new Date(entry.loggedAt) : entry.loggedAt
      })
      .returning();
    return drinkEntry;
  }

  async getDrinkEntries(userId?: string, limit = 50): Promise<DrinkEntry[]> {
    if (userId) {
      return await db
        .select()
        .from(drinkEntries)
        .where(eq(drinkEntries.userId, userId))
        .orderBy(desc(drinkEntries.loggedAt))
        .limit(limit);
    } else {
      return await db
        .select()
        .from(drinkEntries)
        .orderBy(desc(drinkEntries.loggedAt))
        .limit(limit);
    }
  }

  async getDrinkEntry(id: string): Promise<DrinkEntry | undefined> {
    const [drinkEntry] = await db.select().from(drinkEntries).where(eq(drinkEntries.id, id));
    return drinkEntry || undefined;
  }

  async deleteDrinkEntry(id: string): Promise<boolean> {
    const result = await db.delete(drinkEntries).where(eq(drinkEntries.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Weight entry methods
  async createWeightEntry(entry: InsertWeightEntry): Promise<WeightEntry> {
    const [weightEntry] = await db
      .insert(weightEntries)
      .values({
        ...entry,
        loggedAt: typeof entry.loggedAt === 'string' ? new Date(entry.loggedAt) : entry.loggedAt
      })
      .returning();
    return weightEntry;
  }

  async getWeightEntries(userId: string, options: { start?: Date; end?: Date; limit?: number } = {}): Promise<WeightEntry[]> {
    const { limit = 100 } = options;
    return await db
      .select()
      .from(weightEntries)
      .where(eq(weightEntries.userId, userId))
      .orderBy(desc(weightEntries.loggedAt))
      .limit(limit);
    // Note: Date range filtering would be implemented with proper where clauses when needed
  }

  async getWeightEntry(id: string): Promise<WeightEntry | undefined> {
    const [weightEntry] = await db.select().from(weightEntries).where(eq(weightEntries.id, id));
    return weightEntry || undefined;
  }

  async updateWeightEntry(id: string, updateData: Partial<InsertWeightEntry>): Promise<WeightEntry | undefined> {
    const processedData: any = { ...updateData };
    if (processedData.loggedAt && typeof processedData.loggedAt === 'string') {
      processedData.loggedAt = new Date(processedData.loggedAt);
    }
    
    const [weightEntry] = await db
      .update(weightEntries)
      .set(processedData)
      .where(eq(weightEntries.id, id))
      .returning();
    return weightEntry || undefined;
  }

  async deleteWeightEntry(id: string): Promise<boolean> {
    const result = await db.delete(weightEntries).where(eq(weightEntries.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Nutrition goals methods
  async getNutritionGoals(userId: string): Promise<NutritionGoals | undefined> {
    const [goals] = await db.select().from(nutritionGoals).where(eq(nutritionGoals.userId, userId));
    return goals || undefined;
  }

  async upsertNutritionGoals(goalsData: InsertNutritionGoals): Promise<NutritionGoals> {
    const [goals] = await db
      .insert(nutritionGoals)
      .values(goalsData)
      .onConflictDoUpdate({
        target: nutritionGoals.userId,
        set: {
          ...goalsData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return goals;
  }

  // User profile methods
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async upsertUserProfile(profileData: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db
      .insert(userProfiles)
      .values(profileData)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...profileData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return profile;
  }

  // Simple food entry methods (for mobile app compatibility)
  async createSimpleFoodEntry(entryData: InsertSimpleFoodEntry): Promise<SimpleFoodEntry> {
    const [entry] = await db
      .insert(simpleFoodEntries)
      .values(entryData)
      .returning();
    return entry;
  }

  async getSimpleFoodEntries(userId: string, limit: number = 50): Promise<SimpleFoodEntry[]> {
    const entries = await db
      .select()
      .from(simpleFoodEntries)
      .where(eq(simpleFoodEntries.userId, userId))
      .orderBy(desc(simpleFoodEntries.createdAt))
      .limit(limit);
    return entries;
  }

  // Food confirmation methods (for confidence threshold workflow)
  async createFoodConfirmation(confirmationData: InsertFoodConfirmation): Promise<FoodConfirmation> {
    const [confirmation] = await db
      .insert(foodConfirmations)
      .values({
        userId: confirmationData.userId,
        imageUrl: confirmationData.imageUrl,
        originalConfidence: confirmationData.originalConfidence,
        suggestedFoods: confirmationData.suggestedFoods as DetectedFood[],
        alternativeOptions: confirmationData.alternativeOptions as DetectedFood[] | undefined,
        status: confirmationData.status || 'pending',
        userFeedback: confirmationData.userFeedback,
      })
      .returning();
    return confirmation;
  }

  async getFoodConfirmation(id: string): Promise<FoodConfirmation | undefined> {
    const [confirmation] = await db
      .select()
      .from(foodConfirmations)
      .where(eq(foodConfirmations.id, id));
    return confirmation || undefined;
  }

  async getFoodConfirmationsByUser(userId: string, status?: string): Promise<FoodConfirmation[]> {
    const whereClause = status
      ? and(eq(foodConfirmations.userId, userId), eq(foodConfirmations.status, status))
      : eq(foodConfirmations.userId, userId);

    const confirmations = await db
      .select()
      .from(foodConfirmations)
      .where(whereClause)
      .orderBy(desc(foodConfirmations.createdAt));
    
    return confirmations;
  }

  async updateFoodConfirmation(id: string, updates: UpdateFoodConfirmation): Promise<FoodConfirmation | undefined> {
    const [confirmation] = await db
      .update(foodConfirmations)
      .set({
        status: updates.status,
        finalFoods: updates.finalFoods as DetectedFood[],
        userFeedback: updates.userFeedback,
        confirmedAt: new Date(),
      })
      .where(eq(foodConfirmations.id, id))
      .returning();
    return confirmation || undefined;
  }

  async deleteFoodConfirmation(id: string): Promise<boolean> {
    const result = await db
      .delete(foodConfirmations)
      .where(eq(foodConfirmations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
