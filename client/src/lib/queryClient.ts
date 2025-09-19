import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API base URL for mobile builds - points to actual Express server
const API_BASE = import.meta.env.VITE_API_BASE || "";

function resolveApiUrl(url: string): string {
  if (API_BASE && !url.startsWith('http')) {
    return new URL(url, API_BASE).toString();
  }
  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get mobile auth token from localStorage
function getMobileAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('platemate_mobile_token');
  }
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const resolvedUrl = resolveApiUrl(url);
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  // Add Authorization header for mobile builds
  const mobileToken = getMobileAuthToken();
  if (mobileToken) {
    headers['Authorization'] = `Bearer ${mobileToken}`;
  }
  
  const res = await fetch(resolvedUrl, {
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
    const url = queryKey.join("/") as string;
    const resolvedUrl = resolveApiUrl(url);
    
    const headers: HeadersInit = {};
    
    // Add Authorization header for mobile builds
    const mobileToken = getMobileAuthToken();
    if (mobileToken) {
      headers['Authorization'] = `Bearer ${mobileToken}`;
    }
    
    const res = await fetch(resolvedUrl, {
      headers,
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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
