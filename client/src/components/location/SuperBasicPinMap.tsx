import React from 'react';

type Props = {
  imgSrc: string; 
  pinX: number;   // X coordinate in pixels
  pinY: number;   // Y coordinate in pixels
  className?: string;
}

// Most basic pin positioning possible - no fancy features
export default function SuperBasicPinMap({ imgSrc, pinX, pinY, className = '' }: Props) {
  // Image width and height in original pixels
  const imgWidth = 3544;
  const imgHeight = 1755;
  
  // Convert to percentages
  const pinLeftPercent = (pinX / imgWidth) * 100;
  const pinTopPercent = (pinY / imgHeight) * 100;
  
  return (
    <div className={`relative ${className}`}>
      <img 
        src={imgSrc} 
        alt="Floor Plan"
        className="w-full h-auto"
      />
      {/* Extra-obvious, can't-miss-it pin with shadow effect */}
      <div 
        style={{
          position: 'absolute',
          left: `${pinLeftPercent}%`,
          top: `${pinTopPercent}%`,
          width: '24px',
          height: '24px',
          marginLeft: '-12px',
          marginTop: '-12px',
          backgroundColor: '#ff0000',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 0 0 2px #000000, 0 0 10px rgba(0,0,0,0.5)',
          zIndex: 100
        }}
      />
      
      {/* Coordinate debug info - shown at bottom right */}
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          right: '5px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          fontSize: '12px',
          borderRadius: '4px'
        }}
      >
        Pin at: X:{pinX}, Y:{pinY} | {pinLeftPercent.toFixed(2)}%, {pinTopPercent.toFixed(2)}%
      </div>
    </div>
  );
}