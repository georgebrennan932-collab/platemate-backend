import { type FoodAnalysis, type InsertFoodAnalysis, type DetectedFood, type DiaryEntry, type DiaryEntryWithAnalysis, type InsertDiaryEntry, type DrinkEntry, type InsertDrinkEntry, foodAnalyses, diaryEntries, drinkEntries } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getFoodAnalysis(id: string): Promise<FoodAnalysis | undefined>;
  createFoodAnalysis(analysis: InsertFoodAnalysis): Promise<FoodAnalysis>;
  getAllFoodAnalyses(): Promise<FoodAnalysis[]>;
  
  // Diary methods
  createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry>;
  getDiaryEntries(limit?: number): Promise<DiaryEntryWithAnalysis[]>;
  getDiaryEntry(id: string): Promise<DiaryEntryWithAnalysis | undefined>;
  deleteDiaryEntry(id: string): Promise<boolean>;
  
  // Drink methods
  createDrinkEntry(entry: InsertDrinkEntry): Promise<DrinkEntry>;
  getDrinkEntries(limit?: number): Promise<DrinkEntry[]>;
  getDrinkEntry(id: string): Promise<DrinkEntry | undefined>;
  deleteDrinkEntry(id: string): Promise<boolean>;
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

  async getDiaryEntries(limit = 50): Promise<DiaryEntryWithAnalysis[]> {
    return await db.query.diaryEntries.findMany({
      limit,
      orderBy: desc(diaryEntries.mealDate),
      with: {
        analysis: true,
      },
    });
  }

  async getDiaryEntry(id: string): Promise<DiaryEntryWithAnalysis | undefined> {
    return await db.query.diaryEntries.findFirst({
      where: eq(diaryEntries.id, id),
      with: {
        analysis: true,
      },
    });
  }

  async deleteDiaryEntry(id: string): Promise<boolean> {
    const result = await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
    return result.rowCount !== null && result.rowCount > 0;
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

  async getDrinkEntries(limit = 50): Promise<DrinkEntry[]> {
    return await db
      .select()
      .from(drinkEntries)
      .orderBy(desc(drinkEntries.loggedAt))
      .limit(limit);
  }

  async getDrinkEntry(id: string): Promise<DrinkEntry | undefined> {
    const [drinkEntry] = await db.select().from(drinkEntries).where(eq(drinkEntries.id, id));
    return drinkEntry || undefined;
  }

  async deleteDrinkEntry(id: string): Promise<boolean> {
    const result = await db.delete(drinkEntries).where(eq(drinkEntries.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
