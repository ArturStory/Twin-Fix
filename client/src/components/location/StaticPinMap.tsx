// This is the most basic pin implementation possible - directly using percentages with no calculations

interface StaticPinMapProps {
  imagePath: string; 
  pinX: number;  // Raw pixel X coordinate (from the database)
  pinY: number;  // Raw pixel Y coordinate (from the database)
  className?: string;
}

export default function StaticPinMap({ 
  imagePath, 
  pinX, 
  pinY, 
  className = ""
}: StaticPinMapProps) {
  const IMAGE_WIDTH = 3544;  // Original image width in pixels
  const IMAGE_HEIGHT = 1755; // Original image height in pixels
  
  // Directly calculate percentages based on the original image dimensions
  const pinLeftPercent = (pinX / IMAGE_WIDTH) * 100;  
  const pinTopPercent = (pinY / IMAGE_HEIGHT) * 100;
  
  console.log('StaticPinMap rendering with:', {
    pinX, 
    pinY,
    pinLeftPercent,
    pinTopPercent
  });
  
  return (
    <div className={`relative ${className}`} style={{ width: "100%" }}>
      <div className="relative" style={{ width: "100%", height: "auto" }}>
        <img 
          src={imagePath} 
          alt="Floor Plan" 
          className="w-full h-auto"
        />
        <div 
          style={{
            position: "absolute",
            left: `${pinLeftPercent}%`,
            top: `${pinTopPercent}%`,
            width: "16px",
            height: "16px",
            marginLeft: "-8px",
            marginTop: "-8px",
            background: "red",
            borderRadius: "50%",
            zIndex: 1000,
          }}
        />
      </div>
    </div>
  );
}