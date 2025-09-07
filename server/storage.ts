import { type FoodAnalysis, type InsertFoodAnalysis, type DetectedFood, type DiaryEntry, type InsertDiaryEntry, foodAnalyses, diaryEntries } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getFoodAnalysis(id: string): Promise<FoodAnalysis | undefined>;
  createFoodAnalysis(analysis: InsertFoodAnalysis): Promise<FoodAnalysis>;
  getAllFoodAnalyses(): Promise<FoodAnalysis[]>;
  
  // Diary methods
  createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry>;
  getDiaryEntries(limit?: number): Promise<DiaryEntry[]>;
  getDiaryEntry(id: string): Promise<DiaryEntry | undefined>;
  deleteDiaryEntry(id: string): Promise<boolean>;
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
        detectedFoods: insertAnalysis.detectedFoods
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

  async getDiaryEntries(limit = 50): Promise<DiaryEntry[]> {
    return await db
      .select()
      .from(diaryEntries)
      .orderBy(desc(diaryEntries.mealDate))
      .limit(limit);
  }

  async getDiaryEntry(id: string): Promise<DiaryEntry | undefined> {
    const [entry] = await db.select().from(diaryEntries).where(eq(diaryEntries.id, id));
    return entry || undefined;
  }

  async deleteDiaryEntry(id: string): Promise<boolean> {
    const result = await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
