import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, LayoutDashboard, DoorClosed } from 'lucide-react';

interface MapDisplayInfoProps {
  location: string;
}

/**
 * This component displays information about the selected location
 * with a structured hierarchical display
 */
export default function MapDisplayInfo({ location }: MapDisplayInfoProps) {
  const { t } = useTranslation();

  // Parse the location string
  const parts = location.split(', ');
  const building = parts[0] || '';
  const floor = parts[1] || '';
  const room = parts[2] || '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          {t('locations.selectedLocation')}
        </CardTitle>
        <CardDescription>
          {t('locations.locationDetails')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Display building */}
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-md">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium">{t('locations.building')}</h3>
              <p className="text-base">{building}</p>
            </div>
          </div>

          {/* Display floor */}
          {floor && (
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-md">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium">{t('locations.floor')}</h3>
                <p className="text-base">{floor}</p>
              </div>
            </div>
          )}

          {/* Display room */}
          {room && (
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-md">
                <DoorClosed className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium">{t('locations.room')}</h3>
                <p className="text-base">{room}</p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-sm text-gray-500">
              {t('locations.locationDetails')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}