/**
 * Meal Memory Service
 * Tracks previously logged foods and shows "You had this last time" reminders
 */

import type { DiaryEntryWithAnalysis } from "@shared/schema";

export interface MealMemory {
  foodName: string;
  lastEaten: Date;
  daysAgo: number;
  mealType: string;
  calories: number;
}

/**
 * Find previous occurrences of similar foods in diary history
 */
export function findPreviousMeals(
  currentFoodName: string,
  diaryEntries: DiaryEntryWithAnalysis[]
): MealMemory | null {
  if (!currentFoodName || diaryEntries.length === 0) {
    return null;
  }

  // Normalize food name for comparison (lowercase, remove extra spaces)
  const normalizedCurrent = currentFoodName.toLowerCase().trim();
  
  // Find matching entries (excluding today)
  const today = new Date().toDateString();
  const matchingEntries = diaryEntries
    .filter(entry => {
      if (!entry.analysis?.detectedFoods) return false;
      
      const entryDate = new Date(entry.mealDate).toDateString();
      if (entryDate === today) return false; // Exclude today's entries
      
      // Check if any food item matches (exact match or very similar)
      return entry.analysis.detectedFoods.some((food: any) => {
        const normalizedFood = food.name.toLowerCase().trim();
        
        // Exact match
        if (normalizedFood === normalizedCurrent) return true;
        
        // Only allow substring match if one is significantly longer
        // and the shorter one is at least 4 characters (to avoid false positives like "rice" matching "fried rice")
        const minLength = 5;
        if (normalizedCurrent.length >= minLength && normalizedFood.includes(normalizedCurrent)) {
          // Ensure current is substantial part of food name
          return normalizedCurrent.length / normalizedFood.length >= 0.6;
        }
        if (normalizedFood.length >= minLength && normalizedCurrent.includes(normalizedFood)) {
          // Ensure food is substantial part of current name
          return normalizedFood.length / normalizedCurrent.length >= 0.6;
        }
        
        return false;
      });
    })
    .sort((a, b) => new Date(b.mealDate).getTime() - new Date(a.mealDate).getTime()); // Most recent first

  if (matchingEntries.length === 0) {
    return null;
  }

  const lastEntry = matchingEntries[0];
  const lastEaten = new Date(lastEntry.mealDate);
  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - lastEaten.getTime()) / (1000 * 60 * 60 * 24));

  return {
    foodName: currentFoodName,
    lastEaten,
    daysAgo,
    mealType: lastEntry.mealType,
    calories: lastEntry.analysis?.totalCalories || 0
  };
}

/**
 * Generate a friendly reminder message based on meal memory
 */
export function getMealMemoryMessage(memory: MealMemory | null): string | null {
  if (!memory) return null;

  const { daysAgo, mealType } = memory;

  // Note: daysAgo === 0 case doesn't occur because we filter out same-day entries
  if (daysAgo === 1) {
    return `You had this yesterday for ${mealType}`;
  } else if (daysAgo <= 7) {
    return `You had this ${daysAgo} days ago for ${mealType}`;
  } else if (daysAgo <= 30) {
    const weeks = Math.floor(daysAgo / 7);
    return `You had this ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else {
    return `You had this over a month ago`;
  }
}

/**
 * Get meal frequency statistics
 */
export function getMealFrequency(
  foodName: string,
  diaryEntries: DiaryEntryWithAnalysis[]
): { count: number; averageDaysBetween: number } {
  const normalizedFood = foodName.toLowerCase().trim();
  
  const matchingDates = diaryEntries
    .filter(entry => {
      if (!entry.analysis?.detectedFoods) return false;
      return entry.analysis.detectedFoods.some((food: any) => {
        const normalizedEntryFood = food.name.toLowerCase().trim();
        
        // Exact match
        if (normalizedEntryFood === normalizedFood) return true;
        
        // Stricter substring matching with minimum length and ratio
        const minLength = 5;
        if (normalizedFood.length >= minLength && normalizedEntryFood.includes(normalizedFood)) {
          return normalizedFood.length / normalizedEntryFood.length >= 0.6;
        }
        if (normalizedEntryFood.length >= minLength && normalizedFood.includes(normalizedEntryFood)) {
          return normalizedEntryFood.length / normalizedFood.length >= 0.6;
        }
        
        return false;
      });
    })
    .map(entry => new Date(entry.mealDate).getTime())
    .sort((a, b) => b - a); // Most recent first

  if (matchingDates.length < 2) {
    return { count: matchingDates.length, averageDaysBetween: 0 };
  }

  // Calculate average days between occurrences
  let totalDays = 0;
  for (let i = 0; i < matchingDates.length - 1; i++) {
    const daysBetween = (matchingDates[i] - matchingDates[i + 1]) / (1000 * 60 * 60 * 24);
    totalDays += daysBetween;
  }

  const averageDaysBetween = Math.round(totalDays / (matchingDates.length - 1));

  return {
    count: matchingDates.length,
    averageDaysBetween
  };
}
