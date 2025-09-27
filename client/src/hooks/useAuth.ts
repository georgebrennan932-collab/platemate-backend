import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Always return authenticated for demo mode to ensure data loads
  return {
    user: { id: 'demo-user', name: 'Demo User' } as User,
    isLoading: false,
    isAuthenticated: true,
    requiresLogin: false,
  };
}