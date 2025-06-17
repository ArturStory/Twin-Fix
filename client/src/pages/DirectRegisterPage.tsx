import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

export default function DirectRegisterPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "reporter"
  });

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle role select change
  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  // Function to handle direct registration
  const handleDirectRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username || !formData.email || !formData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Submit registration data without confirmPassword
      const { confirmPassword, ...registerData } = formData;
      
      const res = await apiRequest("POST", "/api/direct-register", registerData);
      const data = await res.json();
      
      if (data.success) {
        // Invalidate auth queries to refresh user state
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        toast({
          title: "Registration successful",
          description: `Account created for ${formData.username}`,
        });
        
        // Redirect to home page
        setLocation("/");
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Direct registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.emergencyRegister')}</CardTitle>
          <CardDescription>
            {t('auth.emergencyRegisterDescription')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleDirectRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('user.username')}</Label>
              <Input
                id="username"
                name="username"
                placeholder={t('user.usernamePlaceholder')}
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('user.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('user.emailPlaceholder')}
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('user.password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('user.passwordPlaceholder')}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('user.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t('user.confirmPasswordPlaceholder')}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">{t('user.role')}</Label>
              <Select 
                onValueChange={handleRoleChange} 
                defaultValue={formData.role}
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={t('user.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reporter">{t('user.roles.reporter')}</SelectItem>
                  <SelectItem value="repairman">{t('user.roles.repairman')}</SelectItem>
                  <SelectItem value="manager">{t('user.roles.manager')}</SelectItem>
                  <SelectItem value="owner">{t('user.roles.owner')}</SelectItem>
                  <SelectItem value="admin">{t('user.roles.admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('auth.registerError')}</AlertTitle>
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
                  {t('auth.registering')}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('auth.register')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center mt-2">
            <Link href="/login" className="text-primary hover:underline">
              {t('auth.returnToLogin')}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            {t('auth.contactAdminForHelp')}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}