import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Simplified auth for camera troubleshooting - disable auth temporarily
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    requiresLogin: false,
  };
}