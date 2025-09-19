import { Capacitor } from '@capacitor/core';

export class MobileAuthService {
  private static TOKEN_KEY = 'platemate_mobile_token';
  private static API_BASE_KEY = 'platemate_api_base';
  
  static async initialize() {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - skipping mobile auth');
      return true;
    }

    console.log('📱 Native platform detected - setting up mobile auth');
    
    try {
      // Get stored token
      let token = localStorage.getItem(this.TOKEN_KEY);
      
      if (!token) {
        console.log('🔑 No mobile token found, generating new one...');
        token = await this.generateMobileToken();
        
        if (token) {
          localStorage.setItem(this.TOKEN_KEY, token);
          console.log('✅ Mobile token generated and stored');
        } else {
          console.error('❌ Failed to generate mobile token');
          return false;
        }
      } else {
        console.log('✅ Mobile token found in storage');
      }

      // Set API base URL for mobile
      const apiBase = this.getApiBaseUrl();
      localStorage.setItem(this.API_BASE_KEY, apiBase);
      console.log('🔗 API base URL configured:', apiBase);
      
      return true;
    } catch (error) {
      console.error('❌ Mobile auth initialization failed:', error);
      return false;
    }
  }
  
  private static async generateMobileToken(): Promise<string | null> {
    try {
      const apiBase = this.getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/auth/mobile-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Mobile token response:', data);
        return data.token;
      } else {
        console.error('❌ Token generation failed:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('❌ Token generation error:', error);
      return null;
    }
  }
  
  private static getApiBaseUrl(): string {
    // For development, use the development server URL
    if (import.meta.env.DEV) {
      return 'http://10.0.2.2:5000'; // Android emulator host
    }
    
    // For production, use the deployed URL
    return import.meta.env.VITE_API_BASE || 'https://your-app.replit.app';
  }
  
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  static getApiBase(): string | null {
    return localStorage.getItem(this.API_BASE_KEY);
  }
  
  static clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.API_BASE_KEY);
    console.log('🧹 Mobile auth cleared');
  }
  
  static async refreshToken(): Promise<boolean> {
    this.clearAuth();
    return await this.initialize();
  }
}