/**
 * Google Fit Integration Service (Placeholder)
 * 
 * This service is prepared for future Google Fit integration.
 * Currently returns mock data for the rewards system.
 */

export interface StepData {
  steps: number;
  earnedCalories: number;
  date: string;
}

class GoogleFitService {
  /**
   * Check if Google Fit is connected
   * @returns Promise<boolean> - Currently always returns false (not implemented)
   */
  async isConnected(): Promise<boolean> {
    return false;
  }

  /**
   * Get today's step count
   * @returns Promise<StepData> - Returns mock data (0 steps)
   */
  async getTodaySteps(): Promise<StepData> {
    return {
      steps: 0,
      earnedCalories: 0,
      date: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Connect to Google Fit (not implemented)
   * @throws Error - Always throws as feature is not yet implemented
   */
  async connect(): Promise<void> {
    throw new Error('Google Fit integration is not yet available. Stay tuned for future updates!');
  }

  /**
   * Disconnect from Google Fit (not implemented)
   */
  async disconnect(): Promise<void> {
    // No-op for now
  }

  /**
   * Sync steps from Google Fit (not implemented)
   */
  async syncSteps(): Promise<StepData> {
    return this.getTodaySteps();
  }
}

export const googleFitService = new GoogleFitService();
