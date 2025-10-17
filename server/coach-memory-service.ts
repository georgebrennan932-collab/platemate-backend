import { db } from "./db";
import { aiCoachMemory, userProfiles } from "@shared/schema";
import type { InsertAiCoachMemory, UpdateAiCoachMemory, AiCoachMemory } from "@shared/schema";
import { eq } from "drizzle-orm";

export class CoachMemoryService {
  /**
   * Get or create coach memory for a user
   */
  async getOrCreateMemory(userId: string): Promise<AiCoachMemory> {
    const existing = await db.query.aiCoachMemory.findFirst({
      where: eq(aiCoachMemory.userId, userId),
    });

    if (existing) {
      return existing;
    }

    // Create default memory with zen personality
    const [newMemory] = await db
      .insert(aiCoachMemory)
      .values({
        userId,
        selectedPersonality: "zen",
        motivationalStyle: "positive",
        interests: [],
        conversationTopics: [],
        recentMoods: [],
      })
      .returning();

    return newMemory;
  }

  /**
   * Update coach memory for a user
   */
  async updateMemory(userId: string, updates: UpdateAiCoachMemory): Promise<AiCoachMemory> {
    const [updated] = await db
      .update(aiCoachMemory)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aiCoachMemory.userId, userId))
      .returning();

    return updated;
  }

  /**
   * Update last interaction timestamp
   */
  async updateLastInteraction(userId: string): Promise<void> {
    await db
      .update(aiCoachMemory)
      .set({
        lastInteraction: new Date(),
      })
      .where(eq(aiCoachMemory.userId, userId));
  }

  /**
   * Add mood entry to recent moods (keeps last 30 entries)
   */
  async addMoodEntry(userId: string, mood: string, sentiment: number): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    const recentMoods = memory.recentMoods || [];
    
    const newMood = {
      date: new Date().toISOString(),
      mood,
      sentiment,
    };

    // Keep only last 30 mood entries
    const updatedMoods = [newMood, ...recentMoods].slice(0, 30);

    await db
      .update(aiCoachMemory)
      .set({
        recentMoods: updatedMoods,
        updatedAt: new Date(),
      })
      .where(eq(aiCoachMemory.userId, userId));
  }

  /**
   * Add conversation topic to recent topics (keeps last 10)
   */
  async addConversationTopic(userId: string, topic: string): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    const topics = memory.conversationTopics || [];

    // Avoid duplicates and keep only last 10 topics
    const updatedTopics = [topic, ...topics.filter(t => t !== topic)].slice(0, 10);

    await db
      .update(aiCoachMemory)
      .set({
        conversationTopics: updatedTopics,
        updatedAt: new Date(),
      })
      .where(eq(aiCoachMemory.userId, userId));
  }

  /**
   * Get comprehensive user context for AI (combines memory + profile)
   */
  async getUserContext(userId: string): Promise<{
    memory: AiCoachMemory;
    profile: any;
    userName: string;
  }> {
    const memory = await this.getOrCreateMemory(userId);
    
    // Get user profile for additional context
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    // Determine preferred name for AI to use
    const userName = profile?.nickname || profile?.name || "friend";

    return {
      memory,
      profile,
      userName,
    };
  }

  /**
   * Extract and update user details from conversation
   * (Called after each AI interaction to learn from natural conversation)
   */
  async extractAndUpdateFromConversation(userId: string, userMessage: string): Promise<void> {
    // Simple keyword extraction (can be enhanced with NLP later)
    const lowerMessage = userMessage.toLowerCase();
    
    // Detect interests
    const interestKeywords = [
      { keyword: "gym", interest: "gym" },
      { keyword: "workout", interest: "gym" },
      { keyword: "football", interest: "football" },
      { keyword: "soccer", interest: "football" },
      { keyword: "music", interest: "music" },
      { keyword: "gaming", interest: "gaming" },
      { keyword: "video game", interest: "gaming" },
      { keyword: "kids", interest: "kids" },
      { keyword: "children", interest: "kids" },
      { keyword: "car", interest: "cars" },
      { keyword: "mental health", interest: "mental health" },
      { keyword: "meditation", interest: "mindfulness" },
    ];

    const memory = await this.getOrCreateMemory(userId);
    const currentInterests = memory.interests || [];
    let newInterests = [...currentInterests];

    for (const { keyword, interest } of interestKeywords) {
      if (lowerMessage.includes(keyword) && !currentInterests.includes(interest)) {
        newInterests.push(interest);
      }
    }

    // Update if new interests found
    if (newInterests.length > currentInterests.length) {
      await this.updateMemory(userId, {
        interests: newInterests,
      });
    }

    // Extract work schedule hints
    if (lowerMessage.includes("night shift") || lowerMessage.includes("night shifts")) {
      await this.updateMemory(userId, {
        workSchedule: "night shifts",
      });
    } else if (lowerMessage.includes("day shift") || lowerMessage.includes("day shifts")) {
      await this.updateMemory(userId, {
        workSchedule: "day shifts",
      });
    }

    // Extract occupation hints
    if (lowerMessage.includes("nurse") || lowerMessage.includes("nursing")) {
      await this.updateMemory(userId, {
        occupation: "nurse",
      });
    } else if (lowerMessage.includes("military") || lowerMessage.includes("army") || lowerMessage.includes("veteran")) {
      await this.updateMemory(userId, {
        lifestyleDetails: "ex-military",
      });
    }
  }
}

export const coachMemoryService = new CoachMemoryService();
