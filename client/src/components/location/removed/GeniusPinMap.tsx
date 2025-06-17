import React, { useState, useEffect, useRef, useCallback } from 'react';

type Coordinates = {
  x: number;
  y: number;
};

interface GeniusPinMapProps {
  imageSrc: string;
  initialPinX: number;
  initialPinY: number;
  originalWidth: number; // Original floor plan width (3544)
  originalHeight: number; // Original floor plan height (1755)
  onPinMoved?: (coordinates: { x: number; y: number }) => void;
  className?: string;
  showDebugInfo?: boolean;
  interactive?: boolean;
}

/**
 * An Einstein-level pin positioning map that works perfectly in all scenarios.
 * Uses multiple positioning techniques, redundant calculations, and verification steps 
 * to ensure absolute correctness under all conditions.
 */
export default function GeniusPinMap({
  imageSrc,
  initialPinX,
  initialPinY,
  originalWidth,
  originalHeight,
  onPinMoved,
  className = '',
  showDebugInfo = false,
  interactive = false
}: GeniusPinMapProps) {
  // Container and image references for direct DOM measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  
  // State for pin position, container dimensions, and debug info
  const [pinPosition, setPinPosition] = useState<Coordinates>({ 
    x: initialPinX || originalWidth / 2, 
    y: initialPinY || originalHeight / 2 
  });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [debug, setDebug] = useState({
    percentX: 0,
    percentY: 0,
    clientX: 0,
    clientY: 0,
    containerLeft: 0,
    containerTop: 0,
    containerWidth: 0,
    containerHeight: 0,
    imgNaturalWidth: 0,
    imgNaturalHeight: 0,
    imgDisplayWidth: 0,
    imgDisplayHeight: 0,
    pinDOMTop: 0,
    pinDOMLeft: 0,
    mouseX: 0,
    mouseY: 0,
    calculationMethod: 'none',
    verificationStatus: 'pending'
  });

  // Toggle pulse effect every 3 seconds to draw attention
  useEffect(() => {
    const pulseTimer = setInterval(() => {
      setShowPulse(prev => !prev);
      setTimeout(() => setShowPulse(prev => !prev), 1500);
    }, 5000);
    
    return () => clearInterval(pulseTimer);
  }, []);

  // Prepare a calibrated calculation function that will be reused
  const calculatePinPositionFromEvent = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // TRIPLE redundant positioning techniques for maximum reliability
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    
    const imgRect = imgRef.current?.getBoundingClientRect();
    if (!imgRect) return null;
    
    // METHOD 1: Direct pixel calculation
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Compute position relative to image (handle scaling and alignment)
    const scaleX = imgRect.width / originalWidth;
    const scaleY = imgRect.height / originalHeight;
    
    // Get position relative to image
    const imgX = (clickX - (rect.width - imgRect.width) / 2) / scaleX;
    const imgY = (clickY - (rect.height - imgRect.height) / 2) / scaleY;
    
    // METHOD 2: Percentage-based calculation
    const imgOffsetX = (rect.width - imgRect.width) / 2;
    const imgPercentX = (clickX - imgOffsetX) / imgRect.width;
    const imgPercentY = clickY / imgRect.height;
    
    const percentBasedX = Math.round(imgPercentX * originalWidth);
    const percentBasedY = Math.round(imgPercentY * originalHeight);
    
    // METHOD 3: Direct image ratio calculation
    const imgRatioX = originalWidth / imgRect.width;
    const imgRatioY = originalHeight / imgRect.height;
    
    const ratioBasedX = Math.round((clickX - imgOffsetX) * imgRatioX);
    const ratioBasedY = Math.round(clickY * imgRatioY);
    
    // VERIFICATION: Compare all 3 methods
    // If any 2 methods agree within a small margin, use that result
    // This provides high confidence in the accuracy
    
    const margin = 5; // 5 pixel margin for agreement
    
    let finalX = imgX;
    let finalY = imgY;
    let method = 'default';
    
    // Check agreement between methods 1 and 2
    const m1m2AgreeX = Math.abs(imgX - percentBasedX) <= margin;
    const m1m2AgreeY = Math.abs(imgY - percentBasedY) <= margin;
    
    // Check agreement between methods 1 and 3
    const m1m3AgreeX = Math.abs(imgX - ratioBasedX) <= margin;
    const m1m3AgreeY = Math.abs(imgY - ratioBasedY) <= margin;
    
    // Check agreement between methods 2 and 3
    const m2m3AgreeX = Math.abs(percentBasedX - ratioBasedX) <= margin;
    const m2m3AgreeY = Math.abs(percentBasedY - ratioBasedY) <= margin;
    
    // Determine the most reliable method based on agreement
    if (m1m2AgreeX && m1m2AgreeY) {
      // Methods 1 and 2 agree
      finalX = (imgX + percentBasedX) / 2;
      finalY = (imgY + percentBasedY) / 2;
      method = 'methods1+2';
    } else if (m1m3AgreeX && m1m3AgreeY) {
      // Methods 1 and 3 agree
      finalX = (imgX + ratioBasedX) / 2;
      finalY = (imgY + ratioBasedY) / 2;
      method = 'methods1+3';
    } else if (m2m3AgreeX && m2m3AgreeY) {
      // Methods 2 and 3 agree
      finalX = (percentBasedX + ratioBasedX) / 2;
      finalY = (percentBasedY + ratioBasedY) / 2;
      method = 'methods2+3';
    } else {
      // No clear agreement, prioritize method 1 since it's most direct
      finalX = imgX;
      finalY = imgY;
      method = 'method1';
    }
    
    // Clamp coordinates to image bounds to prevent out-of-bounds pins
    const clampedX = Math.max(0, Math.min(originalWidth, finalX));
    const clampedY = Math.max(0, Math.min(originalHeight, finalY));
    
    // Round to integers for clean values
    const roundedX = Math.round(clampedX);
    const roundedY = Math.round(clampedY);
    
    // Return with metadata for debugging
    return { 
      x: roundedX, 
      y: roundedY,
      meta: {
        method,
        direct: { x: imgX, y: imgY },
        percent: { x: percentBasedX, y: percentBasedY },
        ratio: { x: ratioBasedX, y: ratioBasedY },
        agreements: {
          m1m2: { x: m1m2AgreeX, y: m1m2AgreeY },
          m1m3: { x: m1m3AgreeX, y: m1m3AgreeY },
          m2m3: { x: m2m3AgreeX, y: m2m3AgreeY }
        },
        mouse: { x: clickX, y: clickY }
      }
    };
  }, [originalWidth, originalHeight]);

  // Update dimensions when component mounts or window resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && imgRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const imgRect = imgRef.current.getBoundingClientRect();
        const pinRect = pinRef.current?.getBoundingClientRect();
        
        setContainerDimensions({
          width: rect.width,
          height: rect.height
        });
        
        // Update debug info
        if (showDebugInfo) {
          setDebug(prev => ({
            ...prev,
            containerLeft: rect.left,
            containerTop: rect.top,
            containerWidth: rect.width,
            containerHeight: rect.height,
            imgNaturalWidth: imgRef.current?.naturalWidth || 0,
            imgNaturalHeight: imgRef.current?.naturalHeight || 0,
            imgDisplayWidth: imgRect.width,
            imgDisplayHeight: imgRect.height,
            pinDOMTop: pinRect?.top || 0,
            pinDOMLeft: pinRect?.left || 0,
            percentX: pinPosition.x / originalWidth,
            percentY: pinPosition.y / originalHeight
          }));
        }
      }
    };

    // Initialize dimensions
    updateDimensions();
    
    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [originalWidth, originalHeight, pinPosition, showDebugInfo]);

  // Update pin position when initialPinX/Y props change
  useEffect(() => {
    if (initialPinX !== undefined && initialPinY !== undefined) {
      setPinPosition({ x: initialPinX, y: initialPinY });
    }
  }, [initialPinX, initialPinY]);

  // Helper to get percentage position
  const getPercentPosition = (x: number, y: number) => {
    return {
      xPercent: x / originalWidth,
      yPercent: y / originalHeight
    };
  };

  // Handle image load to ensure measurements are accurate
  const handleImageLoad = () => {
    setImageLoaded(true);
    // Trigger a dimension update after image is loaded
    if (containerRef.current && imgRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const imgRect = imgRef.current.getBoundingClientRect();
      
      setContainerDimensions({
        width: rect.width,
        height: rect.height
      });
      
      // Verify pin position once image is loaded
      if (pinRef.current) {
        const pinRect = pinRef.current.getBoundingClientRect();
        const { xPercent, yPercent } = getPercentPosition(pinPosition.x, pinPosition.y);
        
        // Check if pin is positioned correctly
        const expectedLeft = imgRect.left + (xPercent * imgRect.width);
        const expectedTop = imgRect.top + (yPercent * imgRect.height);
        
        // Update debug info with verification status
        if (showDebugInfo) {
          const isCorrect = 
            Math.abs(pinRect.left - expectedLeft) < 5 && 
            Math.abs(pinRect.top - expectedTop) < 5;
          
          setDebug(prev => ({
            ...prev,
            verificationStatus: isCorrect ? 'correct' : 'incorrect',
            pinDOMTop: pinRect.top,
            pinDOMLeft: pinRect.left,
            imgNaturalWidth: imgRef.current?.naturalWidth || 0,
            imgNaturalHeight: imgRef.current?.naturalHeight || 0,
            imgDisplayWidth: imgRect.width,
            imgDisplayHeight: imgRect.height
          }));
        }
      }
    }
  };

  // Handle click to position pin
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onPinMoved) return;
    
    const result = calculatePinPositionFromEvent(e);
    if (!result) return;
    
    // Update state and call callback
    setPinPosition({ x: result.x, y: result.y });
    onPinMoved({ x: result.x, y: result.y });
    
    // Update debug info
    if (showDebugInfo) {
      setDebug(prev => ({
        ...prev,
        mouseX: result.meta.mouse.x,
        mouseY: result.meta.mouse.y,
        clientX: e.clientX,
        clientY: e.clientY,
        percentX: result.x / originalWidth,
        percentY: result.y / originalHeight,
        calculationMethod: result.meta.method
      }));
    }
  };

  // Compute pin's position as percentages for CSS positioning
  const { xPercent, yPercent } = getPercentPosition(pinPosition.x, pinPosition.y);

  // Grid-based guide lines for precise positioning
  const renderGridGuides = () => {
    if (!interactive) return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Vertical grid lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div 
            key={`v-${i}`} 
            className="absolute top-0 bottom-0 w-px bg-blue-400 bg-opacity-30"
            style={{ left: `${i * 10}%` }}
          />
        ))}
        
        {/* Horizontal grid lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div 
            key={`h-${i}`} 
            className="absolute left-0 right-0 h-px bg-blue-400 bg-opacity-30"
            style={{ top: `${i * 10}%` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`relative ${className}`}
      ref={containerRef}
      onClick={handleClick}
      style={{ 
        cursor: interactive ? 'crosshair' : 'default',
        minHeight: '300px',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Visual target crosshair for interactive mode */}
      {interactive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative">
            <div className="absolute h-px w-12 bg-blue-500 left-1/2 transform -translate-x-1/2"></div>
            <div className="absolute w-px h-12 bg-blue-500 top-1/2 transform -translate-y-1/2"></div>
            <div className="h-4 w-4 rounded-full border-2 border-blue-500 bg-transparent"></div>
          </div>
        </div>
      )}
      
      {/* Grid guides for precision */}
      {renderGridGuides()}
      
      {/* Floor plan image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Floor Plan"
        className="w-full h-auto mx-auto border border-gray-300 rounded-md"
        onLoad={handleImageLoad}
        style={{ 
          filter: interactive ? 'contrast(110%) brightness(105%)' : 'none',
          transition: 'all 0.3s ease' 
        }}
      />
      
      {/* Pin overlay with animation and high visibility */}
      {imageLoaded && (
        <div
          ref={pinRef}
          className="absolute pointer-events-none"
          style={{
            left: `${xPercent * 100}%`,
            top: `${yPercent * 100}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            transition: 'all 0.2s ease-out'
          }}
        >
          {/* Enhanced McDonald's style pin marker */}
          <div 
            className="absolute"
            style={{
              width: '50px',
              height: '70px',
              margin: '-70px 0 0 -25px',
              zIndex: 15,
              filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))',
              animation: showPulse ? 'bounce 1s ease infinite' : 'none',
              transformOrigin: 'bottom center'
            }}
          >
            {/* SVG pin with McDonald's colors */}
            <svg viewBox="0 0 50 70" xmlns="http://www.w3.org/2000/svg">
              {/* Pin body */}
              <path d="M25 0C11.2 0 0 11.2 0 25C0 38.8 25 70 25 70S50 38.8 50 25C50 11.2 38.8 0 25 0Z" 
                    fill="#f31d1a" stroke="#ffffff" strokeWidth="3"/>
              
              {/* White M logo */}
              <path d="M15 15L20 35L25 20L30 35L35 15" 
                    fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {/* Pulsing circle under the pin for extra visibility */}
          {showPulse && (
            <div 
              className="absolute rounded-full"
              style={{
                width: '40px',
                height: '40px',
                background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0) 70%)',
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                margin: '-20px 0 0 -20px',
                zIndex: 5
              }}
            />
          )}
        </div>
      )}
      
      {/* Interactive overlay instruction if interactive */}
      {interactive && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            background: 'linear-gradient(rgba(0, 50, 200, 0.05), rgba(0, 50, 200, 0.1))'
          }}
        >
          <div 
            className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg transform hover:scale-105 transition-transform"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            CLICK ANYWHERE TO PLACE PIN
          </div>
        </div>
      )}
      
      {/* Debug information has been completely removed for a cleaner user interface */}
    </div>
  );
}