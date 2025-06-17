import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, UserRole } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  isAdmin: boolean;
  isOwner: boolean;
  isManager: boolean;
  isRepairman: boolean;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
  position?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  // Check for stored user in localStorage (for emergency auth scenarios)
  const getStoredUser = (): User | null => {
    try {
      const storedUser = localStorage.getItem('auth_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error('Failed to parse stored user:', e);
      return null;
    }
  };
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<{ authenticated: boolean; user?: User } | undefined, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: async (context) => {
      try {
        // Check localStorage first after deployment to ensure persistence
        const storedUser = getStoredUser();
        if (storedUser) {
          console.log("Using stored user from localStorage:", storedUser.username);
          
          // Also try to re-authenticate the user silently with the session
          try {
            // Make the API call in the background to refresh session
            getQueryFn({ on401: "returnNull" })(context)
              .then(apiResult => {
                if (!apiResult?.authenticated) {
                  console.log("Silent reauthentication triggered for stored user");
                  // Session might be lost - auto login in background
                  fetch('/api/auth/session-recovery', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      userId: storedUser.id,
                      username: storedUser.username
                    }),
                  }).catch(e => console.error("Session recovery attempt failed:", e));
                }
              })
              .catch(e => console.error("Background auth check failed:", e));
          } catch (e) {
            console.error("Error in background authentication check:", e);
          }
          
          // Return the stored user right away to prevent flicker
          return { authenticated: true, user: storedUser };
        }
        
        // If no localStorage user, try standard API call
        const result = await getQueryFn({ on401: "returnNull" })(context);
        
        // If API returns authenticated user, use it and update localStorage
        if (result?.authenticated && result?.user) {
          console.log("Auth API returned authenticated user:", result.user.username);
          localStorage.setItem('auth_user', JSON.stringify(result.user));
          return result;
        }
        
        // Return the original API result if no authenticated user
        return result;
      } catch (error) {
        console.error("Auth API error:", error);
        
        // On API error, fallback to localStorage
        const storedUser = getStoredUser();
        if (storedUser) {
          console.log("API error, using stored user:", storedUser.username);
          return { authenticated: true, user: storedUser };
        }
        
        // Rethrow if no fallback
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Clean up username - remove any quotes that might have been added
      const cleanCredentials = {
        ...credentials,
        username: credentials.username.replace(/"/g, '')
      };
      
      console.log("Attempting login with credentials:", {...cleanCredentials, password: '***'});
      try {
        const res = await apiRequest("POST", "/api/auth/login", cleanCredentials);
        console.log("Login API response status:", res.status);
        const data = await res.json();
        console.log("Login API response data:", data);
        return data;
      } catch (err) {
        console.error("Login API error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log("Login success, user data:", data);
      
      // Store the user data in localStorage for persistence
      localStorage.setItem('auth_user', JSON.stringify(data));
      
      // Set the user data directly in the query client cache
      queryClient.setQueryData(["/api/auth/me"], { 
        authenticated: true,
        user: data 
      });
      
      // Show success message
      toast({
        title: "Login successful",
        description: "You have been logged in successfully",
      });
      
      // Force a reload of the page to ensure proper session state
      // This works better on mobile than just redirecting
      window.location.href = '/';
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      // Clean up username - remove any quotes that might have been added
      const cleanUserData = {
        ...userData,
        username: userData.username.replace(/"/g, '')
      };
      
      console.log("Attempting registration with data:", {
        ...cleanUserData, 
        password: '***',
        confirmPassword: '***'
      });
      
      try {
        const res = await apiRequest("POST", "/api/auth/register", cleanUserData);
        console.log("Registration API response status:", res.status);
        const data = await res.json();
        console.log("Registration API response data:", data);
        return data;
      } catch (err) {
        console.error("Registration API error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      // Store the user data in localStorage for persistence
      localStorage.setItem('auth_user', JSON.stringify(data));
      
      // Set the user data directly in the query client cache
      queryClient.setQueryData(["/api/auth/me"], { 
        authenticated: true,
        user: data 
      });
      
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully",
      });
      
      // Force a reload of the page to ensure proper session state
      // This works better on mobile than just redirecting
      window.location.href = '/';
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      
      let errorMessage = error.message || "Registration failed";
      
      // Try to extract more detailed error from the response if available
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
        if (error.response.data.details) {
          errorMessage += ": " + error.response.data.details;
        }
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // 1. First clear localStorage
      console.log("Clearing localStorage auth data");
      localStorage.removeItem('auth_user');
      
      // 2. Call session clear endpoint to clear emergency session
      try {
        await fetch('/api/auth/clear-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.warn("Failed to clear emergency session:", err);
        // Continue with normal logout even if this fails
      }
      
      // 3. Call standard logout API
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Force cache clear for auth
      queryClient.setQueryData(["/api/auth/me"], { authenticated: false });
      
      // Also invalidate the auth query to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "Logout successful",
        description: "You have been logged out successfully",
      });
      
      // Redirect to login page after successful logout with a delay for mobile browsers
      setTimeout(() => {
        window.location.href = '/auth'; // Use direct window location instead of wouter for mobile
      }, 300);
    },
    onError: (error: Error) => {
      // Even if API logout fails, clear local storage
      localStorage.removeItem('auth_user');
      queryClient.setQueryData(["/api/auth/me"], { authenticated: false });
      
      toast({
        title: "Warning",
        description: "You've been logged out locally, but there was an issue with the server: " + error.message,
        variant: "destructive",
      });
      
      // Still redirect to login page with direct navigation for mobile compatibility
      setTimeout(() => {
        window.location.href = '/auth'; // Use direct window location instead of wouter for mobile
      }, 300);
    },
  });

  // Helper functions to check user roles
  const isAdmin = Boolean(user?.user?.role === UserRole.ADMIN);
  const isOwner = Boolean(
    user?.user?.role === UserRole.ADMIN || user?.user?.role === UserRole.OWNER
  );
  const isManager = Boolean(
    user?.user?.role === UserRole.ADMIN ||
      user?.user?.role === UserRole.OWNER ||
      user?.user?.role === UserRole.MANAGER
  );
  const isRepairman = Boolean(
    user?.user?.role === UserRole.ADMIN ||
      user?.user?.role === UserRole.OWNER ||
      user?.user?.role === UserRole.MANAGER ||
      user?.user?.role === UserRole.REPAIRMAN
  );

  return (
    <AuthContext.Provider
      value={{
        user: user?.user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        isAdmin,
        isOwner,
        isManager,
        isRepairman,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}