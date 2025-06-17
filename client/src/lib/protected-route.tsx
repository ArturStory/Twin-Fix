import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole = "any",
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: "any" | "admin" | "owner" | "manager" | "repairman";
}) {
  console.log("ProtectedRoute rendering for path:", path);
  const { user, isLoading, isAdmin, isOwner, isManager, isRepairman } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }

  // Check role-based authorization
  let hasRequiredRole = true;
  if (requiredRole === "admin" && !isAdmin) {
    hasRequiredRole = false;
  } else if (requiredRole === "owner" && !isOwner) {
    hasRequiredRole = false;
  } else if (requiredRole === "manager" && !isManager) {
    hasRequiredRole = false;
  } else if (requiredRole === "repairman" && !isRepairman) {
    hasRequiredRole = false;
  }

  if (!hasRequiredRole) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-center mb-6">
            You don't have the required permissions to access this page.
          </p>
          <a
            href="/"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Return to Home
          </a>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}