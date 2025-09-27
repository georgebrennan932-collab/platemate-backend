import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: authData, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      // Treat 401 as valid response (not authenticated) rather than error
      if (response.status === 401) {
        return { authenticated: false, user: null };
      }
      
      if (!response.ok) {
        throw new Error('Network error');
      }
      
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const isAuthenticated = !isLoading && authData?.authenticated === true;

  return {
    user: authData?.user || null,
    isLoading,
    isAuthenticated,
    requiresLogin: !isAuthenticated && !isLoading,
  };
}