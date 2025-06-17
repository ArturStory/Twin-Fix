import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { UserRole } from "@shared/schema";
import { Camera, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  role: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  photo: z.string().optional(), // Base64 encoded photo
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function LoginForm() {
  const { t } = useTranslation();
  const { loginMutation } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values, {
      onSuccess: () => {
        console.log("Login successful from form handler, redirecting...");
        setLocation("/");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.username") || "Username"}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth.enterUsername") || "Enter your username"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.password") || "Password"}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("auth.enterPassword") || "Enter your password"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t("auth.loggingIn") || "Signing in..."}
            </div>
          ) : (
            t("auth.login") || "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm() {
  const { t } = useTranslation();
  const { registerMutation } = useAuth();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: UserRole.REPORTER,
      phone: "",
      position: "",
      photo: "",
    },
  });
  
  // Function to check if selected role is available
  const checkRoleAvailability = async (role: string) => {
    setIsCheckingRole(true);
    setRoleError(null);
    try {
      const response = await fetch('/api/users/role-counts');
      if (!response.ok) {
        throw new Error('Failed to check role availability');
      }
      
      const data = await response.json();
      const { adminCount, ownerCount } = data;
      
      if (role === UserRole.ADMIN && adminCount >= 1) {
        setRoleError(t("auth.errors.adminLimitReached") || "Only 1 Admin account is allowed");
        return false;
      } else if (role === UserRole.OWNER && ownerCount >= 4) {
        setRoleError(t("auth.errors.ownerLimitReached") || "Maximum of 4 Owner accounts allowed");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking role availability:', error);
      return true; // Allow registration to proceed if check fails
    } finally {
      setIsCheckingRole(false);
    }
  };

  // Handle file selection for profile photo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        form.setValue("photo", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture for profile photo
  const startCapture = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/png');
        setPhotoPreview(base64Image);
        form.setValue("photo", base64Image);

        // Stop the video stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setIsCapturing(false);
      }
    }
  };

  const cancelCapture = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  // Handle role selection
  const handleRoleChange = async (role: string) => {
    form.setValue("role", role);
    if (role === UserRole.ADMIN || role === UserRole.OWNER) {
      await checkRoleAvailability(role);
    } else {
      setRoleError(null);
    }
  };

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    // Check role availability first
    if (values.role === UserRole.ADMIN || values.role === UserRole.OWNER) {
      const isAvailable = await checkRoleAvailability(values.role);
      if (!isAvailable) {
        return; // Don't proceed with registration if role isn't available
      }
    }
    
    // Remove confirmPassword field before sending
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Photo upload section */}
        <div className="mb-6">
          <div className="flex flex-col items-center mb-4">
            {photoPreview ? (
              <div className="relative mb-4">
                <Avatar className="w-24 h-24 border-2">
                  <AvatarImage src={photoPreview} alt="Profile" />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setPhotoPreview(null)}
                >
                  {t("auth.remove") || "Remove"}
                </Button>
              </div>
            ) : (
              <div className="mb-4 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2 border-2 border-dashed border-gray-300">
                  <span className="text-gray-400 text-3xl">?</span>
                </div>
                <span className="text-sm text-gray-500">{t("auth.addPhoto") || "Add Profile Photo"}</span>
              </div>
            )}
            
            {!isCapturing ? (
              <div className="flex space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("auth.upload") || "Upload"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={startCapture}
                  className="flex items-center"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {t("auth.takePhoto") || "Take Photo"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-md overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline className="w-full" />
                </div>
                <div className="flex space-x-2 justify-center">
                  <Button type="button" onClick={capturePhoto}>
                    {t("auth.capture") || "Capture"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelCapture}>
                    {t("auth.cancel") || "Cancel"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.username") || "Username"}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth.chooseUsername") || "Choose a username"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.email") || "Email"}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t("auth.enterEmail") || "Enter your email"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.password") || "Password"}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("auth.choosePassword") || "Choose a password"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.confirmPassword") || "Confirm Password"}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("auth.confirmYourPassword") || "Confirm your password"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Role selection */}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.role") || "Role"}</FormLabel>
              <Select defaultValue={field.value} onValueChange={handleRoleChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("auth.selectRole") || "Select a role"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>{t("auth.roles.admin") || "Admin"}</SelectItem>
                  <SelectItem value={UserRole.OWNER}>{t("auth.roles.owner") || "Owner"}</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>{t("auth.roles.manager") || "Manager"}</SelectItem>
                  <SelectItem value={UserRole.REPAIRMAN}>{t("auth.roles.repairman") || "Repairman"}</SelectItem>
                  <SelectItem value={UserRole.REPORTER}>{t("auth.roles.reporter") || "Reporter"}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
              {roleError && (
                <p className="text-sm font-medium text-destructive">{roleError}</p>
              )}
              {isCheckingRole && (
                <p className="text-sm text-muted-foreground flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t("auth.checking") || "Checking availability..."}
                </p>
              )}
            </FormItem>
          )}
        />

        {/* Phone number */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.phone") || "Phone"}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth.enterPhone") || "Enter your phone number"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Position */}
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.position") || "Position"}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth.enterPosition") || "Enter your position"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t("auth.registering") || "Creating your account..."}
            </div>
          ) : (
            t("auth.register") || "Create Account"
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function AuthPage() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [, setLocation] = useLocation();

  // Redirect if user is already logged in, but wait until loading is complete
  if (!isLoading && user) {
    console.log("User authenticated, redirecting to home page:", user);
    // Use the standard Redirect component to avoid any transition issues
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left column - Auth form */}
      <div className="flex flex-col items-center justify-center w-full md:w-1/2 p-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                {activeTab === "login" 
                  ? (t("auth.loginTitle") || "Welcome Back") 
                  : (t("auth.registerTitle") || "Create Account")}
              </CardTitle>
              <CardDescription className="text-center">
                {activeTab === "login" 
                  ? (t("auth.loginDescription") || "Sign in to your account to continue")
                  : (t("auth.registerDescription") || "Fill out the form to create your account")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">{t("auth.login") || "Sign In"}</TabsTrigger>
                  <TabsTrigger value="register">{t("auth.register") || "Create Account"}</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <LoginForm />
                </TabsContent>
                <TabsContent value="register">
                  <RegisterForm />
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-muted-foreground">
              {activeTab === "login" 
                ? (t("auth.noAccount") || "Don't have an account?") 
                : (t("auth.alreadyHaveAccount") || "Already have an account?")}
              <Button 
                variant="link" 
                className="px-2" 
                onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
              >
                {activeTab === "login" 
                  ? (t("auth.register") || "Create Account") 
                  : (t("auth.login") || "Sign In")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Right column - Hero section */}
      <div className="hidden md:flex md:w-1/2 bg-gray-800 text-white p-8 flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-6">{t("auth.heroTitle") || "Twin Fix for McDonald's"}</h1>
          <p className="text-lg mb-8">{t("auth.heroDescription") || "Simplify maintenance management with our intelligent platform designed specifically for McDonald's restaurants."}</p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="rounded-full bg-primary/20 p-2 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                  <path d="M13.5 1.5a9 9 0 0 1 9 9"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">{t("auth.featureTrackTitle") || "Efficient Issue Tracking"}</h3>
                <p className="text-gray-300">{t("auth.featureTrackDescription") || "Quickly report and track maintenance issues in your restaurant."}</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="rounded-full bg-primary/20 p-2 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"></path>
                  <path d="m16 12-4 4-4-4"></path>
                  <path d="M12 16V8"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">{t("auth.featureManageTitle") || "Equipment Management"}</h3>
                <p className="text-gray-300">{t("auth.featureManageDescription") || "Manage all your restaurant's equipment in one place with comprehensive inventory tools."}</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="rounded-full bg-primary/20 p-2 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M2 12h20"></path>
                  <path d="M12 2v20"></path>
                  <path d="M12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>
                  <path d="M12 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>
                  <path d="M21 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z"></path>
                  <path d="M3 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">{t("auth.featureCollaborateTitle")}</h3>
                <p className="text-gray-300">{t("auth.featureCollaborateDescription")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}