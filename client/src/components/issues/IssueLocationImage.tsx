import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Issue } from '@shared/schema';
import { ImageOff } from 'lucide-react';

interface IssueLocationImageProps {
  issue: Issue;
  className?: string;
}

export default function IssueLocationImage({ issue, className }: IssueLocationImageProps) {
  const { t } = useTranslation();
  
  // Find a location image from the available images
  const getLocationImage = () => {
    if (!issue.imageUrls || issue.imageUrls.length === 0) {
      console.log('IssueLocationImage: No image URLs found for issue:', issue.id);
      return null;
    }
    
    console.log('IssueLocationImage: Available images for issue', issue.id, ':', issue.imageUrls);
    
    // Look for a location image by name patterns
    const locationImage = issue.imageUrls.find((imgUrl: string) => 
      imgUrl.toLowerCase().includes('location')
    );
    
    if (locationImage) {
      console.log('IssueLocationImage: Found location image by name pattern:', locationImage);
      return locationImage;
    }
    
    // If no specifically named location image, use the first image as fallback
    if (issue.imageUrls.length > 0) {
      console.log('IssueLocationImage: Using first image as location image fallback:', issue.imageUrls[0]);
      return issue.imageUrls[0];
    }
    
    console.log('IssueLocationImage: No suitable location image found');
    return null;
  };
  
  const locationImageUrl = getLocationImage();
  
  if (!locationImageUrl) {
    return (
      <Card className={`${className || ''}`}>
        <CardContent className="p-4 flex items-center justify-center flex-col text-center h-[300px]">
          <ImageOff className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-500 text-sm">
            {t('issue.noLocationImage', 'No location image available for this issue')}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`${className || ''}`}>
      <CardContent className="p-4">
        <div className="rounded-md overflow-hidden border border-gray-200">
          <img 
            src={locationImageUrl} 
            alt={t('issue.locationImage', 'Issue location')} 
            className="w-full h-auto"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {t('issue.locationImageHelp', 'This shows the location of the reported issue')}
        </p>
      </CardContent>
    </Card>
  );
}