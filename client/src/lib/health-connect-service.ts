/**
 * Android Health Connect API Integration Service
 * 
 * Health Connect is Android's centralized health and fitness data platform.
 * It provides better privacy controls and more comprehensive health data types
 * than the deprecated Google Fit APIs.
 */

// Health Connect integration with web fallback
import { Capacitor } from '@capacitor/core';

// Web fallback for Health Connect
const CapacitorHealth = {
  async isHealthAvailable() { 
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; 
  },
  async checkHealthPermissions() { 
    return { permissions: {} }; 
  },
  async requestHealthPermissions() { 
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Health Connect is only available on Android devices');
    }
    return { permissions: {} }; 
  },
  async queryHealthData() { 
    return { data: [] }; 
  },
  async showHealthConnectInPlayStore() { 
    console.log('Would open Play Store for Health Connect'); 
  },
  async openHealthConnectSettings() { 
    console.log('Would open Health Connect settings'); 
  }
};

interface HealthConnectData {
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  heartRate?: number;
  weight?: number;
}

interface HealthConnectPermissions {
  READ_STEPS: boolean;
  READ_DISTANCE: boolean;
  READ_ACTIVE_CALORIES_BURNED: boolean;
  READ_HEART_RATE: boolean;
  READ_EXERCISE: boolean;
}

class HealthConnectService {
  private isAuthenticated = false;
  private permissions: Partial<HealthConnectPermissions> = {};

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Health Connect service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if we're on a web platform
      if (!Capacitor.isNativePlatform()) {
        console.log('Health Connect: Web platform detected - Health Connect only available on Android');
        return false;
      }

      // Check if Health Connect is available on the device
      const isAvailable = await CapacitorHealth.isHealthAvailable();
      
      if (!isAvailable) {
        console.warn('Health Connect: Not available on this device');
        return false;
      }

      // Check existing permissions
      const permissions = ['READ_STEPS', 'READ_DISTANCE', 'READ_ACTIVE_CALORIES_BURNED', 'READ_HEART_RATE', 'READ_EXERCISE'];
      const permissionStatus = await CapacitorHealth.checkHealthPermissions({ permissions });
      
      if (permissionStatus?.permissions) {
        this.permissions = permissionStatus.permissions;
        this.isAuthenticated = Object.values(permissionStatus.permissions).some(granted => granted);
        
        if (this.isAuthenticated) {
          console.log('✓ Health Connect: Using existing permissions');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Health Connect initialization error:', error);
      return false;
    }
  }

