import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    // Prevent refetching on window focus/mount to avoid loops
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Cache for longer to reduce requests
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Log any errors for debugging (but don't crash)
  if (error) {
    console.error('⚠️ Auth check error (non-fatal):', error);
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    requiresLogin: !user && !isLoading,
  };
}