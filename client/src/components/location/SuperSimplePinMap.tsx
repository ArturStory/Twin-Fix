import React from 'react';

interface SuperSimplePinMapProps {
  imagePath: string;
  pinXPosition: number; // actual pixel position on original image
  pinYPosition: number; // actual pixel position on original image
  className?: string;
}

/**
 * Ultra simplified static pin display - just shows the image with a pin overlay
 * No interaction, just displays the pin at the specified coordinates
 */
const SuperSimplePinMap: React.FC<SuperSimplePinMapProps> = ({
  imagePath,
  pinXPosition,
  pinYPosition,
  className = '',
}) => {
  // Calculate percentages for CSS positioning
  const xPercent = (pinXPosition / 3544) * 100; // 3544 is original width
  const yPercent = (pinYPosition / 1755) * 100; // 1755 is original height
  
  // Log the coordinates for debugging
  console.log('SuperSimplePinMap rendering with:', {
    imagePath,
    pinXPosition,
    pinYPosition,
    xPercent,
    yPercent
  });
  
  return (
    <div className={`relative ${className}`}>
      <img 
        src={imagePath} 
        alt="Floor Plan" 
        className="w-full h-auto"
      />
      <div
        className="absolute"
        style={{
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          width: '20px',
          height: '20px',
          backgroundColor: 'red',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      />
    </div>
  );
};

export default SuperSimplePinMap;