import { type FoodAnalysis, type InsertFoodAnalysis, type DetectedFood, type DiaryEntry, type DiaryEntryWithAnalysis, type InsertDiaryEntry, type DrinkEntry, type InsertDrinkEntry, type User, type UpsertUser, type NutritionGoals, type InsertNutritionGoals, foodAnalyses, diaryEntries, drinkEntries, users, nutritionGoals } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getFoodAnalysis(id: string): Promise<FoodAnalysis | undefined>;
  createFoodAnalysis(analysis: InsertFoodAnalysis): Promise<FoodAnalysis>;
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
  
  // Nutrition goals methods
  getNutritionGoals(userId: string): Promise<NutritionGoals | undefined>;
  upsertNutritionGoals(goals: InsertNutritionGoals): Promise<NutritionGoals>;
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
    if (userId) {
      return await db.query.diaryEntries.findMany({
        where: eq(diaryEntries.userId, userId),
        limit,
        orderBy: desc(diaryEntries.mealDate),
        with: {
          analysis: true,
        },
      });
    } else {
      return await db.query.diaryEntries.findMany({
        limit,
        orderBy: desc(diaryEntries.mealDate),
        with: {
          analysis: true,
        },
      });
    }
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
}

export const storage = new DatabaseStorage();
