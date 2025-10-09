import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token and user
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    console.log('🔐 useAuth - Checking authentication...');
    console.log('  Token exists:', !!token);
    console.log('  Token value:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('  Stored user:', storedUser);

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('✅ User authenticated:', userData.email);
      } catch (error) {
        console.error('❌ Failed to parse user data:', error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    } else {
      console.log('❌ Not authenticated - missing token or user data');
    }

    setIsLoading(false);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    requiresLogin: !user && !isLoading,
  };
}