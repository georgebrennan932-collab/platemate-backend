/**
 * Local storage service for guest user data
 * Stores diary entries, weights, and goals locally
 */

import type { DiaryEntry, WeightEntry, NutritionGoals } from "@shared/schema";

const GUEST_DIARY_KEY = 'platemate_guest_diary';
const GUEST_WEIGHTS_KEY = 'platemate_guest_weights';
const GUEST_GOALS_KEY = 'platemate_guest_goals';

/**
 * Guest Diary Storage
 */
export const guestDiaryStorage = {
  getAll(): DiaryEntry[] {
    try {
      const data = localStorage.getItem(GUEST_DIARY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save(entry: DiaryEntry): void {
    const entries = this.getAll();
    entries.push(entry);
    localStorage.setItem(GUEST_DIARY_KEY, JSON.stringify(entries));
  },

  update(id: string, updates: Partial<DiaryEntry>): void {
    const entries = this.getAll();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updates };
      localStorage.setItem(GUEST_DIARY_KEY, JSON.stringify(entries));
    }
  },

  delete(id: string): void {
    const entries = this.getAll().filter(e => e.id !== id);
    localStorage.setItem(GUEST_DIARY_KEY, JSON.stringify(entries));
  },

  clear(): void {
    localStorage.removeItem(GUEST_DIARY_KEY);
  }
};

/**
 * Guest Weights Storage
 */
export const guestWeightsStorage = {
  getAll(): WeightEntry[] {
    try {
      const data = localStorage.getItem(GUEST_WEIGHTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save(weight: WeightEntry): void {
    const weights = this.getAll();
    weights.push(weight);
    localStorage.setItem(GUEST_WEIGHTS_KEY, JSON.stringify(weights));
  },

  update(id: string, updates: Partial<WeightEntry>): void {
    const weights = this.getAll();
    const index = weights.findIndex(w => w.id === id);
    if (index !== -1) {
      weights[index] = { ...weights[index], ...updates };
      localStorage.setItem(GUEST_WEIGHTS_KEY, JSON.stringify(weights));
    }
  },

  delete(id: string): void {
    const weights = this.getAll().filter(w => w.id !== id);
    localStorage.setItem(GUEST_WEIGHTS_KEY, JSON.stringify(weights));
  },

  clear(): void {
    localStorage.removeItem(GUEST_WEIGHTS_KEY);
  }
};

/**
 * Guest Goals Storage
 */
export const guestGoalsStorage = {
  get(): NutritionGoals | null {
    try {
      const data = localStorage.getItem(GUEST_GOALS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  save(goal: NutritionGoals): void {
    localStorage.setItem(GUEST_GOALS_KEY, JSON.stringify(goal));
  },

  clear(): void {
    localStorage.removeItem(GUEST_GOALS_KEY);
  }
};

/**
 * Get all guest data for migration
 */
export function getAllGuestData() {
  return {
    diary: guestDiaryStorage.getAll(),
    weights: guestWeightsStorage.getAll(),
    goals: guestGoalsStorage.get()
  };
}

/**
 * Clear all guest storage
 */
export function clearAllGuestStorage(): void {
  guestDiaryStorage.clear();
  guestWeightsStorage.clear();
  guestGoalsStorage.clear();
}
