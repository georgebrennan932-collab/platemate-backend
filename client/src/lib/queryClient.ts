import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCurrentUser } from "./firebase";
import { getIdToken } from "firebase/auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = getCurrentUser();
  if (currentUser) {
    try {
      const idToken = await getIdToken(currentUser);
      return {
        "Authorization": `Bearer ${idToken}`
      };
    } catch (error) {
      console.warn("Failed to get Firebase ID token:", error);
    }
  }
  return {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const contentHeaders = data ? { "Content-Type": "application/json" } : {};
  
  const res = await fetch(url, {
    method,
    headers: { ...contentHeaders, ...authHeaders },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    
    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeaders,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, // Disable frequent refetch on focus for performance
      refetchOnMount: false, // Prevent refetch on component mount if data exists
      staleTime: 15 * 60 * 1000, // 15 minutes - longer stale time for better performance
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection time
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
