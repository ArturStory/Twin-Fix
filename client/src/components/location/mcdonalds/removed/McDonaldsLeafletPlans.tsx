import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import LeafletPlanViewer from './LeafletPlanViewer';

interface McDonaldsLeafletPlansProps {
  onPinAdded?: (coordinates: { x: number, y: number, description: string, isInterior: boolean, capturedImage?: string }) => void;
}

export default function McDonaldsLeafletPlans({ onPinAdded }: McDonaldsLeafletPlansProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('interior');

  const handlePinAdded = (coordinates: { x: number, y: number, description: string, capturedImage?: string }) => {
    try {
      console.log('McDonaldsLeafletPlans received pin coordinates:', {
        ...coordinates,
        x_type: typeof coordinates.x,
        y_type: typeof coordinates.y,
        capturedImage: coordinates.capturedImage ? '(available but not logged)' : undefined
      });
      console.log('Current active tab:', activeTab);
      
      if (onPinAdded) {
        // Enhance the pin data with information about which plan (interior/exterior) was used
        const enhancedDescription = coordinates.description + 
          (activeTab === 'interior' 
            ? ' (Interior plan)' 
            : ' (Exterior plan)');
        
        // Make absolutely sure x and y are numbers before passing them up
        const xCoord = typeof coordinates.x === 'number' ? coordinates.x : parseFloat(String(coordinates.x));
        const yCoord = typeof coordinates.y === 'number' ? coordinates.y : parseFloat(String(coordinates.y));
        
        console.log('Converted coordinates to ensure they are numbers:', { 
          x: xCoord, 
          y: yCoord,
          x_type: typeof xCoord,
          y_type: typeof yCoord
        });
        
        const pinData = {
          x: xCoord,
          y: yCoord,
          description: enhancedDescription,
          isInterior: activeTab === 'interior',
          capturedImage: coordinates.capturedImage // Pass through the captured image if available
        };
        
        console.log('Passing enhanced pin data to parent component:', 
          coordinates.capturedImage ? 
          {...pinData, capturedImage: 'capturedImage data available (not logged for brevity)'} : 
          pinData
        );
        onPinAdded(pinData);
      } else {
        console.log('No onPinAdded callback provided');
      }
    } catch (e) {
      console.error('Error in McDonaldsLeafletPlans.handlePinAdded:', e);
    }
  };

  return (
    <div className="mcdonalds-plans">
      <Tabs defaultValue="interior" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="interior">Interior</TabsTrigger>
          <TabsTrigger value="exterior">Exterior</TabsTrigger>
        </TabsList>
        
        <TabsContent value="interior" className="mt-0">
          <LeafletPlanViewer 
            imagePath="/static/McDonalds-interior-plan.jpg" 
            isInterior={true}
            onPinAdded={handlePinAdded}
          />
        </TabsContent>
        
        <TabsContent value="exterior" className="mt-0">
          <LeafletPlanViewer 
            imagePath="/static/McDonalds-exterior-plan.jpg" 
            isInterior={false}
            onPinAdded={handlePinAdded}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}