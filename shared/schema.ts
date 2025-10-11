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
  passwordHash: varchar("password_hash"), // For email/password authentication
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profile table for physical stats and goals
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  age: integer("age"),
  sex: varchar("sex"), // 'male' or 'female'
  heightCm: integer("height_cm"), // height in centimeters
  currentWeightKg: integer("current_weight_kg"), // current weight in kg
  goalWeightKg: integer("goal_weight_kg"), // goal weight in kg
  activityLevel: varchar("activity_level"), // sedentary, lightly_active, moderately_active, very_active, extra_active
  weightGoal: varchar("weight_goal"), // lose_weight, maintain_weight, gain_weight
  weeklyWeightChangeKg: integer("weekly_weight_change_kg"), // target kg per week (can be negative for loss)
  medication: varchar("medication"), // weight loss medication if any
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nutritionGoals = pgTable("nutrition_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  dailyCalories: integer("daily_calories").default(2000),
  dailyProtein: integer("daily_protein").default(150), // in grams
  dailyCarbs: integer("daily_carbs").default(250), // in grams
  dailyFat: integer("daily_fat").default(65), // in grams
  dailyWater: integer("daily_water").default(2000), // in ml
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const foodAnalyses = pgTable("food_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  totalCalories: integer("total_calories").notNull(),
  totalProtein: integer("total_protein").notNull(), // in grams (rounded)
  totalCarbs: integer("total_carbs").notNull(), // in grams (rounded)
  totalFat: integer("total_fat").notNull(), // in grams (rounded)
  detectedFoods: jsonb("detected_foods").notNull().$type<DetectedFood[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Pending food confirmations for low confidence detections (<80%)
export const foodConfirmations = pgTable("food_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  originalConfidence: integer("original_confidence").notNull(), // Original AI confidence (0-100)
  suggestedFoods: jsonb("suggested_foods").notNull().$type<DetectedFood[]>(), // AI's food suggestions
  alternativeOptions: jsonb("alternative_options").$type<DetectedFood[]>(), // Other USDA options for manual selection
  status: varchar("status").notNull().default("pending"), // pending, confirmed, rejected
  finalFoods: jsonb("final_foods").$type<DetectedFood[]>(), // User-confirmed or modified foods
  userFeedback: text("user_feedback"), // Optional user feedback on why they changed the selection
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"), // When user confirmed/rejected
});

export const diaryEntries = pgTable("diary_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  analysisId: varchar("analysis_id").notNull().references(() => foodAnalyses.id),
  mealType: varchar("meal_type").notNull(), // breakfast, lunch, dinner, snack, custom
  customMealName: text("custom_meal_name"), // for custom meal types
  mealDate: timestamp("meal_date").notNull(), // when the meal was eaten
  notes: text("notes"), // optional user notes
  portionMultiplier: integer("portion_multiplier").default(100), // 100 = 1.0x serving (stored as integer percentage)
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

export const weightEntries = pgTable("weight_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weightGrams: integer("weight_grams").notNull(), // weight in grams for decimal precision
  loggedAt: timestamp("logged_at").notNull(), // when the weight was recorded
  notes: text("notes"), // optional user notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Simple food entries for mobile app compatibility
export const simpleFoodEntries = pgTable("simple_food_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  food: text("food").notNull(), // food name/description
  amount: text("amount").notNull(), // amount with unit (e.g., "8g", "1 cup")
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reflections = pgTable("reflections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  reflectionPeriod: varchar("reflection_period").notNull(), // 'daily' or 'weekly'
  periodStart: timestamp("period_start").notNull(), // start of the period being reflected on
  periodEnd: timestamp("period_end").notNull(), // end of the period being reflected on
  wentWell: text("went_well").notNull(), // what went well (AI generated)
  couldImprove: text("could_improve").notNull(), // what could improve (AI generated)
  actionSteps: text("action_steps").notNull().array(), // array of action items
  sentimentScore: integer("sentiment_score").notNull(), // 0-100, overall positivity
  aiProvider: varchar("ai_provider").notNull(), // 'openai' or 'gemini'
  aiModel: varchar("ai_model").notNull(), // specific model used
  status: varchar("status").notNull().default("final"), // 'draft' or 'final'
  sharedAt: timestamp("shared_at"), // when shared to social media
  shareChannel: varchar("share_channel"), // 'facebook', 'twitter', etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Gamification: Predefined challenges
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeKey: varchar("challenge_key").notNull().unique(), // unique identifier for code reference
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  challengeType: varchar("challenge_type").notNull(), // 'streak', 'count', 'goal'
  targetCount: integer("target_count").notNull(), // target value to complete
  rewardPoints: integer("reward_points").notNull().default(10),
  rewardBadge: varchar("reward_badge"), // badge/emoji awarded
  difficulty: varchar("difficulty").notNull().default("medium"), // 'easy', 'medium', 'hard'
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = disabled
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Gamification: User progress on challenges
export const userChallengeProgress = pgTable("user_challenge_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id),
  currentCount: integer("current_count").notNull().default(0),
  isCompleted: integer("is_completed").notNull().default(0), // 0 = in progress, 1 = completed
  completedAt: timestamp("completed_at"),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
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

export const updateFoodAnalysisSchema = z.object({
  detectedFoods: z.array(DetectedFoodSchema).min(1, "At least one food item is required"),
});

export type InsertFoodAnalysis = z.infer<typeof insertFoodAnalysisSchema> & {
  isAITemporarilyUnavailable?: boolean;
};
export type UpdateFoodAnalysis = z.infer<typeof updateFoodAnalysisSchema>;
export type FoodAnalysis = typeof foodAnalyses.$inferSelect & {
  isAITemporarilyUnavailable?: boolean;
};

export const insertDiaryEntrySchema = createInsertSchema(diaryEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "custom"]),
  mealDate: z.string().or(z.date()), // Accept string or Date
  notes: z.string().optional(),
  portionMultiplier: z.number().int().min(10).max(1000).default(100).optional(), // 100 = 1.0x serving
});

export const updateDiaryEntrySchema = insertDiaryEntrySchema.partial().extend({
  customMealName: z.string().optional(), // For custom meal types
  portionMultiplier: z.number().int().min(10).max(1000).optional(), // 100 = 1.0x serving (10% to 10x)
});

export const insertDrinkEntrySchema = createInsertSchema(drinkEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  drinkType: z.enum(["water", "coffee", "tea", "juice", "soda", "sports_drink", "beer", "wine", "spirits", "cocktail", "other"]),
  loggedAt: z.string().or(z.date()), // Accept string or Date
  notes: z.string().optional(),
});

export const insertNutritionGoalsSchema = createInsertSchema(nutritionGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  sex: z.enum(["male", "female"]).optional(),
  activityLevel: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]).optional(),
  weightGoal: z.enum(["lose_weight", "maintain_weight", "gain_weight"]).optional(),
  medication: z.enum(["none", "ozempic", "wegovy", "mounjaro", "other_glp1"]).optional(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;
export type UpdateDiaryEntry = z.infer<typeof updateDiaryEntrySchema>;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type InsertDrinkEntry = z.infer<typeof insertDrinkEntrySchema>;
export type DrinkEntry = typeof drinkEntries.$inferSelect;
export type InsertNutritionGoals = z.infer<typeof insertNutritionGoalsSchema>;
export type NutritionGoals = typeof nutritionGoals.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export const insertWeightEntrySchema = createInsertSchema(weightEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  loggedAt: z.string().or(z.date()), // Accept string or Date
  notes: z.string().optional(),
});

export const updateWeightEntrySchema = insertWeightEntrySchema.partial().omit({
  userId: true, // Cannot change user ownership
});

export type InsertWeightEntry = z.infer<typeof insertWeightEntrySchema>;
export type WeightEntry = typeof weightEntries.$inferSelect;

// Food confirmation schemas for confidence threshold workflow
export const insertFoodConfirmationSchema = createInsertSchema(foodConfirmations).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
}).extend({
  status: z.enum(["pending", "confirmed", "rejected"]).default("pending"),
  userFeedback: z.string().optional(),
});

