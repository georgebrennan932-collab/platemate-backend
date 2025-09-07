import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  userId: varchar("user_id").notNull().references(() => users.id),
  analysisId: varchar("analysis_id").notNull().references(() => foodAnalyses.id),
  mealType: varchar("meal_type").notNull(), // breakfast, lunch, dinner, snack
  mealDate: timestamp("meal_date").notNull(), // when the meal was eaten
  notes: text("notes"), // optional user notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const drinkEntries = pgTable("drink_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  drinkName: varchar("drink_name").notNull(),
  drinkType: varchar("drink_type").notNull(), // water, coffee, tea, juice, soda, etc.
  amount: integer("amount").notNull(), // in ml
  calories: integer("calories").default(0),
  caffeine: integer("caffeine").default(0), // in mg
  sugar: integer("sugar").default(0), // in grams
  alcoholContent: integer("alcohol_content").default(0), // alcohol by volume percentage (e.g., 5 for 5%)
  alcoholUnits: integer("alcohol_units").default(0), // calculated alcohol units (ml * abv / 1000)
  loggedAt: timestamp("logged_at").notNull(), // when the drink was consumed
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

export const insertDrinkEntrySchema = createInsertSchema(drinkEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  drinkType: z.enum(["water", "coffee", "tea", "juice", "soda", "sports_drink", "beer", "wine", "spirits", "cocktail", "other"]),
  loggedAt: z.string().or(z.date()), // Accept string or Date
  notes: z.string().optional(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type InsertDrinkEntry = z.infer<typeof insertDrinkEntrySchema>;
export type DrinkEntry = typeof drinkEntries.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  diaryEntries: many(diaryEntries),
  drinkEntries: many(drinkEntries),
}));

export const foodAnalysesRelations = relations(foodAnalyses, ({ many }) => ({
  diaryEntries: many(diaryEntries),
}));

export const diaryEntriesRelations = relations(diaryEntries, ({ one }) => ({
  user: one(users, {
    fields: [diaryEntries.userId],
    references: [users.id],
  }),
  analysis: one(foodAnalyses, {
    fields: [diaryEntries.analysisId],
    references: [foodAnalyses.id],
  }),
}));

export const drinkEntriesRelations = relations(drinkEntries, ({ one }) => ({
  user: one(users, {
    fields: [drinkEntries.userId],
    references: [users.id],
  }),
}));

// Type with relations for frontend
export type DiaryEntryWithAnalysis = DiaryEntry & {
  analysis: FoodAnalysis;
};
