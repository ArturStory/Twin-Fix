import React from 'react';
import { Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SimplePlanViewerProps {
  imagePath: string;
  className?: string;
}

/**
 * A simple component for displaying floor plans without pin functionality
 * Replacement for SimplePinMap after pin functionality was removed
 */
const SimplePlanViewer: React.FC<SimplePlanViewerProps> = ({
  imagePath,
  className = '',
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={`relative overflow-hidden border rounded-md ${className}`}>
      {/* Image container */}
      <div className="relative w-full">
        <img
          src={imagePath}
          alt="Floor Plan"
          className="w-full h-auto"
        />
        
        {/* Explanation message overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-md max-w-md text-center">
            <Building className="h-10 w-10 mx-auto text-gray-500 mb-2" />
            <h3 className="text-lg font-medium mb-2">Floor Plan View</h3>
            <p className="text-gray-700">
              The pin point location feature has been removed from this application.
              Please describe the location in detail when reporting issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePlanViewer;