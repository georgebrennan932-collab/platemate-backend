import { type FoodAnalysis, type InsertFoodAnalysis, type DetectedFood } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getFoodAnalysis(id: string): Promise<FoodAnalysis | undefined>;
  createFoodAnalysis(analysis: InsertFoodAnalysis): Promise<FoodAnalysis>;
  getAllFoodAnalyses(): Promise<FoodAnalysis[]>;
}

export class MemStorage implements IStorage {
  private analyses: Map<string, FoodAnalysis>;

  constructor() {
    this.analyses = new Map();
  }

  async getFoodAnalysis(id: string): Promise<FoodAnalysis | undefined> {
    return this.analyses.get(id);
  }

  async createFoodAnalysis(insertAnalysis: InsertFoodAnalysis): Promise<FoodAnalysis> {
    const id = randomUUID();
    const analysis: FoodAnalysis = { 
      id,
      imageUrl: insertAnalysis.imageUrl,
      confidence: insertAnalysis.confidence,
      totalCalories: insertAnalysis.totalCalories,
      totalProtein: insertAnalysis.totalProtein,
      totalCarbs: insertAnalysis.totalCarbs,
      totalFat: insertAnalysis.totalFat,
      detectedFoods: insertAnalysis.detectedFoods as DetectedFood[],
      createdAt: new Date()
    };
    this.analyses.set(id, analysis);
    return analysis;
  }

  async getAllFoodAnalyses(): Promise<FoodAnalysis[]> {
    return Array.from(this.analyses.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
}

export const storage = new MemStorage();
