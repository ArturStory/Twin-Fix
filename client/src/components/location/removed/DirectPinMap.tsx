import React, { useEffect, useRef } from 'react';

interface DirectPinMapProps {
  imagePath: string;
  xPercent: number; 
  yPercent: number;
  className?: string;
}

/**
 * Ultra simplified pin map component - most direct implementation possible
 */
const DirectPinMap: React.FC<DirectPinMapProps> = ({
  imagePath,
  xPercent,
  yPercent,
  className = '',
}) => {
  // Use refs instead of direct DOM manipulation for better React practices
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Function to position the pin
    const positionPin = () => {
      const image = imageRef.current;
      const pin = pinRef.current;
      
      if (!image || !pin) {
        console.error('Could not find image or pin element');
        return;
      }
      
      // Calculate absolute pixel position based on percentage
      const x = (xPercent / 100) * image.offsetWidth;
      const y = (yPercent / 100) * image.offsetHeight;
      
      // Position the pin using direct absolute positioning
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
      pin.style.display = 'block';
      
      console.log('Pin positioned at:', { 
        xPercent, yPercent, 
        xPx: x, yPx: y,
        imageWidth: image.offsetWidth, 
        imageHeight: image.offsetHeight
      });
    };
    
    // Position pin initially and when image loads
    const image = imageRef.current;
    if (image) {
      if (image.complete) {
        positionPin();
      } else {
        image.onload = positionPin;
      }
    
      // Handle window resize
      window.addEventListener('resize', positionPin);
      
      // Cleanup event listener
      return () => {
        window.removeEventListener('resize', positionPin);
        if (image) {
          image.onload = null;
        }
      };
    }
  }, [xPercent, yPercent, imagePath]);
  
  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ margin: '0 auto' }}
    >
      <img 
        ref={imageRef}
        src={imagePath} 
        alt="Floor Plan"
        className="w-full h-auto block"
      />
      <div 
        ref={pinRef}
        className="absolute"
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: 'red',
          borderRadius: '50%',
          transform: 'translate(-50%, -100%)',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      />
    </div>
  );
};

export default DirectPinMap;