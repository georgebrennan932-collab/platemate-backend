import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token and user
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
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