  /**
   * Request Health Connect permissions
   */
  async authenticate(): Promise<boolean> {
    try {
      // Check if we're on a web platform
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Health Connect is only available on Android devices. This feature will work when you install the app on your Android phone.');
      }

      // Check if Health Connect is available
      const isAvailable = await CapacitorHealth.isHealthAvailable();
      
      if (!isAvailable) {
        // Try to redirect user to Play Store to install Health Connect
        await CapacitorHealth.showHealthConnectInPlayStore();
        throw new Error('Health Connect app is required. Please install it from the Play Store.');
      }

      // Request permissions
      const permissions = ['READ_STEPS', 'READ_DISTANCE', 'READ_ACTIVE_CALORIES_BURNED', 'READ_HEART_RATE', 'READ_EXERCISE'];
      const permissionResult = await CapacitorHealth.requestHealthPermissions({ permissions });
      
      if (permissionResult?.permissions) {
        this.permissions = permissionResult.permissions;
        this.isAuthenticated = Object.values(permissionResult.permissions).some(granted => granted);
        
        if (this.isAuthenticated) {
          console.log('✓ Health Connect authenticated successfully');
          return true;
        } else {
          console.warn('Health Connect: No permissions granted');
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Health Connect authentication error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated and has necessary permissions
   */
  async isConnected(): Promise<boolean> {
    if (!this.isAuthenticated) {
      return await this.initialize();
    }
    return true;
  }

  /**
   * Fetch health data from Health Connect
   */
  async getHealthData(startDate: Date, endDate: Date): Promise<HealthConnectData | null> {
    if (!this.isAuthenticated) {
      console.error('Health Connect: Not authenticated');
      return null;
    }

    try {
      const healthData: HealthConnectData = {
        steps: 0,
        distance: 0,
        calories: 0,
        activeMinutes: 0
      };

      // Fetch steps data
      if (this.permissions.READ_STEPS) {
        try {
          const stepsResult = await CapacitorHealth.queryHealthData({
            dataType: 'steps',
            startDate,
            endDate,
            limit: 1000
          });

          if (stepsResult?.data) {
            healthData.steps = stepsResult.data.reduce((total: number, record: any) => {
              return total + (record.value || 0);
            }, 0);
          }
        } catch (error) {
          console.warn('Health Connect: Failed to fetch steps data', error);
        }
      }

      // Fetch distance data
      if (this.permissions.READ_DISTANCE) {
        try {
          const distanceResult = await CapacitorHealth.queryHealthData({
            dataType: 'distance',
            startDate,
            endDate,
            limit: 1000
          });

          if (distanceResult?.data) {
            healthData.distance = distanceResult.data.reduce((total: number, record: any) => {
              return total + (record.value || 0);
            }, 0);
          }
        } catch (error) {
          console.warn('Health Connect: Failed to fetch distance data', error);
        }
      }

      // Fetch calories data
      if (this.permissions.READ_ACTIVE_CALORIES_BURNED) {
        try {
          const caloriesResult = await CapacitorHealth.queryHealthData({
            dataType: 'calories',
            startDate,
            endDate,
            limit: 1000
          });

          if (caloriesResult?.data) {
            healthData.calories = caloriesResult.data.reduce((total: number, record: any) => {
              return total + (record.value || 0);
            }, 0);
          }
        } catch (error) {
          console.warn('Health Connect: Failed to fetch calories data', error);
        }
      }

      // Fetch heart rate data (optional)
      if (this.permissions.READ_HEART_RATE) {
        try {
          const heartRateResult = await CapacitorHealth.queryHealthData({
            dataType: 'heart_rate',
            startDate,
            endDate,
            limit: 100
          });

          if (heartRateResult?.data && heartRateResult.data.length > 0) {
            const avgHeartRate = heartRateResult.data.reduce((sum: number, record: any) => {
              return sum + (record.value || 0);
            }, 0) / heartRateResult.data.length;
            healthData.heartRate = Math.round(avgHeartRate);
          }
        } catch (error) {
          console.warn('Health Connect: Failed to fetch heart rate data', error);
        }
      }

      // Calculate active minutes from exercise data
      if (this.permissions.READ_EXERCISE) {
        try {
          const exerciseResult = await CapacitorHealth.queryHealthData({
            dataType: 'workouts',
            startDate,
            endDate,
            limit: 1000
          });

          if (exerciseResult?.data) {
            healthData.activeMinutes = exerciseResult.data.reduce((total: number, record: any) => {
              // Convert duration from milliseconds to minutes
              const durationMinutes = (record.duration || 0) / (1000 * 60);
              return total + durationMinutes;
            }, 0);
          }
        } catch (error) {
          console.warn('Health Connect: Failed to fetch exercise data', error);
        }
      }

      console.log('Health Connect data fetched:', healthData);
      return healthData;
    } catch (error) {
      console.error('Health Connect: Failed to fetch health data', error);
      return null;
    }
  }

  /**
   * Get today's step count
   */
  async getTodaySteps(): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const data = await this.getHealthData(startOfDay, endOfDay);
    return data?.steps || 0;
  }

  /**
   * Sync Health Connect data with local step counter
   */
  async syncWithLocalSteps(): Promise<{ synced: boolean; steps: number }> {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const steps = await this.getTodaySteps();
      
      if (steps > 0) {
        // Update local storage with Health Connect steps
        localStorage.setItem('daily-steps', steps.toString());
        localStorage.setItem('steps-last-sync', Date.now().toString());
        localStorage.setItem('steps-source', 'health-connect');
        
        return { synced: true, steps };
      }

      return { synced: false, steps: 0 };
    } catch (error) {
      console.error('Health Connect sync error:', error);
      return { synced: false, steps: 0 };
    }
  }

  /**
   * Open Health Connect settings
   */
  async openSettings(): Promise<void> {
    try {
      await CapacitorHealth.openHealthConnectSettings();
    } catch (error) {
      console.error('Health Connect: Failed to open settings', error);
    }
  }

  /**
   * Get permission status
   */
  getPermissions(): Partial<HealthConnectPermissions> {
    return { ...this.permissions };
  }

  /**
   * Check if Health Connect is available on the device
   */
  async isHealthConnectAvailable(): Promise<boolean> {
    try {
      return await CapacitorHealth.isHealthAvailable();
    } catch (error) {
      console.error('Health Connect availability check failed:', error);
      return false;
    }
  }

  /**
   * Clear authentication state
   */
  logout(): void {
    this.isAuthenticated = false;
    this.permissions = {};
    localStorage.removeItem('steps-source');
    console.log('Health Connect: Logged out');
  }
}

// Export singleton instance
export const healthConnectService = new HealthConnectService();
export default healthConnectService;
export type { HealthConnectData, HealthConnectPermissions };