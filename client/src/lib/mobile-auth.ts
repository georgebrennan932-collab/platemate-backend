import { Capacitor } from '@capacitor/core';

export class MobileAuthService {
  private static TOKEN_KEY = 'platemate_mobile_token';
  private static API_BASE_KEY = 'platemate_api_base';
  
  static async initialize() {
    console.log('🔍 Platform check:', { 
      isNative: Capacitor.isNativePlatform(), 
      platform: Capacitor.getPlatform() 
    });
    
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - skipping mobile auth');
      return true;
    }

    console.log('📱 Native platform detected - setting up mobile auth');
    
    const apiBase = this.getApiBaseUrl();
    console.log('🔗 Using API base URL:', apiBase);
    
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
    // Use the deployed Replit URL for mobile apps (accessible from anywhere)
    const replitUrl = 'https://b3ef8bbc-4987-4bf0-84a0-21447c42de4e-00-d9egvcnatzxk.kirk.replit.dev';
    
    // For development and production, always use the deployed URL for mobile
    // This ensures mobile apps can always reach the server
    return import.meta.env.VITE_API_BASE || replitUrl;
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