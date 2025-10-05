import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { User } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";

export function useAuth() {
  const [isGuestMode, setIsGuestMode] = useState(false);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  // Check localStorage for guest mode on mount
  useEffect(() => {
    const guestMode = localStorage.getItem('guestMode') === 'true';
    setIsGuestMode(guestMode);
  }, []);

  // Enable guest mode
  const enableGuestMode = () => {
    localStorage.setItem('guestMode', 'true');
    setIsGuestMode(true);
  };

  // Disable guest mode (when user signs in)
  const disableGuestMode = () => {
    localStorage.removeItem('guestMode');
    setIsGuestMode(false);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuestMode: isGuestMode && !user, // Only guest mode if not authenticated
    requiresLogin: !user && !isLoading && !isGuestMode,
    enableGuestMode,
    disableGuestMode,
  };
}