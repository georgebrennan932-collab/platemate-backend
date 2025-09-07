import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const foodAnalyses = pgTable("food_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  totalCalories: integer("total_calories").notNull(),
  totalProtein: integer("total_protein").notNull(), // in grams
  totalCarbs: integer("total_carbs").notNull(), // in grams
  totalFat: integer("total_fat").notNull(), // in grams
  detectedFoods: jsonb("detected_foods").notNull().$type<DetectedFood[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const diaryEntries = pgTable("diary_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: varchar("analysis_id").notNull().references(() => foodAnalyses.id),
  mealType: varchar("meal_type").notNull(), // breakfast, lunch, dinner, snack
  mealDate: timestamp("meal_date").notNull(), // when the meal was eaten
  notes: text("notes"), // optional user notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const DetectedFoodSchema = z.object({
  name: z.string(),
  portion: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  icon: z.string(),
});

export type DetectedFood = z.infer<typeof DetectedFoodSchema>;

export const insertFoodAnalysisSchema = createInsertSchema(foodAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertFoodAnalysis = z.infer<typeof insertFoodAnalysisSchema>;
export type FoodAnalysis = typeof foodAnalyses.$inferSelect;

export const insertDiaryEntrySchema = createInsertSchema(diaryEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  mealDate: z.string().or(z.date()), // Accept string or Date
  notes: z.string().optional(),
});

export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
