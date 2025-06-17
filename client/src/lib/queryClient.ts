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
  console.log(`API Request: ${method} ${url}`, data ? {
    ...data, 
    password: data.hasOwnProperty('password') ? '***' : undefined,
    confirmPassword: data.hasOwnProperty('confirmPassword') ? '***' : undefined
  } : 'no data');
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`API Response from ${url}: status ${res.status}`);
    
    if (!res.ok) {
      let errorData;
      
      try {
        // Try to parse as JSON first
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await res.json();
          console.error(`API Error (${res.status}):`, errorData);
          
          // Create a custom error with the response data attached
          const error = new Error(errorData.message || `API Error: ${res.statusText}`);
          (error as any).response = { 
            status: res.status,
            data: errorData
          };
          throw error;
        } else {
          // Handle as text if not JSON
          const errorText = await res.text();
          console.error(`API Error (${res.status}): ${errorText}`);
          throw new Error(`${res.status}: ${errorText || res.statusText}`);
        }
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          // If JSON parsing failed, get the response as text
          const errorText = await res.text();
          console.error(`API Error (${res.status}): ${errorText}`);
          throw new Error(`${res.status}: ${errorText || res.statusText}`);
        }
        // If it's our custom error, rethrow it
        throw parseError;
      }
    }
    
    return res;
  } catch (err) {
    console.error(`API Request failed for ${url}:`, err);
    throw err;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