export const updateFoodConfirmationSchema = z.object({
  status: z.enum(["confirmed", "rejected"]),
  finalFoods: z.array(DetectedFoodSchema).min(1, "At least one food item is required"),
  userFeedback: z.string().optional(),
});

export type InsertFoodConfirmation = z.infer<typeof insertFoodConfirmationSchema>;
export type UpdateFoodConfirmation = z.infer<typeof updateFoodConfirmationSchema>;
export type FoodConfirmation = typeof foodConfirmations.$inferSelect;

// Simple food entry schemas for mobile app compatibility
export const insertSimpleFoodEntrySchema = createInsertSchema(simpleFoodEntries).omit({
  id: true,
  createdAt: true,
});

export type SimpleFoodEntry = typeof simpleFoodEntries.$inferSelect;
export type InsertSimpleFoodEntry = z.infer<typeof insertSimpleFoodEntrySchema>;

export const insertReflectionSchema = createInsertSchema(reflections).omit({
  id: true,
  createdAt: true,
}).extend({
  reflectionPeriod: z.enum(["daily", "weekly"]),
  periodStart: z.string().or(z.date()),
  periodEnd: z.string().or(z.date()),
  status: z.enum(["draft", "final"]).default("final"),
  shareChannel: z.enum(["facebook", "twitter", "instagram"]).optional(),
});

