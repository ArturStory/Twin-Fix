import { Link } from "wouter";
import { Issue, IssueStatus } from "@shared/schema";
import React from "react";
import { Clipboard, Map, ClipboardList, FilePlus, Settings, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  console.log("Dashboard component rendering");
  let t;
  let i18n;
  
  try {
    const translation = useTranslation();
    t = translation.t;
    i18n = translation.i18n;
    console.log("Translation loaded successfully");
  } catch (error) {
    console.error("Error loading translations:", error);
    // Fallback for translations if they fail to load
    t = (key: string) => key;
    i18n = { language: 'en' };
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.title')}</h1>
        <p className="text-gray-700 dark:text-gray-200 max-w-2xl mx-auto">
          {t('dashboard.welcome')}
        </p>
      </div>

      {/* Main options - highly simplified for clarity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Report New Issue */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl">
              <FilePlus className="h-6 w-6 mr-2 text-primary" />
              {t('issues.createNew')}
            </CardTitle>
            <CardDescription>
              {t('issues.submitDetails')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('issues.fillOutForm')}
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/report">
                {t('dashboard.reportIssue')}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* View Reported Issues */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl">
              <ClipboardList className="h-6 w-6 mr-2 text-primary" />
              {t('issues.allReports')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.recentIssues')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('issues.details')}
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/my-reports">
                {t('dashboard.viewAll')}
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* Inventory */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl">
              <Wrench className="h-6 w-6 mr-2 text-primary" />
              {t('inventory.title')}
            </CardTitle>
            <CardDescription>
              {t('inventory.machineDetails')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('inventory.machineInfo')}
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/location-select">
                {t('inventory.title')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Secondary options - shown smaller below main options */}
      <div className="mt-12 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.seeAll')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button asChild variant="outline" className="h-16 justify-start px-4">
            <Link href="/shared-locations" className="flex items-center">
              <Map className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">{t('locations.management')}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {i18n.language === 'pl' ? 'Zarządzaj lokalizacjami' : 
                   i18n.language === 'es' ? 'Gestiona ubicaciones' : 
                   'Manage locations'}
                </div>
              </div>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-16 justify-start px-4">
            <Link href="/issues/history" className="flex items-center">
              <Clipboard className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">{t('issues.statusUpdates')}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{t('stats.issuesOverTime')}</div>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}