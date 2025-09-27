import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: authData, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const isAuthenticated = !error && !isLoading && !!authData;

  return {
    user: authData?.user || null,
    isLoading,
    isAuthenticated,
    requiresLogin: !isAuthenticated && !isLoading,
  };
}