export type InsertReflection = z.infer<typeof insertReflectionSchema>;
export type Reflection = typeof reflections.$inferSelect;

// Gamification schemas
export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
}).extend({
  challengeType: z.enum(["streak", "count", "goal"]),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export const insertUserChallengeProgressSchema = createInsertSchema(userChallengeProgress).omit({
  id: true,
  createdAt: true,
  lastUpdatedAt: true,
});

export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertUserChallengeProgress = z.infer<typeof insertUserChallengeProgressSchema>;
export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect;

// Type for challenge with progress (for frontend display)
export type ChallengeWithProgress = Challenge & {
  progress?: UserChallengeProgress;
};

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  diaryEntries: many(diaryEntries),
  drinkEntries: many(drinkEntries),
  weightEntries: many(weightEntries),
  simpleFoodEntries: many(simpleFoodEntries),
  reflections: many(reflections),
  challengeProgress: many(userChallengeProgress),
  nutritionGoals: one(nutritionGoals),
  profile: one(userProfiles),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const nutritionGoalsRelations = relations(nutritionGoals, ({ one }) => ({
  user: one(users, {
    fields: [nutritionGoals.userId],
    references: [users.id],
  }),
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

export const weightEntriesRelations = relations(weightEntries, ({ one }) => ({
  user: one(users, {
    fields: [weightEntries.userId],
    references: [users.id],
  }),
}));

export const simpleFoodEntriesRelations = relations(simpleFoodEntries, ({ one }) => ({
  user: one(users, {
    fields: [simpleFoodEntries.userId],
    references: [users.id],
  }),
}));

export const reflectionsRelations = relations(reflections, ({ one }) => ({
  user: one(users, {
    fields: [reflections.userId],
    references: [users.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  userProgress: many(userChallengeProgress),
}));

export const userChallengeProgressRelations = relations(userChallengeProgress, ({ one }) => ({
  user: one(users, {
    fields: [userChallengeProgress.userId],
    references: [users.id],
  }),
  challenge: one(challenges, {
    fields: [userChallengeProgress.challengeId],
    references: [challenges.id],
  }),
}));

// Type with relations for frontend
export type DiaryEntryWithAnalysis = DiaryEntry & {
  analysis: FoodAnalysis;
};
