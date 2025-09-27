import { queryClient } from "./queryClient";

export interface LogoutOptions {
  redirectTo?: string;
  showSuccessMessage?: boolean;
}

export async function logout(options: LogoutOptions = {}) {
  const { redirectTo = '/', showSuccessMessage = false } = options;
  
  try {
    console.log('🚪 Starting logout process...');
    
    // For mobile apps, use fetch with JSON preference
    const response = await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
    });

    // Clear all React Query cache to remove any cached authenticated data
    queryClient.clear();
    
    // Invalidate specific auth-related queries
    queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
    queryClient.removeQueries({ queryKey: ['/api/auth/status'] });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Logout successful:', result.message);
      
      if (showSuccessMessage) {
        // You could add toast notification here if needed
        console.log('User logged out successfully');
      }
    } else {
      console.log('⚠️ Logout response not OK, but proceeding...');
    }

    // For web browsers, use window.location for proper navigation
    // For mobile apps within Capacitor, this will still work
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if logout API fails, clear local cache and redirect
    queryClient.clear();
    
    // Force navigation to login page anyway
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }
}