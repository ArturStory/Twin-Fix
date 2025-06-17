import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Check, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Schema for password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ProfilePage() {
  const { t, ready } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [successMessage, setSuccessMessage] = useState("");

  // Form for password change
  const form = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Mutation for changing password
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordChangeSchema>) => {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t("profile.passwordChanged"),
        description: t("profile.passwordChangedDesc"),
      });
      setSuccessMessage(t("profile.passwordChangedDesc") || "Your password has been changed successfully.");
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: t("profile.passwordChangeError"),
        description: error.message || t("profile.passwordChangeErrorDesc"),
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof passwordChangeSchema>) => {
    setSuccessMessage("");
    changePasswordMutation.mutate(values);
  };

  if (!user || !ready) {
    return <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">{t("profile.title")}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.information")}</CardTitle>
            <CardDescription>{t("profile.informationDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <Label>{t("user.username")}</Label>
              <div className="text-lg font-medium">{user.username}</div>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label>{t("user.email")}</Label>
              <div className="text-lg">{user.email}</div>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label>{t("user.role")}</Label>
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                {user.role}
              </div>
            </div>
            {user.phone && (
              <div className="flex flex-col space-y-1.5">
                <Label>{t("user.phone")}</Label>
                <div className="text-lg">{user.phone}</div>
              </div>
            )}
            {user.position && (
              <div className="flex flex-col space-y-1.5">
                <Label>{t("user.position")}</Label>
                <div className="text-lg">{user.position}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.changePassword")}</CardTitle>
            <CardDescription>{t("profile.changePasswordDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <Alert className="mb-6">
                <Check className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("profile.currentPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("profile.newPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("profile.passwordRequirements")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("profile.confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("profile.changing")}
                    </>
                  ) : (
                    t("profile.changePassword")
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}