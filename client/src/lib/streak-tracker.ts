/**
 * Streak Tracker Service
 * Tracks consecutive days of food logging
 */

const STREAK_STORAGE_KEY = 'platemate_streak';
const LAST_LOG_DATE_KEY = 'platemate_last_log_date';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
}

/**
 * Get current streak data from localStorage
 */
export function getStreakData(): StreakData {
  try {
    const stored = localStorage.getItem(STREAK_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load streak data:', error);
  }
  
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastLogDate: null
  };
}

/**
 * Update streak when user logs food
 */
export function updateStreak(): StreakData {
  // Use ISO date string (YYYY-MM-DD) for reliable comparison
  const today = new Date().toISOString().split('T')[0];
  const streakData = getStreakData();
  
  // If already logged today, no update needed
  if (streakData.lastLogDate === today) {
    return streakData;
  }
  
  // Calculate yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Check if streak continues
  if (streakData.lastLogDate === yesterdayStr) {
    // Consecutive day - increment streak
    streakData.currentStreak++;
  } else {
    // Streak broken or first log - start new streak
    streakData.currentStreak = 1;
  }
  
  // Update longest streak
  if (streakData.currentStreak > streakData.longestStreak) {
    streakData.longestStreak = streakData.currentStreak;
  }
  
  // Update last log date
  streakData.lastLogDate = today;
  
  // Save to localStorage
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streakData));
  } catch (error) {
    console.error('Failed to save streak data:', error);
  }
  
  return streakData;
}

/**
 * Reset streak (for testing or user request)
 */
export function resetStreak(): void {
  localStorage.removeItem(STREAK_STORAGE_KEY);
  localStorage.removeItem(LAST_LOG_DATE_KEY);
}

/**
 * Get streak status message
 */
export function getStreakMessage(streak: number): string {
  if (streak === 0) {
    return "Start your streak today!";
  } else if (streak === 1) {
    return "Great start! Keep it going!";
  } else if (streak < 7) {
    return `${streak} days strong! Keep logging!`;
  } else if (streak < 30) {
    return `Amazing! ${streak} day streak!`;
  } else {
    return `Incredible! ${streak} days and counting!`;
  }
}
