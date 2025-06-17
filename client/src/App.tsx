import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
// Import the issue report components
import BasicReportIssue from "@/pages/BasicReportIssue";
import LocationReportIssue from "@/pages/LocationReportIssue";
import IssueDetail from "@/pages/IssueDetail";
import LocationView from "@/pages/LocationView";
import IssuesList from "@/pages/IssuesList";
import IssuesHistory from "@/pages/IssuesHistory";
import MyReports from "@/pages/MyReports";
import StatsPage from "@/pages/StatsPage";
import DamageReports from "@/pages/DamageReports";
import DamageStatistics from "@/pages/DamageStatistics";
// McDonaldsIssueTracker removed - floor plans functionality removed
import StatisticsPage from "@/pages/StatisticsPage";
import AdvancedStatistics from "@/pages/AdvancedStatistics";
import ResetData from "@/pages/ResetData";
// ClearPins page removed - floor plans functionality removed
import AdminPage from "@/pages/AdminPage";
// PinTest removed - floor plans functionality removed
import MachineInventory from "@/pages/MachineInventory";
import LocationSelection from "@/pages/LocationSelection";
import AuthPage from "@/pages/auth-page";
import LoginPage from "@/pages/LoginPage";
import UserManagement from "@/pages/UserManagement";
import ProfilePage from "@/pages/profile-page";
import RegisterPage from "@/pages/register-page";
import LocationManagement from "@/pages/LocationManagement";
import SharedLocationManagement from "@/pages/SharedLocationManagement";
import MaintenancePlanner from "@/pages/MaintenancePlanner";
import SimpleMessaging from "@/pages/SimpleMessaging";
import WorkingMessaging from "@/pages/WorkingMessaging";
import MessagingDemoPage from "@/pages/MessagingDemoPage"; 
import AuthDebugPage from "@/pages/AuthDebugPage";
import EmergencyLoginPage from "@/pages/EmergencyLoginPage";
import DirectRegisterPage from "@/pages/DirectRegisterPage";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import MobileNav from "@/components/layout/MobileNav";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { useState } from "react";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { DataRefreshHandler } from "@/components/notifications/DataRefreshHandler";
import Problems from "@/pages/Problems";
import InspectionsPage from "@/pages/InspectionsPage";
import TranslatedHeader from "@/components/language/TranslatedHeader";

// Import our new Layout component - this will now handle the navigation
import Layout from "@/components/layout/Layout";

function Router() {
  console.log("Router rendering");
  return (
    <Switch>
      {/* Auth pages - publicly accessible */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/auth-debug" component={AuthDebugPage} />
      <Route path="/emergency-login" component={EmergencyLoginPage} />
      <Route path="/emergency-register" component={DirectRegisterPage} />
      
      {/* Protected routes - require authentication */}
      <ProtectedRoute path="/" component={() => (
        <Layout>
          <Dashboard />
        </Layout>
      )} />
      
      <ProtectedRoute path="/profile" component={() => (
        <Layout>
          <ProfilePage />
        </Layout>
      )} />
      <ProtectedRoute path="/report" component={() => (
        <Layout>
          <LocationReportIssue />
        </Layout>
      )} />
      <ProtectedRoute path="/basic-report" component={() => (
        <Layout>
          <BasicReportIssue />
        </Layout>
      )} />
      <ProtectedRoute path="/issues" component={() => (
        <Layout>
          <IssuesList />
        </Layout>
      )} />
      <ProtectedRoute path="/issues/history" component={() => (
        <Layout>
          <IssuesHistory />
        </Layout>
      )} />
      <ProtectedRoute path="/history" component={() => (
        <Layout>
          <IssuesHistory />
        </Layout>
      )} />
      <ProtectedRoute path="/issue/:id" component={() => (
        <Layout>
          <IssueDetail />
        </Layout>
      )} />
      <ProtectedRoute path="/location" component={() => (
        <Layout>
          <LocationView />
        </Layout>
      )} />
      <ProtectedRoute path="/my-reports" component={() => (
        <Layout>
          <MyReports />
        </Layout>
      )} />
      <ProtectedRoute path="/stats" component={() => (
        <Layout>
          <StatsPage />
        </Layout>
      )} />
      <ProtectedRoute path="/damage-reports" component={() => (
        <Layout>
          <DamageReports />
        </Layout>
      )} />
      <ProtectedRoute path="/damage-statistics" component={() => (
        <Layout>
          <DamageStatistics />
        </Layout>
      )} />
      <ProtectedRoute path="/problems" component={() => (
        <Layout>
          <Problems />
        </Layout>
      )} />
      {/* McDonaldsIssueTracker route removed - floor plans functionality removed */}
      <ProtectedRoute path="/statistics" component={() => (
        <Layout>
          <StatisticsPage />
        </Layout>
      )} />
      <ProtectedRoute path="/advanced-statistics" component={() => (
        <Layout>
          <AdvancedStatistics />
        </Layout>
      )} />
      <ProtectedRoute path="/locations" component={() => (
        <Layout>
          <LocationManagement />
        </Layout>
      )} />
      <ProtectedRoute path="/shared-locations" component={() => (
        <Layout>
          <SharedLocationManagement />
        </Layout>
      )} />
      <ProtectedRoute path="/maintenance" component={() => (
        <Layout>
          <MaintenancePlanner />
        </Layout>
      )} />
      
      <ProtectedRoute path="/inspections" component={() => (
        <Layout>
          <InspectionsPage />
        </Layout>
      )} />
      

      
      {/* Admin-only routes */}
      <ProtectedRoute path="/admin" requiredRole="admin" component={() => (
        <Layout>
          <AdminPage />
        </Layout>
      )} />
      
      {/* User management - Admin & Owner only */}
      <ProtectedRoute path="/users" requiredRole="owner" component={() => (
        <Layout>
          <UserManagement />
        </Layout>
      )} />
      
      {/* Management routes - accessible to all authenticated users */}
      <ProtectedRoute path="/location-select" component={() => (
        <Layout>
          <LocationSelection />
        </Layout>
      )} />
      <ProtectedRoute path="/machines" component={() => (
        <Layout>
          <MachineInventory />
        </Layout>
      )} />
      
      {/* Add alias for /inventory route to point to MachineInventory */}
      <ProtectedRoute path="/inventory" component={() => (
        <Layout>
          <MachineInventory />
        </Layout>
      )} />
      
      {/* Utility routes */}
      <ProtectedRoute path="/reset" requiredRole="admin" component={() => (
        <ResetData />
      )} />
      {/* Clear pins route removed - floor plans functionality removed */}
      {/* Pin test route removed - floor plans functionality removed */}
      
      {/* 404 page */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Import necessary providers
import { NotificationProvider } from './hooks/use-notification-provider';
import { PriorityNotificationProvider } from './components/notifications/PriorityNotificationProvider';
import { PageTracker } from './components/layout/PageTracker';
import { WebSocketNotification } from './components/notifications/WebSocketNotification';
import { ThemeProvider } from 'next-themes';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <WebSocketProvider>
            <NotificationProvider>
              <PriorityNotificationProvider>
                <TooltipProvider>
                  {/* UI components */}
                  <Toaster />
                  {/* WebSocket notification handler - doesn't render anything visible */}
                  <WebSocketNotification />
                  {/* Data refresh handler for clearing issues */}
                  <DataRefreshHandler />
                  <Router />
                </TooltipProvider>
              </PriorityNotificationProvider>
            </NotificationProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
