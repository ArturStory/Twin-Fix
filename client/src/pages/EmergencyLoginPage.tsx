import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function EmergencyLoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Function to handle emergency login
  const handleEmergencyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Missing information",
        description: "Please provide both username and password",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try direct login first
      const res = await apiRequest("POST", "/api/direct-login", { 
        username, 
        password 
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Invalidate auth queries to refresh user state
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${username}!`,
        });
        
        // Redirect to home page
        setLocation("/");
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Emergency login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Emergency Login</CardTitle>
          <CardDescription>
            Use this page if the normal login isn't working properly
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleEmergencyLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Emergency Login
                </>
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center mt-2">
            <Link href="/login" className="text-primary hover:underline">
              Return to normal login
            </Link>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            If you're having trouble logging in, please contact your system administrator.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}