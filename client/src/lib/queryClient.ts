import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get guest ID if exists
  const guestId = localStorage.getItem('platemate_guest_id');
  
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add guest ID to headers if present
  if (guestId) {
    headers['X-Guest-Id'] = guestId;
  }
  
  const res = await fetch(url, {
    method,
    headers,
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
    // Get guest ID if exists
    const guestId = localStorage.getItem('platemate_guest_id');
    
    const headers: Record<string, string> = {};
    
    // Add guest ID to headers if present
    if (guestId) {
      headers['X-Guest-Id'] = guestId;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
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
      refetchOnWindowFocus: false, // Disable auto-refetch for aggressive caching
      staleTime: 60 * 60 * 1000, // 1 hour - data stays fresh longer
      gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache even when unused
      retry: 1, // Retry once on failure
    },
    mutations: {
      retry: false,
    },
  },
});
