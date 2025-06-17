import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { Issue } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import McDonaldsExteriorVector from "./McDonaldsExteriorVector";
import McDonaldsInteriorVector from "./McDonaldsInteriorVector";

interface McDonaldsPlansProps {
  issues: Issue[];
  enablePinMode?: boolean;
  onLocationSelected?: (coordinates: string, description: string) => void;
}

export default function McDonaldsPlans({ 
  issues, 
  enablePinMode = false, 
  onLocationSelected 
}: McDonaldsPlansProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("exterior");

  // Filter issues by location (interior vs exterior)
  const interiorIssues = issues.filter(issue => {
    const locationLower = issue.location.toLowerCase();
    return (
      locationLower.includes("dining") ||
      locationLower.includes("kitchen") ||
      locationLower.includes("counter") ||
      locationLower.includes("bathroom") ||
      locationLower.includes("storage") ||
      (locationLower.includes("entrance") && !locationLower.includes("exterior"))
    );
  });

  const exteriorIssues = issues.filter(issue => {
    const locationLower = issue.location.toLowerCase();
    return (
      locationLower.includes("parking") ||
      locationLower.includes("drive") ||
      locationLower.includes("exterior") ||
      locationLower.includes("building") ||
      locationLower.includes("green") ||
      locationLower.includes("road")
    );
  });

  return (
    <Card className="w-full h-full border-0 shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle>{t('locations.mcdonalds.planTitle')}</CardTitle>
        <CardDescription>{t('locations.clickForInfo')}</CardDescription>
      </CardHeader>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-[calc(100%-5rem)]">
        <div className="px-4 pb-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interior" className="relative">
              {t('locations.mcdonalds.interior')}
              {interiorIssues.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {interiorIssues.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="exterior" className="relative">
              {t('locations.mcdonalds.exterior')}
              {exteriorIssues.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {exteriorIssues.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent className="p-0 h-full">
          <TabsContent value="interior" className="h-full m-0 border-0 p-0">
            <McDonaldsInteriorVector 
              issues={interiorIssues} 
              pinMode={enablePinMode}
              onPinAdded={onLocationSelected}
            />
          </TabsContent>
          <TabsContent value="exterior" className="h-full m-0 border-0 p-0">
            <McDonaldsExteriorVector 
              issues={exteriorIssues} 
              pinMode={enablePinMode}
              onPinAdded={onLocationSelected}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}