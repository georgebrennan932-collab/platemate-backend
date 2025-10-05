import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";
import { isGuestMode, getGuestUser } from "@/lib/guest-user";

export function useAuth() {
  // Check if in guest mode BEFORE making query
  const guestMode = isGuestMode();

  // Only query server if NOT in guest mode
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: !guestMode, // Disable query in guest mode
  });

  // Guest mode: return null user with isGuest flag
  if (guestMode && !user) {
    return {
      user: null,
      isLoading: false,
      isAuthenticated: true, // Guest is "authenticated" for app purposes
      requiresLogin: false,
      isGuest: true,
      guestId: getGuestUser().id,
    };
  }

  // Regular authenticated user
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    requiresLogin: !user && !isLoading,
    isGuest: false,
    guestId: null,
  };
}