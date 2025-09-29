import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/user'],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    requiresLogin: !user && !isLoading,
  };
}