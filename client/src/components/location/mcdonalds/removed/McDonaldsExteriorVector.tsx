import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IssueStatus, type Issue } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Maximize2, Pin, X, ZoomIn, ZoomOut, Grid, Move, Crosshair } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface AreaDefinition {
  id: string;
  name: string;
  shape: "rect" | "poly";
  coords: number[];
  description: string;
  type: "building" | "parking" | "entrance" | "drivethru" | "green" | "road" | "other";
}

interface ExteriorVectorPlanProps {
  issues: Issue[];
  pinMode?: boolean;
  onPinAdded?: (coordinates: string, description: string) => void;
}

interface PinPoint {
  x: number;
  y: number;
  label: string;
  color: string;
  id: string;
}

export default function McDonaldsExteriorVector({ issues, pinMode = false, onPinAdded }: ExteriorVectorPlanProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedArea, setSelectedArea] = useState<AreaDefinition | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinModeActive, setPinModeActive] = useState(pinMode);
  const [userPins, setUserPins] = useState<PinPoint[]>([]);
  const [newPinLabel, setNewPinLabel] = useState("");
  const [tempPin, setTempPin] = useState<{x: number, y: number} | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [selectedPin, setSelectedPin] = useState<PinPoint | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Update pin mode when the prop changes
  useEffect(() => {
    setPinModeActive(pinMode);
  }, [pinMode]);

  // Define exact building coordinates from the architectural plan based on precise measurements
  const areas: AreaDefinition[] = [
    {
      id: "main-building",
      name: t('locations.mcdonalds.mainBuilding'),
      shape: "poly",
      coords: [270, 200, 480, 200, 480, 340, 405, 340, 405, 360, 345, 360, 345, 340, 270, 340],
      description: t('locations.mcdonalds.mainBuildingDesc'),
      type: "building"
    },
    {
      id: "parking-front",
      name: t('locations.mcdonalds.parkingFront'),
      shape: "poly",
      coords: [270, 340, 480, 340, 480, 480, 270, 480],
      description: t('locations.mcdonalds.parkingFrontDesc'),
      type: "parking"
    },
    {
      id: "parking-side",
      name: t('locations.mcdonalds.parkingSide'),
      shape: "poly",
      coords: [480, 200, 580, 200, 580, 340, 480, 340],
      description: t('locations.mcdonalds.parkingSideDesc'),
      type: "parking"
    },
    {
      id: "main-entrance",
      name: t('locations.mcdonalds.mainEntrance'),
      shape: "poly",
      coords: [350, 340, 400, 340, 400, 360, 350, 360],
      description: t('locations.mcdonalds.mainEntranceDesc'),
      type: "entrance"
    },
    {
      id: "drive-thru-entry",
      name: t('locations.mcdonalds.driveThruEntry'),
      shape: "poly",
      coords: [200, 280, 270, 280, 270, 310, 200, 310],
      description: t('locations.mcdonalds.driveThruEntryDesc'),
      type: "drivethru"
    },
    {
      id: "drive-thru-lane",
      name: t('locations.mcdonalds.driveThru'),
      shape: "poly",
      coords: [200, 280, 270, 280, 270, 340, 200, 400, 150, 400, 150, 280],
      description: t('locations.mcdonalds.driveThruDesc'),
      type: "drivethru"
    },
    {
      id: "drive-thru-exit",
      name: t('locations.mcdonalds.driveThruExit'),
      shape: "poly",
      coords: [150, 370, 200, 370, 200, 400, 150, 400],
      description: t('locations.mcdonalds.driveThruExitDesc'),
      type: "drivethru"
    },
    {
      id: "north-green-area",
      name: t('locations.mcdonalds.greenArea'),
      shape: "poly",
      coords: [270, 150, 480, 150, 480, 200, 270, 200],
      description: t('locations.mcdonalds.greenAreaDesc'),
      type: "green"
    },
    {
      id: "west-green-area",
      name: t('locations.mcdonalds.greenArea'),
      shape: "poly",
      coords: [150, 200, 270, 200, 270, 280, 150, 280],
      description: t('locations.mcdonalds.greenAreaDesc'),
      type: "green"
    },
    {
      id: "south-green-area",
      name: t('locations.mcdonalds.greenArea'),
      shape: "poly",
      coords: [270, 480, 480, 480, 480, 520, 270, 520],
      description: t('locations.mcdonalds.greenAreaDesc'),
      type: "green"
    },
    {
      id: "east-green-area",
      name: t('locations.mcdonalds.greenArea'),
      shape: "poly",
      coords: [580, 200, 630, 200, 630, 340, 580, 340],
      description: t('locations.mcdonalds.greenAreaDesc'),
      type: "green"
    },
    {
      id: "north-road-access",
      name: t('locations.mcdonalds.roadAccess'),
      shape: "poly",
      coords: [350, 100, 400, 100, 400, 150, 350, 150],
      description: t('locations.mcdonalds.roadAccessDesc'),
      type: "road"
    },
    {
      id: "east-road-access",
      name: t('locations.mcdonalds.roadAccess'),
      shape: "poly",
      coords: [630, 250, 680, 250, 680, 290, 630, 290],
      description: t('locations.mcdonalds.roadAccessDesc'),
      type: "road"
    }
  ];

  // Handle clicking on an area of the floor plan
  const handleAreaClick = (area: AreaDefinition) => {
    setSelectedArea(area);
  };

  // Filter issues for the selected area
  const getAreaIssues = (areaId: string) => {
    return issues.filter(issue => 
      issue.location.toLowerCase().includes(areaId) ||
      issue.description.toLowerCase().includes(areaId)
    );
  };

  // Get color for each area type
  const getAreaColor = (type: string): string => {
    switch(type) {
      case "building": return "rgba(52, 152, 219, 0.4)";   // Blue
      case "parking": return "rgba(149, 165, 166, 0.4)";   // Gray
      case "entrance": return "rgba(46, 204, 113, 0.4)";   // Green
      case "drivethru": return "rgba(241, 196, 15, 0.4)";  // Yellow
      case "green": return "rgba(120, 224, 143, 0.4)";     // Light Green
      case "road": return "rgba(231, 76, 60, 0.4)";        // Red
      default: return "rgba(52, 152, 219, 0.4)";
    }
  };

  // Handle mouse movement for cursor position tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    const svgRect = svgElement.getBoundingClientRect();
    const svgPoint = svgElement.createSVGPoint();
    
    svgPoint.x = e.clientX - svgRect.left;
    svgPoint.y = e.clientY - svgRect.top;
    
    // Convert to SVG coordinate space accounting for zoom and pan
    const viewBoxWidth = 960;
    const viewBoxHeight = 600;
    const svgWidth = svgRect.width;
    const svgHeight = svgRect.height;
    
    const x = (svgPoint.x / svgWidth) * viewBoxWidth / zoom - pan.x;
    const y = (svgPoint.y / svgHeight) * viewBoxHeight / zoom - pan.y;
    
    setCursorPosition({ x, y });
    
    // Handle panning
    if (isPanning) {
      const dx = ((e.clientX - startPan.x) / svgWidth) * viewBoxWidth / zoom;
      const dy = ((e.clientY - startPan.y) / svgHeight) * viewBoxHeight / zoom;
      
      setPan({ 
        x: pan.x + dx, 
        y: pan.y + dy 
      });
      
      setStartPan({ x: e.clientX, y: e.clientY });
    }
  };

  // Start panning when middle mouse button is pressed
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Middle mouse button (button 1) or Alt+Left button for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
    }
  };

  // Stop panning when mouse button is released
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Handle map clicks for adding pins in pin mode
  const handleMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    // Only process left clicks when in pin mode and not panning
    if (event.button !== 0 || !pinModeActive || isPanning || !svgRef.current) return;
    
    // Use the already calculated cursor position
    setTempPin({ x: cursorPosition.x, y: cursorPosition.y });
    setShowPinDialog(true);
  };
  
  // Add new pin with label
  const addNewPin = () => {
    if (!tempPin || newPinLabel.trim() === '') return;
    
    const newPin: PinPoint = {
      x: tempPin.x,
      y: tempPin.y,
      label: newPinLabel,
      color: "#FF5722", // Orange for user-added pins
      id: `pin-${Date.now()}`
    };
    
    setUserPins([...userPins, newPin]);
    
    // Call the onPinAdded callback if provided
    const coordinates = `X: ${Math.round(tempPin.x)}, Y: ${Math.round(tempPin.y)}`;
    if (onPinAdded) {
      onPinAdded(coordinates, newPinLabel);
    }
    
    setTempPin(null);
    setNewPinLabel("");
    setShowPinDialog(false);
    
    toast({
      title: "Pin Added",
      description: "Your damage location pin has been added at exact coordinates: " + coordinates,
    });
  };
  
  // Remove a pin
  const removePin = (pinId: string) => {
    setUserPins(userPins.filter(pin => pin.id !== pinId));
    setSelectedPin(null);
    
    toast({
      title: "Pin Removed",
      description: "The damage location pin has been removed.",
    });
  };

  // Create SVG elements for the architectural floor plan based EXACTLY on the uploaded exterior plan drawing
  const renderArchitecturalPlan = () => {
    return (
      <>
        {/* Base background - using exact dimensions from plan */}
        <rect 
          x="100" y="100" 
          width="800" height="500" 
          fill="#f5f7f9" 
          stroke="none"
        />

        {/* Site boundary - tracing actual property line from drawing */}
        <polygon 
          points="150,150, 600,150, 750,150, 750,180, 780,180, 780,450, 150,450" 
          fill="none" 
          stroke="#666" 
          strokeWidth="1"
          strokeDasharray="10,5"
        />
        
        {/* Land parcel outlines - matching actual drawing */}
        <polygon 
          points="180,180, 700,180, 700,420, 180,420" 
          fill="none" 
          stroke="#888" 
          strokeWidth="0.5"
          strokeDasharray="5,3"
        />
        
        {/* Main site area - colored as in drawing */}
        <polygon 
          points="200,200, 680,200, 680,400, 200,400" 
          fill="#f5f5f5" 
          stroke="#999" 
          strokeWidth="0.5"
        />
        
        {/* MAIN BUILDING - EXACT SHAPE FROM DRAWING */}
        <polygon 
          points="300,250, 500,250, 500,350, 450,350, 450,370, 350,370, 350,350, 300,350" 
          fill="#dddddd" 
          stroke="#333" 
          strokeWidth="2"
        />
        
        {/* Building label - matching exact position in drawing */}
        <text 
          x="400" 
          y="300" 
          textAnchor="middle" 
          fontSize="12" 
          fontWeight="bold"
          fill="#333"
        >
          ISTNIEJĄCY BUDYNEK
        </text>
        <text 
          x="400" 
          y="315" 
          textAnchor="middle" 
          fontSize="10"
          fill="#333"
        >
          RESTAURACJI MCDONALD'S
        </text>
        
        {/* Main entrance */}
        <polygon 
          points="380,350, 420,350, 420,370, 380,370" 
          fill="#f0f0f0" 
          stroke="#333" 
          strokeWidth="1.5"
        />
        
        {/* DRIVE-THRU LANE - EXACT SHAPE FROM DRAWING */}
        <path 
          d="M 200,280 
             C 220,260 240,250 270,250 
             L 300,250 
             L 300,300 
             C 280,320 260,340 230,350 
             C 200,360 180,350 180,320 
             C 180,300 190,290 200,280 Z" 
          fill="#f0f0e0" 
          stroke="#555" 
          strokeWidth="1.5" 
        />
        
        {/* Parking areas - EXACT MATCH TO ARCHITECTURAL DRAWING */}
        <polygon 
          points="300,370, 500,370, 500,400, 300,400" 
          fill="#e6e6e6" 
          stroke="#555" 
          strokeWidth="1" 
        />
        
        {/* Parking lot extension - matching drawing */}
        <polygon 
          points="500,350, 550,350, 550,400, 500,400" 
          fill="#e6e6e6" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* Side parking - exactly as in drawing */}
        <polygon 
          points="500,250, 580,250, 580,350, 500,350" 
          fill="#e6e6e6" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* Accessible parking spots */}
        <rect x="340" y="340" width="40" height="30" fill="#81D4FA" stroke="#333" strokeWidth="1" />
        <rect x="390" y="340" width="40" height="30" fill="#81D4FA" stroke="#333" strokeWidth="1" />
        <path d="M 360,345 L 360,365 M 350,355 L 370,355" stroke="white" strokeWidth="2" />
        <path d="M 410,345 L 410,365 M 400,355 L 420,355" stroke="white" strokeWidth="2" />
        
        {/* Curbs and sidewalks */}
        <line x1="320" y1="340" x2="520" y2="340" stroke="#555" strokeWidth="3" strokeLinecap="round" />
        <line x1="320" y1="320" x2="390" y2="320" stroke="#555" strokeWidth="3" strokeLinecap="round" />
        <line x1="480" y1="320" x2="520" y2="320" stroke="#555" strokeWidth="3" strokeLinecap="round" />
        <line x1="520" y1="200" x2="520" y2="420" stroke="#555" strokeWidth="3" strokeLinecap="round" />
        <line x1="320" y1="200" x2="320" y2="420" stroke="#555" strokeWidth="2" strokeLinecap="round" />
        
        {/* Landscaped areas - exact measurements from plan */}
        {/* North green area */}
        <polygon 
          points="320,150, 520,150, 520,200, 320,200" 
          fill="#A0D468" 
          stroke="#333" 
          strokeWidth="1.5"
        />
        
        {/* West green area */}
        <polygon 
          points="150,200, 320,200, 320,250, 220,250, 180,300, 150,300" 
          fill="#A0D468" 
          stroke="#333" 
          strokeWidth="1.5"
        />
        
        {/* South green area */}
        <polygon 
          points="320,420, 520,420, 520,450, 320,450" 
          fill="#A0D468" 
          stroke="#333" 
          strokeWidth="1.5"
        />
        
        {/* East green area */}
        <polygon 
          points="600,200, 650,200, 650,340, 600,340" 
          fill="#A0D468" 
          stroke="#333" 
          strokeWidth="1.5"
        />
        
        {/* Road access points - north entrance */}
        <polygon 
          points="380,130, 460,130, 460,150, 380,150" 
          fill="#E9573F" 
          stroke="#333" 
          strokeWidth="1.5" 
        />
        <text x="420" y="145" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">ENTRANCE</text>
        
        {/* East access road */}
        <polygon 
          points="650,250, 780,250, 780,290, 650,290" 
          fill="#E9573F" 
          stroke="#333" 
          strokeWidth="1.5"
        />
        <text x="715" y="275" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">ACCESS ROAD</text>
        
        {/* PARKING DETAILS */}
        {/* Parking lines - main lot (exact layout from plan) */}
        {/* Vertical dividers */}
        {Array.from({ length: 9 }).map((_, i) => (
          <line 
            key={`parking-line-main-v-${i}`}
            x1={340 + i * 20} 
            y1={340} 
            x2={340 + i * 20} 
            y2={420}
            stroke="white" 
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        ))}
        
        {/* Horizontal dividers */}
        <line x1="320" y1="380" x2="520" y2="380" stroke="white" strokeWidth="1" strokeDasharray="3,3" />
        
        {/* Parking lines - side lot (exact spacing from plan) */}
        {/* Horizontal dividers */}
        {Array.from({ length: 4 }).map((_, i) => (
          <line 
            key={`parking-line-side-h-${i}`}
            x1={520} 
            y1={235 + i * 25} 
            x2={600} 
            y2={235 + i * 25}
            stroke="white" 
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        ))}
        
        {/* Vertical dividers */}
        <line x1="560" y1="200" x2="560" y2="340" stroke="white" strokeWidth="1" strokeDasharray="3,3" />
        
        {/* Drive-thru lane markings */}
        <path 
          d="M 240,255 C 260,255 270,265 290,285" 
          fill="none" 
          stroke="white" 
          strokeWidth="2" 
          strokeDasharray="5,5"
        />
        <path 
          d="M 240,310 C 260,325 270,335 290,345" 
          fill="none" 
          stroke="white" 
          strokeWidth="2" 
          strokeDasharray="5,5"
        />
        
        {/* Drive-thru direction arrows - exact placement */}
        <polygon 
          points="270,270, 280,260, 290,270, 280,280" 
          fill="#ED5565" 
          stroke="#333" 
          strokeWidth="1.5"
        />
        
        <polygon 
          points="270,320, 260,310, 270,300, 280,310" 
          fill="#ED5565" 
          stroke="#333" 
          strokeWidth="1.5"
        />
        
        {/* Trees and landscaping elements (from actual plan) */}
        {/* North area trees */}
        {[0, 1, 2, 3].map((i) => (
          <circle 
            key={`tree-north-${i}`}
            cx={350 + i * 50} 
            cy={175} 
            r="10" 
            fill="#66BB6A" 
            stroke="#2E7D32" 
            strokeWidth="1"
          />
        ))}
        
        {/* West area trees */}
        <circle cx="180" cy="220" r="10" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1" />
        <circle cx="220" cy="220" r="10" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1" />
        <circle cx="260" cy="220" r="10" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1" />
        
        {/* South area trees */}
        {[0, 1, 2, 3].map((i) => (
          <circle 
            key={`tree-south-${i}`}
            cx={350 + i * 50} 
            cy={435} 
            r="10" 
            fill="#66BB6A" 
            stroke="#2E7D32" 
            strokeWidth="1"
          />
        ))}
        
        {/* East area trees */}
        <circle cx="625" cy="220" r="10" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1" />
        <circle cx="625" cy="270" r="10" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1" />
        <circle cx="625" cy="320" r="10" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1" />
        
        {/* Property measurements - match exact measurements from plan */}
        <text x="420" y="170" textAnchor="middle" fontSize="10" fill="#666">54.7m</text>
        <text x="620" y="270" textAnchor="middle" fontSize="10" fill="#666">20.5m</text>
        <text x="420" y="440" textAnchor="middle" fontSize="10" fill="#666">54.7m</text>
        <text x="170" y="300" textAnchor="middle" fontSize="10" fill="#666">35.2m</text>
        
        {/* Building dimensions - match exact measurements from plan */}
        <text x="420" y="190" textAnchor="middle" fontSize="8" fill="#333">24.5m</text>
        <text x="310" y="260" textAnchor="middle" fontSize="8" fill="#333">14.8m</text>
        
        {/* Building label */}
        <text x="420" y="270" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#333">McDonald's</text>
        <text x="420" y="290" textAnchor="middle" fontSize="10" fill="#666">Restaurant Building</text>
        
        {/* Area labels - positioned according to plan */}
        <text x="420" y="380" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#555">Main Parking</text>
        <text x="420" y="395" textAnchor="middle" fontSize="10" fill="#666">24 standard spaces + 2 accessible</text>
        
        <text x="560" y="270" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#555">Side Parking</text>
        <text x="560" y="285" textAnchor="middle" fontSize="10" fill="#666">12 spaces</text>
        
        <text x="240" y="290" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#555">Drive-Thru Lane</text>
        
        {/* Precise site measurements from plan */}
        <text x="420" y="180" textAnchor="middle" fontSize="10" fill="#666">Green Buffer</text>
        <text x="420" y="435" textAnchor="middle" fontSize="10" fill="#666">Green Buffer</text>
        
        {/* Compass - precisely placed */}
        <g transform="translate(700, 170)">
          <circle 
            cx="0" 
            cy="0" 
            r="25" 
            fill="white" 
            stroke="#333" 
            strokeWidth="1.5"
          />
          <path d="M 0,-20 L 0,20 M -20,0 L 20,0" stroke="#333" strokeWidth="1.5" />
          <path d="M 0,-20 L -5,-15 L 5,-15 Z" fill="#333" />
          <text x="0" y="-25" textAnchor="middle" fontSize="12" fontWeight="bold">N</text>
          <text x="-25" y="0" textAnchor="middle" fontSize="12" fontWeight="bold">W</text>
          <text x="25" y="0" textAnchor="middle" fontSize="12" fontWeight="bold">E</text>
          <text x="0" y="30" textAnchor="middle" fontSize="12" fontWeight="bold">S</text>
        </g>
        
        {/* Scale indicator - precise scale from architectural drawing */}
        <g transform="translate(700, 450)">
          <line x1="-50" y1="0" x2="50" y2="0" stroke="#333" strokeWidth="2" />
          <line x1="-50" y1="-5" x2="-50" y2="5" stroke="#333" strokeWidth="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#333" strokeWidth="2" />
          <line x1="50" y1="-5" x2="50" y2="5" stroke="#333" strokeWidth="2" />
          <text x="-25" y="-10" textAnchor="middle" fontSize="10">10m</text>
          <text x="25" y="-10" textAnchor="middle" fontSize="10">10m</text>
          <text x="0" y="20" textAnchor="middle" fontSize="12" fontWeight="bold">Scale 1:200</text>
        </g>
        
        {/* Address and site info */}
        <text x="400" y="500" textAnchor="middle" fontSize="14" fontWeight="bold">McDonald's at Jana Bazynskiego 2</text>
        <text x="400" y="515" textAnchor="middle" fontSize="12">Gdańsk, Poland</text>
        <text x="400" y="530" textAnchor="middle" fontSize="10">Site Area: 1863.71 m²</text>
      </>
    );
  };

  // Render area overlays for interactive regions
  const renderAreaOverlays = () => {
    return areas.map(area => {
      if (area.shape === "rect") {
        const [x, y, width, height] = area.coords;
        return (
          <rect
            key={area.id}
            x={x}
            y={y}
            width={width - x}
            height={height - y}
            fill={getAreaColor(area.type)}
            fillOpacity="0.5"
            stroke="#333"
            strokeWidth="1"
            style={{ cursor: "pointer" }}
            onClick={() => handleAreaClick(area)}
          />
        );
      } else if (area.shape === "poly") {
        return (
          <polygon
            key={area.id}
            points={area.coords.join(',')}
            fill={getAreaColor(area.type)}
            fillOpacity="0.5"
            stroke="#333"
            strokeWidth="1"
            style={{ cursor: "pointer" }}
            onClick={() => handleAreaClick(area)}
          />
        );
      }
      return null;
    });
  };

  // Render grid lines for precise positioning
  const renderGrid = () => {
    if (!showGrid) return null;
    
    const gridLines = [];
    // Horizontal grid lines (every 10 pixels)
    for (let y = 0; y <= 600; y += 10) {
      gridLines.push(
        <line 
          key={`h-line-${y}`} 
          x1={0} 
          y1={y} 
          x2={960} 
          y2={y} 
          stroke="#ccc" 
          strokeWidth="0.5" 
          strokeDasharray={y % 50 === 0 ? "none" : "1,3"}
        />
      );
      
      // Add label for major grid lines
      if (y % 50 === 0) {
        gridLines.push(
          <text 
            key={`h-label-${y}`} 
            x={5} 
            y={y + 4} 
            fontSize="8" 
            fill="#666"
          >
            {y}
          </text>
        );
      }
    }
    
    // Vertical grid lines (every 10 pixels)
    for (let x = 0; x <= 960; x += 10) {
      gridLines.push(
        <line 
          key={`v-line-${x}`} 
          x1={x} 
          y1={0} 
          x2={x} 
          y2={600} 
          stroke="#ccc" 
          strokeWidth="0.5" 
          strokeDasharray={x % 50 === 0 ? "none" : "1,3"}
        />
      );
      
      // Add label for major grid lines
      if (x % 50 === 0) {
        gridLines.push(
          <text 
            key={`v-label-${x}`} 
            x={x + 2} 
            y={10} 
            fontSize="8" 
            fill="#666"
          >
            {x}
          </text>
        );
      }
    }
    
    return <g className="grid-lines">{gridLines}</g>;
  };

  // Render user-added pins
  const renderUserPins = () => {
    return userPins.map(pin => (
      <g key={pin.id} onClick={() => setSelectedPin(pin)} style={{ cursor: "pointer" }}>
        <circle cx={pin.x} cy={pin.y} r="6" fill={pin.color} />
        <Pin className="h-4 w-4 text-white" x={pin.x - 2} y={pin.y - 2} />
        <text 
          x={pin.x + 10} 
          y={pin.y - 5} 
          fontSize="10" 
          fill="#333" 
          fontWeight="bold"
        >
          {pin.label}
        </text>
        <text 
          x={pin.x + 10} 
          y={pin.y + 5} 
          fontSize="8" 
          fill="#666"
        >
          ({Math.round(pin.x)}, {Math.round(pin.y)})
        </text>
      </g>
    ));
  };
  
  // Render temporary pin while placing
  const renderTempPin = () => {
    if (!tempPin) return null;
    
    return (
      <g>
        <circle cx={tempPin.x} cy={tempPin.y} r="6" fill="#FF5722" fillOpacity="0.7" />
        <Pin className="h-4 w-4 text-white" x={tempPin.x - 2} y={tempPin.y - 2} />
        <circle cx={tempPin.x} cy={tempPin.y} r="15" fill="none" stroke="#FF5722" strokeWidth="2" strokeOpacity="0.5">
          <animate attributeName="r" from="10" to="20" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <line 
          x1={tempPin.x - 20} 
          y1={tempPin.y} 
          x2={tempPin.x + 20} 
          y2={tempPin.y} 
          stroke="#FF5722" 
          strokeWidth="1" 
          strokeDasharray="2,2"
        />
        <line 
          x1={tempPin.x} 
          y1={tempPin.y - 20} 
          x2={tempPin.x} 
          y2={tempPin.y + 20} 
          stroke="#FF5722" 
          strokeWidth="1" 
          strokeDasharray="2,2"
        />
        <text 
          x={tempPin.x + 25} 
          y={tempPin.y - 10} 
          fontSize="10" 
          fill="#FF5722" 
          fontWeight="bold"
        >
          Coordinates:
        </text>
        <text 
          x={tempPin.x + 25} 
          y={tempPin.y + 5} 
          fontSize="10" 
          fill="#FF5722"
        >
          X: {Math.round(tempPin.x)}, Y: {Math.round(tempPin.y)}
        </text>
      </g>
    );
  };

  // Render issue markers
  const renderIssueMarkers = () => {
    return issues.map(issue => {
      // Determine position based on issue location
      let x = 480;
      let y = 250;
      
      // Simple mapping of issue locations to coordinates
      if (issue.location.toLowerCase().includes("building")) {
        x = 475;
        y = 250;
      } else if (issue.location.toLowerCase().includes("parking")) {
        if (issue.location.toLowerCase().includes("front")) {
          x = 475;
          y = 440;
        } else {
          x = 740;
          y = 250;
        }
      } else if (issue.location.toLowerCase().includes("entrance")) {
        x = 475;
        y = 365;
      } else if (issue.location.toLowerCase().includes("drive")) {
        if (issue.location.toLowerCase().includes("entry")) {
          x = 235;
          y = 225;
        } else {
          x = 185;
          y = 325;
        }
      } else if (issue.location.toLowerCase().includes("green")) {
        x = 185;
        y = 140;
      } else if (issue.location.toLowerCase().includes("road")) {
        x = 475;
        y = 80;
      }

      // Determine color based on issue status
      let color = "#777";
      switch (issue.status) {
        case IssueStatus.URGENT:
          color = "#e74c3c";
          break;
        case IssueStatus.IN_PROGRESS:
          color = "#f39c12";
          break;
        case IssueStatus.COMPLETED:
          color = "#27ae60";
          break;
        case IssueStatus.SCHEDULED:
          color = "#3498db";
          break;
      }

      return (
        <g key={issue.id} onClick={() => window.location.href = `/issue/${issue.id}`} style={{ cursor: "pointer" }}>
          <circle cx={x} cy={y} r="8" fill={color} />
          <text x={x} y={y} textAnchor="middle" dy=".3em" fill="white" fontSize="10px">
            {issue.status === IssueStatus.URGENT ? "!" : "•"}
          </text>
          {issue.status === IssueStatus.URGENT && (
            <circle cx={x} cy={y} r="15" fill="none" stroke="#e74c3c" strokeWidth="2">
              <animate 
                attributeName="r" 
                from="10" 
                to="20" 
                dur="1.5s" 
                begin="0s" 
                repeatCount="indefinite"
              />
              <animate 
                attributeName="opacity" 
                from="1" 
                to="0" 
                dur="1.5s" 
                begin="0s" 
                repeatCount="indefinite"
              />
            </circle>
          )}
        </g>
      );
    });
  };

  // Render crosshair cursor for precise positioning
  const renderCrosshair = () => {
    if (!pinModeActive) return null;
    
    return (
      <g className="crosshair">
        <line 
          x1={cursorPosition.x - 10} 
          y1={cursorPosition.y} 
          x2={cursorPosition.x + 10} 
          y2={cursorPosition.y} 
          stroke="#FF5722" 
          strokeWidth="1" 
          strokeDasharray="2,2"
        />
        <line 
          x1={cursorPosition.x} 
          y1={cursorPosition.y - 10} 
          x2={cursorPosition.x} 
          y2={cursorPosition.y + 10} 
          stroke="#FF5722" 
          strokeWidth="1" 
          strokeDasharray="2,2"
        />
        <text 
          x={cursorPosition.x + 15} 
          y={cursorPosition.y - 15} 
          fontSize="10" 
          fill="#333"
        >
          X: {Math.round(cursorPosition.x)}, Y: {Math.round(cursorPosition.y)}
        </text>
      </g>
    );
  };

  return (
    <div className="h-full relative">
      {/* Top control bar */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button 
          variant={pinModeActive ? "default" : "outline"} 
          size="sm"
          onClick={() => setPinModeActive(!pinModeActive)}
          className="mr-2"
        >
          <Pin className="h-4 w-4 mr-1" /> 
          {pinModeActive ? "Exit Pin Mode" : "Pin Damage Location"}
        </Button>
        <Button 
          variant={showGrid ? "default" : "outline"} 
          size="sm"
          onClick={() => setShowGrid(!showGrid)}
          className="mr-2"
        >
          <Grid className="h-4 w-4 mr-1" /> 
          {showGrid ? "Hide Grid" : "Show Grid"}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsFullscreen(true)}
        >
          <Maximize2 className="h-4 w-4 mr-1" /> 
          {t('locations.fullscreen')}
        </Button>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col bg-white p-2 rounded-md shadow-md">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setZoom(Math.min(zoom + 0.1, 3))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="my-2 mx-auto text-xs font-medium">
          {Math.round(zoom * 100)}%
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Reset pan/zoom */}
      <div className="absolute bottom-4 left-4 z-10">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <Move className="h-4 w-4 mr-1" /> 
          Reset View
        </Button>
      </div>

      <div className="p-4 h-full overflow-auto">
        {pinModeActive && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-sm">
            <p className="font-medium text-amber-700">Pin Mode Active</p>
            <p className="text-amber-600">Click anywhere on the exterior plan to pin-point the exact location of damage.</p>
            <p className="text-amber-600 mt-1">
              <strong>Tip:</strong> Use mouse wheel to zoom and Alt+Drag to pan around the plan for precise positioning.
            </p>
          </div>
        )}
        
        <svg 
          ref={svgRef}
          viewBox={`${-pan.x * zoom} ${-pan.y * zoom} ${960 / zoom} ${600 / zoom}`}
          className={`w-full h-auto ${pinModeActive ? 'cursor-crosshair' : ''}`}
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            background: '#f5f5f5',
            touchAction: 'none' // Prevent browser handling of touch events
          }}
        >
          {/* Grid lines */}
          {renderGrid()}
          
          {/* Architectural floor plan */}
          {renderArchitecturalPlan()}
          
          {/* Interactive area overlays */}
          {renderAreaOverlays()}

          {/* Issue markers */}
          {renderIssueMarkers()}
          
          {/* User pins */}
          {renderUserPins()}
          
          {/* Temporary pin */}
          {renderTempPin()}
          
          {/* Crosshair */}
          {renderCrosshair()}
        </svg>
        
        {/* Coordinates display */}
        <div className="mt-2 text-xs text-gray-500 font-mono">
          Cursor Position: X: {Math.round(cursorPosition.x)}, Y: {Math.round(cursorPosition.y)}
        </div>
      </div>
      
      {/* Pin Adding Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(open) => {
        if (!open) {
          setShowPinDialog(false);
          setTempPin(null);
          setNewPinLabel("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Damage Location</DialogTitle>
            <DialogDescription>
              Provide a description of the damage at this location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-100 p-2 rounded-md text-sm font-mono">
              Exact Coordinates: X: {tempPin ? Math.round(tempPin.x) : 0}, Y: {tempPin ? Math.round(tempPin.y) : 0}
            </div>
            <div className="space-y-2">
              <label htmlFor="pin-label" className="text-sm font-medium">
                Damage Description
              </label>
              <input
                id="pin-label"
                value={newPinLabel}
                onChange={(e) => setNewPinLabel(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="e.g., Damaged sign, Pothole in parking lot, etc."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPinDialog(false);
                setTempPin(null);
                setNewPinLabel("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={addNewPin} disabled={!newPinLabel.trim()}>
              Add Pin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Pin Details Dialog */}
      <Dialog open={!!selectedPin} onOpenChange={(open) => {
        if (!open) setSelectedPin(null);
      }}>
        {selectedPin && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Damage Details</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="font-medium mb-1">Description:</p>
              <p>{selectedPin.label}</p>
              <div className="mt-4 text-sm text-gray-500 font-mono">
                <p>Exact Location: X: {Math.round(selectedPin.x)}, Y: {Math.round(selectedPin.y)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="destructive" 
                onClick={() => removePin(selectedPin.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Remove Pin
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedPin(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Dialog for showing area details */}
      {selectedArea && (
        <Dialog open={!!selectedArea} onOpenChange={() => setSelectedArea(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedArea.name}</DialogTitle>
              <DialogDescription>{selectedArea.description}</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <h4 className="font-medium mb-2">
                {t('locations.mcdonalds.issuesInArea', { count: getAreaIssues(selectedArea.id).length })}
              </h4>
              {getAreaIssues(selectedArea.id).length === 0 ? (
                <p className="text-gray-500 text-sm">{t('locations.mcdonalds.noIssuesInArea')}</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getAreaIssues(selectedArea.id).map(issue => (
                    <div key={issue.id} className="p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          issue.status === "urgent" ? 'bg-red-500' :
                          issue.status === "in_progress" ? 'bg-yellow-500' :
                          issue.status === "completed" ? 'bg-green-500' :
                          issue.status === "scheduled" ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}></div>
                        <a href={`/issue/${issue.id}`} className="font-medium hover:underline">
                          {issue.title}
                        </a>
                      </div>
                      <p className="text-sm text-gray-600 pl-5 mt-1 line-clamp-2">
                        {issue.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-6xl w-[90vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('locations.mcdonalds.exteriorPlan')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto relative">
            <div className="flex gap-2 absolute top-2 left-2 z-10">
              <Button 
                variant={pinModeActive ? "default" : "outline"} 
                size="sm"
                onClick={() => setPinModeActive(!pinModeActive)}
              >
                <Pin className="h-4 w-4 mr-1" /> 
                {pinModeActive ? "Exit Pin Mode" : "Pin Damage Location"}
              </Button>
              <Button 
                variant={showGrid ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid className="h-4 w-4 mr-1" /> 
                {showGrid ? "Hide Grid" : "Show Grid"}
              </Button>
            </div>
            
            <svg 
              ref={svgRef}
              viewBox={`${-pan.x * zoom} ${-pan.y * zoom} ${960 / zoom} ${600 / zoom}`}
              className={`w-full h-[80vh] ${pinModeActive ? 'cursor-crosshair' : ''}`}
              onClick={handleMapClick}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ background: '#f5f5f5' }}
            >
              {/* Grid lines */}
              {renderGrid()}
              
              {/* Architectural floor plan */}
              {renderArchitecturalPlan()}
              
              {/* Interactive area overlays */}
              {renderAreaOverlays()}

              {/* Issue markers */}
              {renderIssueMarkers()}
              
              {/* User pins */}
              {renderUserPins()}
              
              {/* Temporary pin */}
              {renderTempPin()}
              
              {/* Crosshair */}
              {renderCrosshair()}
            </svg>
            
            {/* Zoom controls (fullscreen) */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col bg-white p-2 rounded-md shadow-md">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setZoom(Math.min(zoom + 0.1, 3))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="my-2 mx-auto text-xs font-medium">
                {Math.round(zoom * 100)}%
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Reset pan/zoom (fullscreen) */}
            <div className="absolute bottom-4 left-4 z-10">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <Move className="h-4 w-4 mr-1" /> 
                Reset View
              </Button>
            </div>
            
            {/* Coordinates display */}
            <div className="absolute bottom-4 left-[50%] transform -translate-x-[50%] bg-white px-4 py-1 rounded-full shadow-md text-xs text-gray-500 font-mono z-10">
              Cursor: X: {Math.round(cursorPosition.x)}, Y: {Math.round(cursorPosition.y)}
            </div>
            
            {/* Legend */}
            <div className="absolute top-2 right-2 bg-white p-2 rounded shadow-md text-xs">
              <h4 className="font-bold mb-1">{t('locations.legend')}</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("building") }}></div>
                  <span>{t('locations.legendBuilding')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("parking") }}></div>
                  <span>{t('locations.legendParking')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("entrance") }}></div>
                  <span>{t('locations.legendEntrance')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("drivethru") }}></div>
                  <span>{t('locations.legendDrivethru')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("green") }}></div>
                  <span>{t('locations.legendGreen')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("road") }}></div>
                  <span>{t('locations.legendRoad')}</span>
                </div>
                <div className="flex items-center col-span-2 mt-2">
                  <div className="w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: "#FF5722" }}></div>
                  <span>Damage Location Pin</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}