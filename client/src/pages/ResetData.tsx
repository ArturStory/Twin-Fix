import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ResetData() {
  const { t } = useTranslation();
  const [resetStatus, setResetStatus] = useState<{ pins: boolean; done: boolean }>({ 
    pins: false,
    done: false
  });

  const resetPins = () => {
    try {
      // Clear saved pins from localStorage - explicitly target the McDonald's pins
      const keysToRemove = [
        'savedPins',
        'mcdonalds-pins',
        'mcdonalds-pins-interior',
        'mcdonalds-pins-exterior',
        'pins',
        'floorPlanPins',
        'mapPins'
      ];
      
      // Remove all possible keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage key: ${key}`);
      });
      
      // Additional clearing for any pin-related data
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allKeys.push(key);
        }
      }
      
      // Now loop through the collected keys and remove matching ones
      allKeys.forEach(key => {
        if (
          key.includes('pin') || 
          key.includes('marker') || 
          key.includes('map') ||
          key.includes('issue') || 
          key.includes('mcdonalds') ||
          key.includes('location')
        ) {
          localStorage.removeItem(key);
          console.log(`Cleared related localStorage key: ${key}`);
        }
      });
      
      // Force clear specific McDonald's pins
      localStorage.removeItem('mcdonalds-pins-interior');
      localStorage.removeItem('mcdonalds-pins-exterior');
      
      // Clear any remaining localStorage items with 'mcdonalds' in the key
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('mcdonalds')) {
          localStorage.removeItem(key);
          console.log(`Forced clear of McDonald's related key: ${key}`);
        }
      }
      
      console.log('All pins and related data have been cleared from localStorage');
      setResetStatus(prev => ({ ...prev, pins: true }));
    } catch (error) {
      console.error('Error clearing pins:', error);
    }
  };

  const finishReset = () => {
    setResetStatus(prev => ({ ...prev, done: true }));
    // Reload the page after a delay to ensure user sees confirmation
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  return (
    <div className="container max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('reset.title') || 'Reset Application Data'}</CardTitle>
          <CardDescription>
            {t('reset.description') || 'This will reset all application data for a fresh start.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center">
              <Trash2 className="h-5 w-5 mr-2 text-red-500" />
              <span>{t('reset.pinLocations') || 'Pin Locations'}</span>
            </div>
            {resetStatus.pins ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={resetPins}
              >
                {t('reset.clear') || 'Clear'}
              </Button>
            )}
          </div>

          {resetStatus.pins && !resetStatus.done && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
              <span className="text-sm text-amber-700">
                {t('reset.warning') || 'All pin data has been cleared. This cannot be undone.'}
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          {resetStatus.done ? (
            <div className="flex items-center text-green-600">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              <span>{t('reset.complete') || 'Reset complete!'}</span>
            </div>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="mr-2" 
                onClick={() => window.location.href = '/'}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button 
                onClick={finishReset} 
                disabled={!resetStatus.pins}
              >
                {t('reset.done') || 'Done'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}