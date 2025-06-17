import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, Copy, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { TEST_CREDENTIALS } from "@/lib/test-auth";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function AuthDebugPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  // Function to test login
  const testLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setAction("login");
    setError(null);
    setResponse(null);
    
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await res.json();
      setResponse(data);
      toast({
        title: "Login successful",
        description: `Logged in as ${username}`,
      });
    } catch (err: any) {
      console.error("Login test error:", err);
      setError(err.message || "Login failed");
      toast({
        title: "Login failed",
        description: err.message || "Failed to log in",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to test registration
  const testRegistration = async (username: string) => {
    setIsLoading(true);
    setAction("register");
    setError(null);
    setResponse(null);
    
    const testUserData = {
      username,
      email: `${username}@example.com`,
      password: `${username}123`,
      role: "reporter",
    };
    
    try {
      const res = await apiRequest("POST", "/api/auth/register", testUserData);
      const data = await res.json();
      setResponse(data);
      toast({
        title: "Registration successful",
        description: `Created user ${username}`,
      });
    } catch (err: any) {
      console.error("Registration test error:", err);
      setError(err.message || "Registration failed");
      toast({
        title: "Registration failed",
        description: err.message || "Failed to register user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check current auth status
  const checkAuthStatus = async () => {
    setIsLoading(true);
    setAction("status");
    setError(null);
    setResponse(null);
    
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      setResponse(data);
      
      if (data.authenticated) {
        toast({
          title: "Authentication status",
          description: `Logged in as ${data.user?.username || 'unknown user'}`,
        });
      } else {
        toast({
          title: "Authentication status",
          description: "Not logged in",
        });
      }
    } catch (err: any) {
      console.error("Auth status check error:", err);
      setError(err.message || "Failed to check auth status");
      toast({
        title: "Status check failed",
        description: err.message || "Failed to check authentication status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to log out
  const testLogout = async () => {
    setIsLoading(true);
    setAction("logout");
    setError(null);
    setResponse(null);
    
    try {
      const res = await apiRequest("POST", "/api/auth/logout");
      const data = await res.json();
      setResponse(data);
      toast({
        title: "Logout successful",
        description: "Successfully logged out",
      });
    } catch (err: any) {
      console.error("Logout test error:", err);
      setError(err.message || "Logout failed");
      toast({
        title: "Logout failed",
        description: err.message || "Failed to log out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy response to clipboard
  const copyToClipboard = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      toast({
        title: "Copied to clipboard",
        description: "Response data copied to clipboard",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Authentication Debug Tools</CardTitle>
          <CardDescription>Test authentication functions and view responses</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Login</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TEST_CREDENTIALS.map((cred) => (
                <Button
                  key={cred.username}
                  variant="outline"
                  className="justify-start"
                  disabled={isLoading}
                  onClick={() => testLogin(cred.username, cred.password)}
                >
                  {isLoading && action === "login" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Login as {cred.username}
                </Button>
              ))}
              
              <div className="space-y-2 col-span-full">
                <Label htmlFor="custom-username">Custom Login</Label>
                <div className="flex space-x-2">
                  <Input
                    id="custom-username"
                    placeholder="Username"
                    disabled={isLoading}
                  />
                  <Input
                    id="custom-password"
                    type="password"
                    placeholder="Password"
                    disabled={isLoading}
                  />
                  <Button
                    disabled={isLoading}
                    onClick={() => {
                      const username = (document.getElementById("custom-username") as HTMLInputElement).value;
                      const password = (document.getElementById("custom-password") as HTMLInputElement).value;
                      if (username && password) {
                        testLogin(username, password);
                      }
                    }}
                  >
                    Login
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Registration</h3>
            <div className="flex space-x-2">
              <Input
                id="new-username"
                placeholder="New username"
                disabled={isLoading}
              />
              <Button
                disabled={isLoading}
                onClick={() => {
                  const username = (document.getElementById("new-username") as HTMLInputElement).value;
                  if (username) {
                    testRegistration(username);
                  }
                }}
              >
                {isLoading && action === "register" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Register"
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={checkAuthStatus}
            >
              {isLoading && action === "status" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>Check Auth Status</>
              )}
            </Button>
            
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={testLogout}
            >
              {isLoading && action === "logout" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>Test Logout</>
              )}
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {response && (
            <div className="relative mt-4">
              <div className="absolute top-2 right-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-md overflow-auto max-h-80">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="ghost" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}