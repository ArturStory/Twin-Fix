import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Pin position interface for controlling the component
interface PinPosition {
  xPercent: number;
  yPercent: number;
}

// Props for the component
interface SimpleDomPinMapProps {
  imagePath: string;
  initialPinPosition?: PinPosition;
  pinLabel?: string;
  readOnly?: boolean;
  className?: string;
  showDebugInfo?: boolean;
  onPinMoved?: (coordinates: { xPercent: number; yPercent: number; x: number; y: number }) => void;
}

// Original image dimensions (in pixels) for the McDonald's floor plan
const FLOOR_PLAN_WIDTH = 3544;
const FLOOR_PLAN_HEIGHT = 1755;

const SimpleDomPinMap: React.FC<SimpleDomPinMapProps> = ({
  imagePath,
  initialPinPosition,
  pinLabel,
  readOnly = false,
  className = '',
  showDebugInfo = false,
  onPinMoved
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize the map with the DOM approach
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create a timeout to ensure the DOM is fully loaded
    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      
      // Clear any existing content
      container.innerHTML = '';
      
      // Set up the container to match your provided CSS
      container.className = 'image-container relative w-full inline-block';
      
      // Add the floor plan image
      const image = document.createElement('img');
      image.id = 'floorPlan';
      image.src = imagePath;
      image.alt = 'Floor Plan';
      image.className = 'w-full h-auto block';
      image.style.cursor = readOnly ? 'default' : 'crosshair';
      container.appendChild(image);
      
      // Create a simple pin element matching your CSS
      const pin = document.createElement('div');
      pin.id = 'pin';
      pin.className = 'pin';
      pin.style.position = 'absolute';
      pin.style.width = '20px';
      pin.style.height = '20px';
      pin.style.backgroundColor = 'red';
      pin.style.borderRadius = '50%';
      pin.style.transform = 'translate(-50%, -100%)';
      pin.style.pointerEvents = 'none';
      pin.style.display = initialPinPosition ? 'block' : 'none';
      pin.style.zIndex = '10';
      
      // Add label if provided
      if (pinLabel) {
        const label = document.createElement('div');
        label.className = 'absolute whitespace-nowrap bg-white px-2 py-1 rounded-md text-sm ' +
                         'shadow-md left-0 z-20 max-w-[200px] overflow-hidden ' +
                         'text-ellipsis border border-red-400/70 font-medium';
        label.style.transform = 'translateX(-50%)';
        label.style.top = '20px';
        label.textContent = pinLabel;
        pin.appendChild(label);
      }
      
      container.appendChild(pin);
      
      // Function to move pin to specific position (using your exact approach)
      const movePin = (xPercent: number, yPercent: number) => {
        // Calculate absolute pixel position based on current image size
        const x = (xPercent / 100) * image.offsetWidth;
        const y = (yPercent / 100) * image.offsetHeight;
        
        // Position using pixels
        pin.style.left = `${x}px`;
        pin.style.top = `${y}px`;
        pin.style.display = 'block';
      };
      
      // Position pin if coordinates exist
      image.addEventListener('load', () => {
        if (initialPinPosition) {
          // Convert 0-1 scale from our props to 0-100 percentage scale for saved coordinates
          const savedXPercent = initialPinPosition.xPercent * 100; 
          const savedYPercent = initialPinPosition.yPercent * 100;
          
          // Position pin using saved percentage coordinates
          movePin(savedXPercent, savedYPercent);
          
          if (showDebugInfo) {
            console.log('Initial pin positioned at:', {
              savedPercent: { x: savedXPercent, y: savedYPercent },
              fractionCoords: { x: initialPinPosition.xPercent, y: initialPinPosition.yPercent },
              originalCoords: { 
                x: Math.round(initialPinPosition.xPercent * FLOOR_PLAN_WIDTH),
                y: Math.round(initialPinPosition.yPercent * FLOOR_PLAN_HEIGHT)
              }
            });
          }
        }
        
        // Add window resize handler to reposition pin when image size changes
        const handleResize = () => {
          if (initialPinPosition) {
            // Use the same format as above for consistency
            const savedXPercent = initialPinPosition.xPercent * 100;
            const savedYPercent = initialPinPosition.yPercent * 100;
            movePin(savedXPercent, savedYPercent);
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Return cleanup function for this event listener
        return () => window.removeEventListener('resize', handleResize);
      });
      
      // Add help text for non-read-only mode
      if (!readOnly) {
        const helpText = document.createElement('div');
        helpText.className = 'absolute bottom-2 right-2 bg-white/80 p-2 rounded-md text-xs text-gray-700 shadow-sm';
        helpText.textContent = t('map.clickToPlacePin', 'Click to place pin');
        container.appendChild(helpText);
      }
      
      // Add click handler to set pin position
      if (!readOnly) {
        image.addEventListener('click', (e) => {
          const rect = image.getBoundingClientRect();
            
          // Calculate percentage position (values from 0-100)
          const xPercentValue = ((e.clientX - rect.left) / rect.width) * 100;
          const yPercentValue = ((e.clientY - rect.top) / rect.height) * 100;
          
          // Position pin using the movePin function (your exact approach)
          movePin(xPercentValue, yPercentValue);
          
          // For our component API and database storage (0-1 scale)
          const xPercent = xPercentValue / 100;
          const yPercent = yPercentValue / 100;
          
          // Calculate coordinates for database based on original image size
          const x = Math.round(xPercent * FLOOR_PLAN_WIDTH);
          const y = Math.round(yPercent * FLOOR_PLAN_HEIGHT);
          
          // Add a debug blue dot if debug mode is enabled
          if (showDebugInfo) {
            // Remove any existing dot
            const existingDot = document.getElementById('debug-click-dot');
            if (existingDot) {
              existingDot.remove();
            }
            
            // Create a blue dot at the exact click position
            const dot = document.createElement('div');
            dot.id = 'debug-click-dot';
            dot.style.position = 'fixed';
            dot.style.left = `${e.clientX}px`;
            dot.style.top = `${e.clientY}px`;
            dot.style.width = '10px';
            dot.style.height = '10px';
            dot.style.backgroundColor = 'blue';
            dot.style.borderRadius = '50%';
            dot.style.pointerEvents = 'none';
            dot.style.zIndex = '9999';
            dot.style.transform = 'translate(-50%, -50%)';
            
            document.body.appendChild(dot);
            
            // Log debug information
            console.log('Pin positioned at:', {
              screenCoords: { x: e.clientX, y: e.clientY },
              relativeCoords: { x: e.clientX - rect.left, y: e.clientY - rect.top },
              percentage: { 
                xPercent100: xPercentValue.toFixed(2) + '%', 
                yPercent100: yPercentValue.toFixed(2) + '%',
                xPercent: xPercent, 
                yPercent: yPercent 
              },
              originalImageCoords: { x, y }
            });
          }
          
          // Notify parent component
          if (onPinMoved) {
            onPinMoved({
              xPercent,
              yPercent,
              x,
              y
            });
          }
        });
      }
      
      // Add debug info if enabled
      if (showDebugInfo && initialPinPosition) {
        const debugInfo = document.createElement('div');
        debugInfo.className = 'bg-black/80 text-white text-xs p-2 absolute bottom-0 left-0 right-0 z-10';
        
        // Update debug info on image load
        image.addEventListener('load', () => {
          if (!initialPinPosition) return;
          
          const x = Math.round(initialPinPosition.xPercent * FLOOR_PLAN_WIDTH);
          const y = Math.round(initialPinPosition.yPercent * FLOOR_PLAN_HEIGHT);
          
          debugInfo.innerHTML = `
            <div>Pin position: ${initialPinPosition.xPercent.toFixed(3)} × ${initialPinPosition.yPercent.toFixed(3)}</div>
            <div>Pixel coords: ${x} × ${y} px</div>
            <div>Image natural size: ${FLOOR_PLAN_WIDTH} × ${FLOOR_PLAN_HEIGHT} px</div>
            <div>Image display size: ${image.offsetWidth} × ${image.offsetHeight} px</div>
          `;
        });
        
        container.appendChild(debugInfo);
      }
    }, 100); // Short delay to ensure DOM is ready
    
    return () => {
      clearTimeout(timeoutId);
      
      // Clean up any debug elements on unmount
      const debugDot = document.getElementById('debug-click-dot');
      if (debugDot) debugDot.remove();
    };
  }, [imagePath, initialPinPosition, pinLabel, readOnly, showDebugInfo, onPinMoved, t]);
  
  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden border rounded-md ${className}`}
    >
      {/* Container will be filled by the useEffect */}
    </div>
  );
};

export default SimpleDomPinMap;