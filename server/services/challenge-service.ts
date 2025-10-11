import { storage } from "../storage";
import { db } from "../db";
import { challenges } from "@shared/schema";
import type { Challenge, UserChallengeProgress, ChallengeWithProgress } from "@shared/schema";

// Predefined challenges that users can complete
export const CHALLENGE_DEFINITIONS = [
  {
    challengeKey: "first_meal_logged",
    name: "First Steps",
    description: "Log your first meal",
    challengeType: "count" as const,
    targetCount: 1,
    rewardPoints: 10,
    rewardBadge: "🎉",
    difficulty: "easy" as const,
  },
  {
    challengeKey: "5_meals_logged",
    name: "Getting Started",
    description: "Log 5 meals",
    challengeType: "count" as const,
    targetCount: 5,
    rewardPoints: 25,
    rewardBadge: "🌟",
    difficulty: "easy" as const,
  },
  {
    challengeKey: "3_day_streak",
    name: "Consistency Builder",
    description: "Log meals for 3 consecutive days",
    challengeType: "streak" as const,
    targetCount: 3,
    rewardPoints: 50,
    rewardBadge: "🔥",
    difficulty: "medium" as const,
  },
  {
    challengeKey: "7_day_streak",
    name: "Week Warrior",
    description: "Log meals for 7 consecutive days",
    challengeType: "streak" as const,
    targetCount: 7,
    rewardPoints: 100,
    rewardBadge: "💪",
    difficulty: "medium" as const,
  },
  {
    challengeKey: "30_day_streak",
    name: "Habit Master",
    description: "Log meals for 30 consecutive days",
    challengeType: "streak" as const,
    targetCount: 30,
    rewardPoints: 500,
    rewardBadge: "👑",
    difficulty: "hard" as const,
  },
  {
    challengeKey: "water_goal_5_days",
    name: "Hydration Hero",
    description: "Meet your daily water goal 5 times",
    challengeType: "goal" as const,
    targetCount: 5,
    rewardPoints: 75,
    rewardBadge: "💧",
    difficulty: "medium" as const,
  },
  {
    challengeKey: "calorie_goal_10_days",
    name: "Calorie Champion",
    description: "Stay within your calorie goal 10 times",
    challengeType: "goal" as const,
    targetCount: 10,
    rewardPoints: 150,
    rewardBadge: "🎯",
    difficulty: "hard" as const,
  },
  {
    challengeKey: "protein_goal_7_days",
    name: "Protein Pro",
    description: "Meet your protein goal 7 times",
    challengeType: "goal" as const,
    targetCount: 7,
    rewardPoints: 100,
    rewardBadge: "💪",
    difficulty: "medium" as const,
  },
  {
    challengeKey: "weight_logged_10_times",
    name: "Scale Master",
    description: "Log your weight 10 times",
    challengeType: "count" as const,
    targetCount: 10,
    rewardPoints: 50,
    rewardBadge: "⚖️",
    difficulty: "easy" as const,
  },
  {
    challengeKey: "100_meals_logged",
    name: "Tracking Legend",
    description: "Log 100 meals total",
    challengeType: "count" as const,
    targetCount: 100,
    rewardPoints: 250,
    rewardBadge: "🏆",
    difficulty: "hard" as const,
  },
];

export class ChallengeService {
  
  async initializeChallenges(): Promise<void> {
    console.log("🎯 Initializing gamification challenges...");
    let added = 0;
    
    for (const challengeDef of CHALLENGE_DEFINITIONS) {
      const existing = await storage.getChallengeByKey(challengeDef.challengeKey);
      if (!existing) {
        await db.insert(challenges).values({
          challengeKey: challengeDef.challengeKey,
          name: challengeDef.name,
          description: challengeDef.description,
          challengeType: challengeDef.challengeType,
          targetCount: challengeDef.targetCount,
          rewardPoints: challengeDef.rewardPoints,
          rewardBadge: challengeDef.rewardBadge,
          difficulty: challengeDef.difficulty,
          isActive: 1,
        } as any);
        added++;
        console.log(`  ✅ Added challenge: ${challengeDef.name}`);
      }
    }
    
    if (added > 0) {
      console.log(`🎉 Added ${added} new challenges!`);
    } else {
      console.log(`✓ All challenges already initialized`);
    }
  }

