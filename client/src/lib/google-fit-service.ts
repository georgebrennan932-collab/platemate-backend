/**
 * Google Fit API Integration Service
 * 
 * Note: Google Fit APIs are being deprecated in 2026.
 * This service provides integration for existing developers.
 * Consider migrating to Health Connect for new implementations.
 */

interface GoogleFitData {
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  heartRate?: number;
  weight?: number;
}

interface GoogleFitConfig {
  clientId: string;
  scopes: string[];
}

class GoogleFitService {
  private accessToken: string | null = null;
  private isAuthenticated = false;
  private config: GoogleFitConfig;

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      scopes: [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.location.read',
        'https://www.googleapis.com/auth/fitness.nutrition.read'
      ]
    };
  }

  /**
   * Initialize Google Fit authentication
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.config.clientId) {
        console.warn('Google Fit: Client ID not configured');
        return false;
      }

      // Check if we have a stored token
      const storedToken = localStorage.getItem('googlefit-token');
      const tokenExpiry = localStorage.getItem('googlefit-token-expiry');
      
      if (storedToken && tokenExpiry) {
        const now = Date.now();
        const expiry = parseInt(tokenExpiry);
        
        if (now < expiry) {
          this.accessToken = storedToken;
          this.isAuthenticated = true;
          console.log('✓ Google Fit: Using stored authentication');
          return true;
        } else {
          // Token expired, clear storage
          this.clearStoredAuth();
        }
      }

      return false;
    } catch (error) {
      console.error('Google Fit initialization error:', error);
      return false;
    }
  }

  /**
   * Authenticate with Google and request Fit permissions
   */
  async authenticate(): Promise<boolean> {
    try {
      // Check if client ID is configured
      if (!this.config.clientId) {
        throw new Error('Google Fit Client ID not configured');
      }

      // Load Google Identity Services
      await this.loadGoogleIdentityServices();

      return new Promise((resolve, reject) => {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: this.config.clientId,
            scope: this.config.scopes.join(' '),
            callback: (response: any) => {
              if (response.error) {
                console.error('Google Fit OAuth error:', response.error);
                reject(new Error(`Google Fit authentication failed: ${response.error}`));
                return;
              }
              
              if (response.access_token) {
                this.accessToken = response.access_token;
                this.isAuthenticated = true;
                
                // Store token with 1-hour expiry
                const expiryTime = Date.now() + (55 * 60 * 1000); // 55 minutes for safety
                localStorage.setItem('googlefit-token', response.access_token);
                localStorage.setItem('googlefit-token-expiry', expiryTime.toString());
                
                console.log('✓ Google Fit authenticated successfully');
                resolve(true);
              } else {
                console.error('Google Fit authentication failed - no access token received');
                reject(new Error('Google Fit authentication failed - no access token received'));
              }
            }
          });
          
          // Add timeout for authentication request
          setTimeout(() => {
            reject(new Error('Google Fit authentication timeout'));
          }, 30000); // 30 second timeout
          
          client.requestAccessToken();
        } catch (clientError) {
          console.error('Error creating OAuth client:', clientError);
          reject(new Error('Failed to initialize Google Fit authentication'));
        }
      });
    } catch (error) {
      console.error('Google Fit authentication error:', error);
      throw error;
    }
  }

  /**
   * Load Google Identity Services script
   */
  private async loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Wait a bit for the script to fully initialize
        setTimeout(() => {
          if ((window as any).google?.accounts) {
            resolve();
          } else {
            reject(new Error('Google Identity Services failed to initialize'));
          }
        }, 100);
      };
      
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      
      // Add timeout for script loading
      setTimeout(() => {
        reject(new Error('Google Identity Services script loading timeout'));
      }, 10000);
      
      document.head.appendChild(script);
    });
  }

  /**
   * Fetch fitness data from Google Fit
   */
  async getFitnessData(startDate: Date, endDate: Date): Promise<GoogleFitData | null> {
    if (!this.isAuthenticated || !this.accessToken) {
      console.error('Google Fit: Not authenticated');
      return null;
    }

    try {
      const startTimeMillis = startDate.getTime();
      const endTimeMillis = endDate.getTime();

      // Aggregate request for multiple data types
      const aggregateRequest = {
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.distance.delta' },
          { dataTypeName: 'com.google.calories.expended' },
          { dataTypeName: 'com.google.active_minutes' }
        ],
        bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
        startTimeMillis,
        endTimeMillis
      };

      const response = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(aggregateRequest)
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear auth
          this.clearStoredAuth();
          throw new Error('Authentication expired');
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return this.parseAggregateData(data);
    } catch (error) {
      console.error('Google Fit data fetch error:', error);
      return null;
    }
  }

  /**
   * Get today's step count from Google Fit
   */
  async getTodaySteps(): Promise<number | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const data = await this.getFitnessData(today, tomorrow);
    return data?.steps || null;
  }

  /**
   * Parse aggregate fitness data response
   */
  private parseAggregateData(response: any): GoogleFitData {
    const result: GoogleFitData = {
      steps: 0,
      distance: 0,
      calories: 0,
      activeMinutes: 0
    };

    if (!response.bucket || response.bucket.length === 0) {
      return result;
    }

    const bucket = response.bucket[0];
    if (!bucket.dataset) return result;

    for (const dataset of bucket.dataset) {
      const dataSourceId = dataset.dataSourceId;
      
      if (dataset.point && dataset.point.length > 0) {
        const point = dataset.point[0];
        const value = point.value && point.value[0] ? point.value[0].intVal || point.value[0].fpVal : 0;

        if (dataSourceId.includes('step_count')) {
          result.steps = value;
        } else if (dataSourceId.includes('distance')) {
          result.distance = value; // in meters
        } else if (dataSourceId.includes('calories')) {
          result.calories = value;
        } else if (dataSourceId.includes('active_minutes')) {
          result.activeMinutes = value;
        }
      }
    }

    return result;
  }

  /**
   * Sync steps with local step counter
   */
  async syncWithLocalSteps(): Promise<{ synced: boolean; steps: number }> {
    try {
      const googleFitSteps = await this.getTodaySteps();
      
      if (googleFitSteps === null) {
        return { synced: false, steps: 0 };
      }

      // Get today's date key
      const todayKey = new Date().toISOString().split('T')[0];
      const localSteps = parseInt(localStorage.getItem(`platemate-steps-${todayKey}`) || '0');

      // Use the higher value (Google Fit is usually more accurate)
      const syncedSteps = Math.max(googleFitSteps, localSteps);
      
      // Update local storage
      localStorage.setItem(`platemate-steps-${todayKey}`, syncedSteps.toString());
      localStorage.setItem('platemate-last-sync', Date.now().toString());
      
      console.log(`✓ Google Fit sync: ${syncedSteps} steps`);
      return { synced: true, steps: syncedSteps };
    } catch (error) {
      console.error('Google Fit sync error:', error);
      return { synced: false, steps: 0 };
    }
  }

  /**
   * Check if user is authenticated
   */
  isConnected(): boolean {
    return this.isAuthenticated && !!this.accessToken;
  }

  /**
   * Disconnect from Google Fit
   */
  disconnect(): void {
    this.clearStoredAuth();
    this.accessToken = null;
    this.isAuthenticated = false;
    console.log('✓ Google Fit disconnected');
  }

  /**
   * Clear stored authentication
   */
  private clearStoredAuth(): void {
    localStorage.removeItem('googlefit-token');
    localStorage.removeItem('googlefit-token-expiry');
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    const lastSync = localStorage.getItem('platemate-last-sync');
    return lastSync ? new Date(parseInt(lastSync)) : null;
  }
}

// Export singleton instance
export const googleFitService = new GoogleFitService();