import { Capacitor } from '@capacitor/core';

export class MobileAuthService {
  private static TOKEN_KEY = 'platemate_mobile_token';
  private static API_BASE_KEY = 'platemate_api_base';
  
  static async initialize() {
    try {
      console.log('🔍 Platform check:', { 
        isNative: Capacitor.isNativePlatform(), 
        platform: Capacitor.getPlatform()
      });
      
      // Debug mode: Force mobile auth testing on web with URL parameter  
      const forceDebug = window.location.search.includes('debug=mobile');
      
      if (!Capacitor.isNativePlatform() && !forceDebug) {
        console.log('🌐 Web platform - skipping mobile auth');
        return true;
      }
      
      console.log('📱 Native platform detected - setting up mobile auth');
      
      const apiBase = this.getApiBaseUrl();
      localStorage.setItem(this.API_BASE_KEY, apiBase);
      
      // Generate JWT token for mobile authentication
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
      
      return true;
    } catch (error) {
      console.error('❌ Mobile auth initialization failed:', error);
      console.log('🔄 Allowing app to continue without mobile auth');
      return true;
    }
  }
  
  private static async testApiConnectivity(apiBase: string): Promise<boolean> {
    try {
      console.log('🌐 Testing connectivity to:', apiBase);
      const response = await fetch(`${apiBase}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📶 Connectivity test result:', response.status);
      // Even 401 is ok, it means the API is reachable
      return response.status === 401 || response.ok;
    } catch (error) {
      console.error('📶 Connectivity test failed:', error);
      return false;
    }
  }

  private static async generateMobileToken(): Promise<string | null> {
    try {
      const apiBase = this.getApiBaseUrl();
      const url = `${apiBase}/api/auth/mobile-token`;
      
      console.log('🚀 Generating mobile token from:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Token response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Mobile token response:', data);
        return data.token;
      } else {
        const errorText = await response.text();
        console.error('❌ Token generation failed:', response.status, response.statusText, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Token generation error:', error);
      return null;
    }
  }
  
  private static getApiBaseUrl(): string {
    // For mobile apps, use current domain with proper protocol
    const currentOrigin = window.location.origin;
    console.log('🔗 Mobile API base URL resolved to current origin:', currentOrigin);
    return currentOrigin;
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