  async trackMealLogged(userId: string): Promise<UserChallengeProgress[]> {
    const completedChallenges: UserChallengeProgress[] = [];
    
    const mealChallenges = ['first_meal_logged', '5_meals_logged', '100_meals_logged'];
    
    for (const challengeKey of mealChallenges) {
      const challenge = await storage.getChallengeByKey(challengeKey);
      if (!challenge) continue;
      
      const progress = await storage.createOrUpdateProgress(userId, challenge.id, 1);
      
      if (progress.currentCount >= challenge.targetCount && progress.isCompleted === 0) {
        const completed = await storage.completeChallenge(userId, challenge.id);
        if (completed) {
          completedChallenges.push(completed);
        }
      }
    }
    
    return completedChallenges;
  }

  async trackWeightLogged(userId: string): Promise<UserChallengeProgress[]> {
    const completedChallenges: UserChallengeProgress[] = [];
    
    const weightChallenge = await storage.getChallengeByKey('weight_logged_10_times');
    if (!weightChallenge) return completedChallenges;
    
    const progress = await storage.createOrUpdateProgress(userId, weightChallenge.id, 1);
    
    if (progress.currentCount >= weightChallenge.targetCount && progress.isCompleted === 0) {
      const completed = await storage.completeChallenge(userId, weightChallenge.id);
      if (completed) {
        completedChallenges.push(completed);
      }
    }
    
    return completedChallenges;
  }

  async checkStreakChallenge(userId: string, consecutiveDays: number): Promise<UserChallengeProgress[]> {
    const completedChallenges: UserChallengeProgress[] = [];
    
    const streakChallenges = ['3_day_streak', '7_day_streak', '30_day_streak'];
    
    for (const challengeKey of streakChallenges) {
      const challenge = await storage.getChallengeByKey(challengeKey);
      if (!challenge) continue;
      
      const existingProgress = await storage.getUserChallengeProgress(userId, challenge.id);
      
      if (!existingProgress || existingProgress.isCompleted === 1) continue;
      
      if (consecutiveDays >= challenge.targetCount) {
        const completed = await storage.completeChallenge(userId, challenge.id);
        if (completed) {
          completedChallenges.push(completed);
        }
      } else {
        await storage.createOrUpdateProgress(userId, challenge.id, consecutiveDays - (existingProgress?.currentCount || 0));
      }
    }
    
    return completedChallenges;
  }

  async checkGoalChallenge(userId: string, goalType: 'water' | 'calorie' | 'protein'): Promise<UserChallengeProgress[]> {
    const completedChallenges: UserChallengeProgress[] = [];
    
    const challengeKeyMap = {
      water: 'water_goal_5_days',
      calorie: 'calorie_goal_10_days',
      protein: 'protein_goal_7_days',
    };
    
    const challengeKey = challengeKeyMap[goalType];
    const challenge = await storage.getChallengeByKey(challengeKey);
    if (!challenge) return completedChallenges;
    
    const progress = await storage.createOrUpdateProgress(userId, challenge.id, 1);
    
    if (progress.currentCount >= challenge.targetCount && progress.isCompleted === 0) {
      const completed = await storage.completeChallenge(userId, challenge.id);
      if (completed) {
        completedChallenges.push(completed);
      }
    }
    
    return completedChallenges;
  }

  async getUserChallengesWithProgress(userId: string): Promise<ChallengeWithProgress[]> {
    return await storage.getUserAllChallengesProgress(userId);
  }

  async getUserCompletedChallenges(userId: string): Promise<ChallengeWithProgress[]> {
    return await storage.getUserCompletedChallenges(userId);
  }

  async getUserTotalPoints(userId: string): Promise<number> {
    return await storage.getUserPoints(userId);
  }

  async calculateCurrentStreak(userId: string): Promise<number> {
    const diaryEntries = await storage.getDiaryEntries(userId, 100);
    
    if (diaryEntries.length === 0) return 0;
    
    const uniqueDays = new Set<string>();
    for (const entry of diaryEntries) {
      const dateStr = new Date(entry.mealDate).toISOString().split('T')[0];
      uniqueDays.add(dateStr);
    }
    
    const sortedDays = Array.from(uniqueDays).sort((a, b) => b.localeCompare(a));
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < sortedDays.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (sortedDays[i] === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
}

export const challengeService = new ChallengeService();
