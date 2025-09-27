import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AuthResponse {
  user: User | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/status"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // If there's an auth error (401), user is not authenticated
  const isAuthenticated = !error && data?.isAuthenticated === true;
  
  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated,
    requiresLogin: !isAuthenticated && !isLoading,
  };
}