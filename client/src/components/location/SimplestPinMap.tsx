import React, { useEffect, useRef, useState } from 'react';

interface PinPosition {
  xPercent: number;
  yPercent: number;
}

interface SimplestPinMapProps {
  imagePath: string;
  initialPinPosition: PinPosition;
  className?: string;
  readOnly?: boolean;
  onPinMoved?: (newPosition: PinPosition) => void;
}

/**
 * The simplest possible pinned map component
 * Uses direct DOM manipulation with percentage-based coordinates for consistency
 */
const SimplestPinMap: React.FC<SimplestPinMapProps> = ({
  imagePath,
  initialPinPosition,
  className = '',
  readOnly = false,
  onPinMoved
}) => {
  const [position, setPosition] = useState<PinPosition>(initialPinPosition);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  
  // Effect for positioning and setting up event listeners
  useEffect(() => {
    const image = imageRef.current;
    const pin = pinRef.current;
    const container = containerRef.current;
    
    if (!image || !pin || !container) return;
    
    // Position the pin function
    const positionPin = () => {
      // Calculate absolute pixel position based on percentage
      const x = position.xPercent * image.width;
      const y = position.yPercent * image.height;
      
      // Position the pin using absolute positioning
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
      
      console.log('SimplestPinMap - Pin positioned at:', { 
        xPercent: position.xPercent, 
        yPercent: position.yPercent,
        xPx: x, 
        yPx: y,
        imageWidth: image.width, 
        imageHeight: image.height
      });
    };
    
    // Set up pin movement when clicking on the image
    const handleImageClick = (e: MouseEvent) => {
      if (readOnly) return;
      
      // Get click coordinates relative to the image
      const rect = image.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate percentage of the click location
      const xPercent = x / image.width;
      const yPercent = y / image.height;
      
      // Update pin position
      const newPosition = { xPercent, yPercent };
      setPosition(newPosition);
      
      // Notify parent component
      if (onPinMoved) {
        onPinMoved(newPosition);
      }
      
      console.log('SimplestPinMap - Pin moved to:', { xPercent, yPercent });
    };
    
    // Position pin initially and when image loads
    if (image.complete) {
      positionPin();
    } else {
      image.onload = positionPin;
    }
    
    // Add click handler if not readonly
    if (!readOnly) {
      image.addEventListener('click', handleImageClick);
    }
    
    // Handle window resize
    window.addEventListener('resize', positionPin);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', positionPin);
      if (!readOnly) {
        image.removeEventListener('click', handleImageClick);
      }
    };
  }, [position, readOnly, onPinMoved]);
  
  // Update position when initialPinPosition changes
  useEffect(() => {
    setPosition(initialPinPosition);
  }, [initialPinPosition]);
  
  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      <img 
        ref={imageRef}
        src={imagePath} 
        alt="Floor Plan"
        className="w-full h-auto block"
        style={{ objectFit: 'contain' }}
      />
      <div 
        ref={pinRef}
        className="absolute cursor-pointer"
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: 'red',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      />
      {!readOnly && (
        <div className="absolute bottom-2 right-2 bg-white bg-opacity-75 p-2 rounded text-xs">
          Click on the image to position the pin
        </div>
      )}
    </div>
  );
};

export default SimplestPinMap;