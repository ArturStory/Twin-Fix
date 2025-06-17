import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SimplePinMapProps {
  imagePath: string;
  initialPinPosition?: {
    xPercent: number;
    yPercent: number;
  };
  pinLabel?: string;
  readOnly?: boolean;
  className?: string;
  showDebugInfo?: boolean; // Add option to show/hide debug overlay
  onPinMoved?: (coordinates: { 
    xPercent: number; 
    yPercent: number;
    // Also provide pixel coordinates for backward compatibility
    x: number; 
    y: number; 
  }) => void;
}

/**
 * A simpler, more reliable component for displaying floor plans with pinned locations
 * This uses percentage-based positioning for reliable pin placement regardless of scaling
 */
const SimplePinMap: React.FC<SimplePinMapProps> = ({
  imagePath,
  initialPinPosition,
  pinLabel,
  readOnly = false,
  className = '',
  showDebugInfo = false, // Default to false for production use
  onPinMoved
}) => {
  const { t } = useTranslation();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pinPosition, setPinPosition] = useState<{ xPercent: number; yPercent: number; } | null>(
    initialPinPosition || null
  );
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Update image dimensions when it loads
  const handleImageLoad = () => {
    if (imageRef.current) {
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      const displayWidth = imageRef.current.offsetWidth;
      const displayHeight = imageRef.current.offsetHeight;
      
      setImageDimensions({
        width: displayWidth,
        height: displayHeight
      });
      
      console.log('Image loaded with dimensions:', {
        natural: { width: naturalWidth, height: naturalHeight },
        display: { width: displayWidth, height: displayHeight },
        scaleFactor: {
          width: displayWidth / naturalWidth,
          height: displayHeight / naturalHeight
        }
      });
      
      setImageLoaded(true);
    }
  };
  
  // Handle pin positioning from the initial coordinates
  useEffect(() => {
    if (initialPinPosition) {
      setPinPosition(initialPinPosition);
    }
  }, [initialPinPosition]);
  
  // Force re-render of pin when image dimensions change
  useEffect(() => {
    if (imageLoaded && pinPosition && imageDimensions.width > 0) {
      // This triggers a re-render with the updated dimensions
      setPinPosition({...pinPosition});
    }
  }, [imageDimensions, imageLoaded]);
  
  // Add resize listener to handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        // Update image dimensions on resize
        setImageDimensions({
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up resize listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle image click to position the pin
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (readOnly) return;
    
    if (imageRef.current) {
      // Get the exact rectangle of the image in the viewport
      const rect = imageRef.current.getBoundingClientRect();
      
      // Calculate exact pixel position within the image
      const xPixel = e.clientX - rect.left;
      const yPixel = e.clientY - rect.top;
      
      // Store the exact click position for debugging visualization
      if (showDebugInfo) {
        setClickPosition({ x: e.clientX, y: e.clientY });
      }
      
      // Calculate percentage position (0-1) for storing in state
      const xPercent = xPixel / rect.width;
      const yPercent = yPixel / rect.height;
      
      // Ensure values are in valid range (0-1)
      const boundedXPercent = Math.max(0, Math.min(1, xPercent));
      const boundedYPercent = Math.max(0, Math.min(1, yPercent));
      
      // Get the natural dimensions of the original image
      const naturalWidth = imageRef.current.naturalWidth || 3544; // McDonald's floor plan width
      const naturalHeight = imageRef.current.naturalHeight || 1755; // McDonald's floor plan height
      
      // Calculate absolute pixel values for the original size image (for database storage)
      const x = Math.round(boundedXPercent * naturalWidth);
      const y = Math.round(boundedYPercent * naturalHeight);
      
      // Debug output
      if (showDebugInfo) {
        console.log('--- DEBUG CLICK ---');
        console.log(`Click event: clientX=${e.clientX}, clientY=${e.clientY}`);
        console.log(`Image rect: left=${rect.left.toFixed(1)}, top=${rect.top.toFixed(1)}, width=${rect.width.toFixed(1)}, height=${rect.height.toFixed(1)}`);
        console.log(`Click relative to image: x=${xPixel.toFixed(1)}px, y=${yPixel.toFixed(1)}px`);
        console.log(`Percentage coordinates: x=${(xPercent * 100).toFixed(2)}%, y=${(yPercent * 100).toFixed(2)}%`);
        console.log(`Original image coordinates: x=${x}px, y=${y}px (${naturalWidth}×${naturalHeight})`);
      }
      
      console.log("Pin positioned at:", {
        percentages: { xPercent: boundedXPercent, yPercent: boundedYPercent },
        pixels: { x, y }
      });
      
      // Update pin position
      setPinPosition({
        xPercent: boundedXPercent,
        yPercent: boundedYPercent
      });
      
      // Notify parent component
      if (onPinMoved) {
        onPinMoved({
          xPercent: boundedXPercent,
          yPercent: boundedYPercent,
          x,
          y
        });
      }
    }
  };
  
  // State for tracking the exact click position for debugging
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Effect to handle the debug click dot in the document body
  useEffect(() => {
    if (showDebugInfo && clickPosition) {
      // Create a debug dot at the exact click position
      const clickDot = document.createElement('div');
      clickDot.id = 'debug-click-dot';
      clickDot.style.position = 'fixed';
      clickDot.style.width = '10px';
      clickDot.style.height = '10px';
      clickDot.style.backgroundColor = 'blue';
      clickDot.style.borderRadius = '50%';
      clickDot.style.pointerEvents = 'none';
      clickDot.style.zIndex = '9999';
      clickDot.style.left = `${clickPosition.x}px`;
      clickDot.style.top = `${clickPosition.y}px`;
      clickDot.style.transform = 'translate(-50%, -50%)';
      
      // Remove any existing debug dot
      const existingDot = document.getElementById('debug-click-dot');
      if (existingDot && existingDot.parentNode) {
        existingDot.parentNode.removeChild(existingDot);
      }
      
      // Add the new debug dot
      document.body.appendChild(clickDot);
      
      // Clean up function to remove the dot
      return () => {
        if (clickDot.parentNode) {
          clickDot.parentNode.removeChild(clickDot);
        }
      };
    }
  }, [clickPosition, showDebugInfo]);
  
  // Debug function for pinpointing the exact position
  const debugPinPosition = () => {
    if (!pinPosition || !imageRef.current) return null;
    
    const naturalWidth = imageRef.current.naturalWidth || 0;
    const naturalHeight = imageRef.current.naturalHeight || 0;
    const x = Math.round(pinPosition.xPercent * naturalWidth);
    const y = Math.round(pinPosition.yPercent * naturalHeight);
    
    return (
      <div className="bg-black/80 text-white text-xs p-2 absolute bottom-0 left-0 right-0 z-10">
        <div>Pin position: {pinPosition.xPercent.toFixed(3)} × {pinPosition.yPercent.toFixed(3)}</div>
        <div>Pixel coords: {x} × {y} px</div>
        <div>Image natural size: {naturalWidth} × {naturalHeight} px</div>
        <div>Image display size: {imageDimensions.width} × {imageDimensions.height} px</div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden border rounded-md ${className}`}
    >
      {/* Image container */}
      <div className="relative w-full">
        <img
          ref={imageRef}
          src={imagePath}
          alt="Floor Plan"
          className="w-full h-auto"
          onClick={handleImageClick}
          onLoad={handleImageLoad}
          style={{ cursor: readOnly ? 'default' : 'crosshair' }}
        />
        
        {/* Pin overlay */}
        {imageLoaded && pinPosition && imageRef.current && (
          <div
            className="absolute pointer-events-none pin-marker"
            style={{
              // Use absolute pixel positioning instead of percentage-based
              left: `${pinPosition.xPercent * imageRef.current.offsetWidth}px`,
              top: `${pinPosition.yPercent * imageRef.current.offsetHeight}px`,
              // No transform needed since we're positioning exactly
              transform: 'translate(-50%, -50%)'
            }}
            title={pinLabel}
            data-x-percent={pinPosition.xPercent.toFixed(3)}
            data-y-percent={pinPosition.yPercent.toFixed(3)}
          >
            <div className="relative">
              {/* Crosshair for precise positioning */}
              <div className="absolute w-4 h-4 border-2 border-red-600 rounded-full" style={{ top: '-2px', left: '-2px' }} />
              
              {/* Pulsing circle for visibility */}
              <div className="absolute w-8 h-8 bg-red-400/30 rounded-full -top-4 -left-4 animate-ping" />
              
              {/* Pin marker positioned to point exactly at the coordinates - THE TIP OF THE PIN IS THE ACTUAL COORDINATE */}
              <MapPin className="h-8 w-8 text-red-600 drop-shadow-lg" style={{ 
                transform: 'translate(-50%, -100%)', // THIS IS CRITICAL - it makes the tip of the pin point to the coordinates
                position: 'absolute', 
                bottom: '0px' 
              }} />
              
              {/* Pin label */}
              {pinLabel && (
                <div className="absolute whitespace-nowrap bg-white px-2 py-1 rounded-md text-sm 
                              shadow-md left-0 top-10 z-10 max-w-[200px] overflow-hidden 
                              text-ellipsis border border-red-400/70 font-medium"
                    style={{ transform: 'translateX(-50%)' }}>
                  {pinLabel}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Help text for non-read-only mode */}
        {!readOnly && (
          <div className="absolute bottom-2 right-2 bg-white/80 p-2 rounded-md text-xs text-gray-700 shadow-sm">
            {t('map.clickToPlacePin', 'Click to place pin')}
          </div>
        )}
        
        {/* Debug info - only show if enabled */}
        {showDebugInfo && imageLoaded && pinPosition && debugPinPosition()}
      </div>
    </div>
  );
};

export default SimplePinMap;