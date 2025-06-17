import React from 'react';

type Props = {
  imgSrc: string;
  pinX: number;
  pinY: number;
  clickable?: boolean;
  onPinPlaced?: (x: number, y: number) => void;
}

/**
 * The most basic, no-frills implementation of a pin map possible.
 * Uses direct DOM manipulation and avoids any complexity.
 */
export default function UltraBasicPinMap({ 
  imgSrc, 
  pinX, 
  pinY, 
  clickable = false,
  onPinPlaced
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const [loaded, setLoaded] = React.useState(false);
  
  // Original image dimensions
  const originalWidth = 3544;
  const originalHeight = 1755;
  
  // Get percentage positions
  const pinXPercent = (pinX / originalWidth) * 100;
  const pinYPercent = (pinY / originalHeight) * 100;

  // Handle image load to get actual dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({
      width: img.clientWidth,
      height: img.clientHeight
    });
    setLoaded(true);
  };

  // Handle click to place pin (if clickable)
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickable || !onPinPlaced || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate position relative to original image dimensions
    const percentX = x / rect.width;
    const percentY = y / rect.height;
    
    const originalX = Math.round(percentX * originalWidth);
    const originalY = Math.round(percentY * originalHeight);
    
    console.log(`Pin placed at pixel coordinates: ${originalX}, ${originalY}`);
    console.log(`Percentage coordinates: ${(percentX * 100).toFixed(2)}%, ${(percentY * 100).toFixed(2)}%`);
    
    // Call the callback with the new coordinates
    onPinPlaced(originalX, originalY);
  };

  return (
    <div className="relative" style={{ width: '100%' }} ref={containerRef} onClick={handleClick}>
      {/* The base image */}
      <img 
        src={imgSrc} 
        alt="Floor Plan" 
        className="w-full h-auto border rounded-md"
        onLoad={handleImageLoad}
        style={{ cursor: clickable ? 'crosshair' : 'default' }}
      />
      
      {/* The pin - absolutely positioned using percentages */}
      {loaded && (
        <div 
          style={{
            position: 'absolute',
            left: `${pinXPercent}%`,
            top: `${pinYPercent}%`,
            width: '30px',
            height: '30px',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'red',
            borderRadius: '50%',
            border: '3px solid white',
            boxShadow: '0 0 0 2px black, 0 0 10px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}
      
      {/* Removed debug info to make map cleaner */}
      
      {/* Clickable overlay instruction (if clickable) */}
      {clickable && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-20">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-lg">
            CLICK ANYWHERE TO PLACE PIN
          </div>
        </div>
      )}
    </div>
  );
}