// Load the error prevention script first
import "./utils/preventViteErrors.js";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
// Import i18n configuration
import "./i18n";

// Add title
document.title = "Twin Fix - Precise Issue Reporting";

// Add browser favicon
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔧</text></svg>";
document.head.appendChild(favicon);

// Render the app with a suspense fallback
createRoot(document.getElementById("root")!).render(
  <Suspense fallback={
    <div className="h-screen w-full flex items-center justify-center">
      <div className="space-y-4 w-[600px]">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-32 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
        </div>
      </div>
    </div>
  }>
    <App />
  </Suspense>
);