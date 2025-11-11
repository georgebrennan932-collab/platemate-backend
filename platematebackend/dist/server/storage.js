import { foodAnalyses, diaryEntries, waterIntake, drinkEntries, weightEntries, stepEntries, users, nutritionGoals, userProfiles, simpleFoodEntries, foodConfirmations, reflections, challenges, userChallengeProgress, shoppingListItems, shiftSchedules } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lt } from "drizzle-orm";
export class DatabaseStorage {
    async getFoodAnalysis(id) {
        const [analysis] = await db.select().from(foodAnalyses).where(eq(foodAnalyses.id, id));
        return analysis || undefined;
    }
    async createFoodAnalysis(insertAnalysis) {
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
    async updateFoodAnalysis(id, updates) {
        // Only set fields that are actually provided in updates to avoid nulling existing data
        const setClause = {};
        if (updates.imageUrl !== undefined)
            setClause.imageUrl = updates.imageUrl;
        if (updates.confidence !== undefined)
            setClause.confidence = updates.confidence;
        if (updates.totalCalories !== undefined)
            setClause.totalCalories = updates.totalCalories;
        if (updates.totalProtein !== undefined)
            setClause.totalProtein = updates.totalProtein;
        if (updates.totalCarbs !== undefined)
            setClause.totalCarbs = updates.totalCarbs;
        if (updates.totalFat !== undefined)
            setClause.totalFat = updates.totalFat;
        if (updates.detectedFoods !== undefined)
            setClause.detectedFoods = updates.detectedFoods;
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
    async getAllFoodAnalyses() {
        return await db
            .select()
            .from(foodAnalyses)
            .orderBy(desc(foodAnalyses.createdAt));
    }
    // User methods for authentication
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || undefined;
    }
    async upsertUser(userData) {
        // Check if user with this email already exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, userData.email));
        if (existingUser) {
            // Update existing user
            const [user] = await db
                .update(users)
                .set({
                ...userData,
                updatedAt: new Date(),
            })
                .where(eq(users.email, userData.email))
                .returning();
            return user;
        }
        else {
            // Insert new user
            const [user] = await db
                .insert(users)
                .values(userData)
                .returning();
            return user;
        }
    }
    async createDiaryEntry(entry) {
        const [diaryEntry] = await db
            .insert(diaryEntries)
            .values({
            ...entry,
            mealDate: typeof entry.mealDate === 'string' ? new Date(entry.mealDate) : entry.mealDate
        })
            .returning();
        return diaryEntry;
    }
    async getDiaryEntries(userId, limit = 50) {
        if (userId) {
            return await db.query.diaryEntries.findMany({
                where: eq(diaryEntries.userId, userId),
                limit,
                orderBy: desc(diaryEntries.mealDate),
                with: {
                    analysis: true,
                },
            });
        }
        else {
            return await db.query.diaryEntries.findMany({
                limit,
                orderBy: desc(diaryEntries.mealDate),
                with: {
                    analysis: true,
                },
            });
        }
    }
    async getDiaryEntry(id) {
        return await db.query.diaryEntries.findFirst({
            where: eq(diaryEntries.id, id),
            with: {
                analysis: true,
            },
        });
    }
    async updateDiaryEntry(id, entry) {
        const updateData = { ...entry };
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
    async deleteDiaryEntry(id) {
        const result = await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
        return result.rowCount !== null && result.rowCount > 0;
    }
    async searchDiaryEntries(userId, query) {
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
    async getDiaryEntriesByDateRange(userId, startDate, endDate) {
        return await db.query.diaryEntries.findMany({
            where: eq(diaryEntries.userId, userId),
            orderBy: desc(diaryEntries.mealDate),
            with: {
                analysis: true,
            },
        });
        // Note: Date range filtering would be implemented with proper where clauses
    }
    // Water intake methods
    async createWaterIntake(entry) {
        const [waterEntry] = await db
            .insert(waterIntake)
            .values({
            ...entry,
            loggedAt: typeof entry.loggedAt === 'string' ? new Date(entry.loggedAt) : entry.loggedAt
        })
            .returning();
        return waterEntry;
    }
    async getWaterIntakeByDate(userId, date) {
        return await db
            .select()
            .from(waterIntake)
            .where(and(eq(waterIntake.userId, userId), eq(waterIntake.loggedDate, date)))
            .orderBy(desc(waterIntake.loggedAt));
    }
    async deleteWaterIntake(id, userId) {
        const result = await db
            .delete(waterIntake)
            .where(and(eq(waterIntake.id, id), eq(waterIntake.userId, userId)));
        return result.rowCount !== null && result.rowCount > 0;
    }
    async createDrinkEntry(entry) {
        const [drinkEntry] = await db
            .insert(drinkEntries)
            .values({
            ...entry,
            loggedAt: typeof entry.loggedAt === 'string' ? new Date(entry.loggedAt) : entry.loggedAt
        })
            .returning();
        return drinkEntry;
    }
    async getDrinkEntries(userId, limit = 50) {
        if (userId) {
            return await db
                .select()
                .from(drinkEntries)
                .where(eq(drinkEntries.userId, userId))
                .orderBy(desc(drinkEntries.loggedAt))
                .limit(limit);
        }
        else {
            return await db
                .select()
                .from(drinkEntries)
                .orderBy(desc(drinkEntries.loggedAt))
                .limit(limit);
        }
    }
    async getDrinkEntry(id) {
        const [drinkEntry] = await db.select().from(drinkEntries).where(eq(drinkEntries.id, id));
        return drinkEntry || undefined;
    }
    async deleteDrinkEntry(id) {
        const result = await db.delete(drinkEntries).where(eq(drinkEntries.id, id));
        return result.rowCount !== null && result.rowCount > 0;
    }
    // Weight entry methods
    async createWeightEntry(entry) {
        const [weightEntry] = await db
            .insert(weightEntries)
            .values({
            ...entry,
            loggedAt: typeof entry.loggedAt === 'string' ? new Date(entry.loggedAt) : entry.loggedAt
        })
            .returning();
        return weightEntry;
    }
    async getWeightEntries(userId, options = {}) {
        const { limit = 100 } = options;
        return await db
            .select()
            .from(weightEntries)
            .where(eq(weightEntries.userId, userId))
            .orderBy(desc(weightEntries.loggedAt))
            .limit(limit);
        // Note: Date range filtering would be implemented with proper where clauses when needed
    }
    async getWeightEntry(id) {
        const [weightEntry] = await db.select().from(weightEntries).where(eq(weightEntries.id, id));
        return weightEntry || undefined;
    }
    async updateWeightEntry(id, updateData) {
        const processedData = { ...updateData };
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
    async deleteWeightEntry(id) {
        const result = await db.delete(weightEntries).where(eq(weightEntries.id, id));
        return result.rowCount !== null && result.rowCount > 0;
    }
    // Step entry methods
    async createStepEntry(entry) {
        const [stepEntry] = await db
            .insert(stepEntries)
            .values({
            ...entry,
            loggedDate: typeof entry.loggedDate === 'string' ? new Date(entry.loggedDate) : entry.loggedDate
        })
            .returning();
        return stepEntry;
    }
    async getTodaySteps(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [stepEntry] = await db
            .select()
            .from(stepEntries)
            .where(and(eq(stepEntries.userId, userId), gte(stepEntries.loggedDate, today), lt(stepEntries.loggedDate, tomorrow)))
            .limit(1);
        return stepEntry || undefined;
    }
    async getStepEntries(userId, options = {}) {
        const { limit = 30 } = options;
        return await db
            .select()
            .from(stepEntries)
            .where(eq(stepEntries.userId, userId))
            .orderBy(desc(stepEntries.loggedDate))
            .limit(limit);
    }
    async updateTodaySteps(userId, stepCount) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Try to find existing entry for today
        const existingEntry = await this.getTodaySteps(userId);
        if (existingEntry) {
            // Update existing entry
            const [updated] = await db
                .update(stepEntries)
                .set({
                stepCount,
                updatedAt: new Date()
            })
                .where(eq(stepEntries.id, existingEntry.id))
                .returning();
            return updated;
        }
        else {
            // Create new entry
            return await this.createStepEntry({
                userId,
                stepCount,
                loggedDate: today,
                source: 'device'
            });
        }
    }
    // Nutrition goals methods
    async getNutritionGoals(userId) {
        const [goals] = await db.select().from(nutritionGoals).where(eq(nutritionGoals.userId, userId));
        return goals || undefined;
    }
    async upsertNutritionGoals(goalsData) {
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
    async getUserProfile(userId) {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
        return profile || undefined;
    }
    async upsertUserProfile(profileData) {
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
    // Shift schedule methods for weekly meal planning
    async getShiftSchedules(userId, startDate, endDate) {
        const schedules = await db
            .select()
            .from(shiftSchedules)
            .where(and(eq(shiftSchedules.userId, userId), gte(shiftSchedules.shiftDate, startDate), lt(shiftSchedules.shiftDate, endDate)))
            .orderBy(shiftSchedules.shiftDate);
        return schedules;
    }
    async getShiftSchedule(userId, date) {
        const [schedule] = await db
            .select()
            .from(shiftSchedules)
            .where(and(eq(shiftSchedules.userId, userId), eq(shiftSchedules.shiftDate, date)));
        return schedule || undefined;
    }
    async upsertShiftSchedule(scheduleData) {
        // First, try to find an existing schedule for this user and date
        const existing = await this.getShiftSchedule(scheduleData.userId, scheduleData.shiftDate);
        if (existing) {
            // Update existing schedule
            const [updated] = await db
                .update(shiftSchedules)
                .set({
                ...scheduleData,
                updatedAt: new Date(),
            })
                .where(and(eq(shiftSchedules.userId, scheduleData.userId), eq(shiftSchedules.shiftDate, scheduleData.shiftDate)))
                .returning();
            return updated;
        }
        else {
            // Insert new schedule
            const [schedule] = await db
                .insert(shiftSchedules)
                .values(scheduleData)
                .returning();
            return schedule;
        }
    }
    async deleteShiftSchedule(userId, date) {
        const result = await db
            .delete(shiftSchedules)
            .where(and(eq(shiftSchedules.userId, userId), eq(shiftSchedules.shiftDate, date)));
        return true;
    }
    // Simple food entry methods (for mobile app compatibility)
    async createSimpleFoodEntry(entryData) {
        const [entry] = await db
            .insert(simpleFoodEntries)
            .values(entryData)
            .returning();
        return entry;
    }
    async getSimpleFoodEntries(userId, limit = 50) {
        const entries = await db
            .select()
            .from(simpleFoodEntries)
            .where(eq(simpleFoodEntries.userId, userId))
            .orderBy(desc(simpleFoodEntries.createdAt))
            .limit(limit);
        return entries;
    }
    // Food confirmation methods (for confidence threshold workflow)
    async createFoodConfirmation(confirmationData) {
        const [confirmation] = await db
            .insert(foodConfirmations)
            .values({
            userId: confirmationData.userId,
            imageUrl: confirmationData.imageUrl,
            originalConfidence: confirmationData.originalConfidence,
            suggestedFoods: confirmationData.suggestedFoods,
            alternativeOptions: confirmationData.alternativeOptions,
            status: confirmationData.status || 'pending',
            userFeedback: confirmationData.userFeedback,
        })
            .returning();
        return confirmation;
    }
    async getFoodConfirmation(id) {
        const [confirmation] = await db
            .select()
            .from(foodConfirmations)
            .where(eq(foodConfirmations.id, id));
        return confirmation || undefined;
    }
    async getFoodConfirmationsByUser(userId, status) {
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
    async updateFoodConfirmation(id, updates) {
        const [confirmation] = await db
            .update(foodConfirmations)
            .set({
            status: updates.status,
            finalFoods: updates.finalFoods,
            userFeedback: updates.userFeedback,
            confirmedAt: new Date(),
        })
            .where(eq(foodConfirmations.id, id))
            .returning();
        return confirmation || undefined;
    }
    async deleteFoodConfirmation(id) {
        const result = await db
            .delete(foodConfirmations)
            .where(eq(foodConfirmations.id, id));
        return result.rowCount !== null && result.rowCount > 0;
    }
    // Reflection methods
    async createReflection(reflectionData) {
        const [reflection] = await db
            .insert(reflections)
            .values({
            userId: reflectionData.userId,
            reflectionPeriod: reflectionData.reflectionPeriod,
            periodStart: typeof reflectionData.periodStart === 'string' ? new Date(reflectionData.periodStart) : reflectionData.periodStart,
            periodEnd: typeof reflectionData.periodEnd === 'string' ? new Date(reflectionData.periodEnd) : reflectionData.periodEnd,
            wentWell: reflectionData.wentWell,
            couldImprove: reflectionData.couldImprove,
            actionSteps: reflectionData.actionSteps,
            sentimentScore: reflectionData.sentimentScore,
            aiProvider: reflectionData.aiProvider,
            aiModel: reflectionData.aiModel,
            status: reflectionData.status || 'final',
        })
            .returning();
        return reflection;
    }
    async getReflection(id) {
        const [reflection] = await db
            .select()
            .from(reflections)
            .where(eq(reflections.id, id));
        return reflection || undefined;
    }
    async getReflectionsByUser(userId, period) {
        const whereClause = period
            ? and(eq(reflections.userId, userId), eq(reflections.reflectionPeriod, period))
            : eq(reflections.userId, userId);
        const userReflections = await db
            .select()
            .from(reflections)
            .where(whereClause)
            .orderBy(desc(reflections.createdAt));
        return userReflections;
    }
    async getLatestReflection(userId, period) {
        const [reflection] = await db
            .select()
            .from(reflections)
            .where(and(eq(reflections.userId, userId), eq(reflections.reflectionPeriod, period)))
            .orderBy(desc(reflections.createdAt))
            .limit(1);
        return reflection || undefined;
    }
    async updateReflectionShared(id, shareChannel) {
        const [reflection] = await db
            .update(reflections)
            .set({
            sharedAt: new Date(),
            shareChannel: shareChannel,
        })
            .where(eq(reflections.id, id))
            .returning();
        return reflection || undefined;
    }
    async deleteTodayReflection(userId, period) {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        // Delete all reflections created today for this user and period
        const result = await db
            .delete(reflections)
            .where(and(eq(reflections.userId, userId), eq(reflections.reflectionPeriod, period), gte(reflections.createdAt, today), lt(reflections.createdAt, endOfToday)));
        return result.rowCount !== null && result.rowCount > 0;
    }
    // Gamification methods
    async getAllChallenges() {
        const allChallenges = await db
            .select()
            .from(challenges)
            .where(eq(challenges.isActive, 1))
            .orderBy(challenges.difficulty, challenges.rewardPoints);
        return allChallenges;
    }
    async getChallenge(id) {
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, id));
        return challenge || undefined;
    }
    async getChallengeByKey(challengeKey) {
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.challengeKey, challengeKey));
        return challenge || undefined;
    }
    async getUserChallengeProgress(userId, challengeId) {
        const [progress] = await db
            .select()
            .from(userChallengeProgress)
            .where(and(eq(userChallengeProgress.userId, userId), eq(userChallengeProgress.challengeId, challengeId)));
        return progress || undefined;
    }
    async getUserAllChallengesProgress(userId) {
        const allChallenges = await this.getAllChallenges();
        const challengesWithProgress = await Promise.all(allChallenges.map(async (challenge) => {
            const progress = await this.getUserChallengeProgress(userId, challenge.id);
            return {
                ...challenge,
                progress: progress || undefined,
            };
        }));
        return challengesWithProgress;
    }
    async createOrUpdateProgress(userId, challengeId, increment) {
        const existingProgress = await this.getUserChallengeProgress(userId, challengeId);
        if (existingProgress) {
            const newCount = existingProgress.currentCount + increment;
            const [updated] = await db
                .update(userChallengeProgress)
                .set({
                currentCount: newCount,
                lastUpdatedAt: new Date(),
            })
                .where(eq(userChallengeProgress.id, existingProgress.id))
                .returning();
            return updated;
        }
        else {
            const [newProgress] = await db
                .insert(userChallengeProgress)
                .values({
                userId,
                challengeId,
                currentCount: increment,
                lastUpdatedAt: new Date(),
            })
                .returning();
            return newProgress;
        }
    }
    async completeChallenge(userId, challengeId) {
        const progress = await this.getUserChallengeProgress(userId, challengeId);
        if (!progress || progress.isCompleted === 1) {
            return progress || undefined;
        }
        const [completed] = await db
            .update(userChallengeProgress)
            .set({
            isCompleted: 1,
            completedAt: new Date(),
        })
            .where(eq(userChallengeProgress.id, progress.id))
            .returning();
        return completed || undefined;
    }
    async getUserCompletedChallenges(userId) {
        const completedProgress = await db
            .select()
            .from(userChallengeProgress)
            .where(and(eq(userChallengeProgress.userId, userId), eq(userChallengeProgress.isCompleted, 1)))
            .orderBy(desc(userChallengeProgress.completedAt));
        const challengesWithProgress = await Promise.all(completedProgress.map(async (progress) => {
            const challenge = await this.getChallenge(progress.challengeId);
            if (!challenge)
                return null;
            return {
                ...challenge,
                progress,
            };
        }));
        return challengesWithProgress.filter((c) => c !== null);
    }
    async getUserPoints(userId) {
        const completedChallenges = await this.getUserCompletedChallenges(userId);
        return completedChallenges.reduce((total, challenge) => total + challenge.rewardPoints, 0);
    }
    // Shopping list methods
    async getShoppingList(userId) {
        const items = await db
            .select()
            .from(shoppingListItems)
            .where(eq(shoppingListItems.userId, userId))
            .orderBy(desc(shoppingListItems.createdAt));
        return items;
    }
    async addShoppingItem(item) {
        const [newItem] = await db
            .insert(shoppingListItems)
            .values(item)
            .returning();
        return newItem;
    }
    async updateShoppingItem(id, userId, updates) {
        const [updatedItem] = await db
            .update(shoppingListItems)
            .set(updates)
            .where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.userId, userId)))
            .returning();
        return updatedItem || undefined;
    }
    async deleteShoppingItem(id, userId) {
        const result = await db
            .delete(shoppingListItems)
            .where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.userId, userId)));
        return result.rowCount !== null && result.rowCount > 0;
    }
    async clearShoppingList(userId) {
        const result = await db
            .delete(shoppingListItems)
            .where(eq(shoppingListItems.userId, userId));
        return result.rowCount !== null && result.rowCount > 0;
    }
}
export const storage = new DatabaseStorage();
