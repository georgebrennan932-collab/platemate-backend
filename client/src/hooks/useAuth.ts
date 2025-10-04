import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";
import { getGuestId } from "@/lib/guest-session";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  // If no authenticated user, use guest mode
  const guestId = !user && !isLoading ? getGuestId() : null;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuest: !!guestId,
    guestId,
    userId: user?.id || guestId || null,
    requiresLogin: false, // No longer require login - guest mode available
  };
}