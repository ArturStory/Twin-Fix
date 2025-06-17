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
  type: "dining" | "kitchen" | "counter" | "bathroom" | "office" | "storage" | "entrance";
}

interface InteriorVectorPlanProps {
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

export default function McDonaldsInteriorVector({ issues, pinMode = false, onPinAdded }: InteriorVectorPlanProps) {
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

  // Define exact areas from the architectural floor plan based on precise measurements
  const areas: AreaDefinition[] = [
    {
      id: "main-dining-area",
      name: t('locations.mcdonalds.diningAreaMain'),
      shape: "poly",
      coords: [250, 150, 450, 150, 450, 380, 250, 380],
      description: t('locations.mcdonalds.diningAreaMainDesc'),
      type: "dining"
    },
    {
      id: "window-dining-area",
      name: t('locations.mcdonalds.diningWindow'),
      shape: "poly",
      coords: [450, 150, 650, 150, 650, 300, 450, 300],
      description: t('locations.mcdonalds.diningWindowDesc'),
      type: "dining"
    },
    {
      id: "counter-area",
      name: t('locations.mcdonalds.counterArea'),
      shape: "poly",
      coords: [530, 300, 650, 300, 650, 380, 530, 380],
      description: t('locations.mcdonalds.counterAreaDesc'),
      type: "counter"
    },
    {
      id: "kitchen-main",
      name: t('locations.mcdonalds.kitchenArea'),
      shape: "poly",
      coords: [650, 150, 850, 150, 850, 280, 650, 280],
      description: t('locations.mcdonalds.kitchenAreaDesc'),
      type: "kitchen"
    },
    {
      id: "food-prep",
      name: t('locations.mcdonalds.kitchenArea'),
      shape: "poly",
      coords: [650, 280, 750, 280, 750, 380, 650, 380],
      description: t('locations.mcdonalds.kitchenAreaDesc'),
      type: "kitchen"
    },
    {
      id: "mens-bathroom",
      name: t('locations.mcdonalds.bathrooms'),
      shape: "poly",
      coords: [750, 280, 850, 280, 850, 330, 750, 330],
      description: t('locations.mcdonalds.bathroomsDesc'),
      type: "bathroom"
    },
    {
      id: "womens-bathroom",
      name: t('locations.mcdonalds.bathrooms'),
      shape: "poly",
      coords: [750, 330, 850, 330, 850, 380, 750, 380],
      description: t('locations.mcdonalds.bathroomsDesc'),
      type: "bathroom"
    },
    {
      id: "office-area",
      name: t('locations.mcdonalds.officeArea'),
      shape: "poly",
      coords: [850, 300, 950, 300, 950, 380, 850, 380],
      description: t('locations.mcdonalds.officeAreaDesc'),
      type: "office"
    },
    {
      id: "storage-area",
      name: t('locations.mcdonalds.storageArea'),
      shape: "poly",
      coords: [850, 150, 950, 150, 950, 300, 850, 300],
      description: t('locations.mcdonalds.storageAreaDesc'),
      type: "storage"
    },
    {
      id: "main-entrance",
      name: t('locations.mcdonalds.entranceMain'),
      shape: "poly",
      coords: [400, 380, 500, 380, 500, 430, 400, 430],
      description: t('locations.mcdonalds.entranceMainDesc'),
      type: "entrance"
    },
    {
      id: "side-entrance",
      name: t('locations.mcdonalds.sideEntrance'),
      shape: "poly",
      coords: [250, 380, 300, 380, 300, 430, 250, 430],
      description: t('locations.mcdonalds.sideEntranceDesc'),
      type: "entrance"
    },
    {
      id: "play-area",
      name: "Play Area",
      shape: "poly",
      coords: [320, 300, 450, 300, 450, 380, 320, 380],
      description: "Children's play area with playground equipment and seating for parents",
      type: "dining"
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
      case "dining": return "rgba(141, 194, 142, 0.4)";    // Light green
      case "kitchen": return "rgba(255, 207, 98, 0.4)";    // Yellow
      case "counter": return "rgba(233, 181, 95, 0.4)";    // Orange-ish
      case "bathroom": return "rgba(174, 214, 241, 0.4)";  // Light blue
      case "office": return "rgba(214, 174, 241, 0.4)";    // Purple
      case "storage": return "rgba(189, 189, 189, 0.4)";   // Gray
      case "entrance": return "rgba(231, 76, 60, 0.4)";    // Red
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

  // Create SVG elements for the architectural floor plan based exactly on the Jana Bazynskiego 2 McDonald's floor plan
  const renderArchitecturalPlan = () => {
    return (
      <>
        {/* Main building outline/walls - matching exact architectural drawing */}
        <rect 
          x="200" y="100" 
          width="760" height="380" 
          fill="#f5f5f5" 
          stroke="#333" 
          strokeWidth="3"
        />
        
        {/* Floor tiling pattern - matching the architectural drawing */}
        <rect 
          x="220" y="120" 
          width="720" height="340" 
          fill="#e8e8e8" 
          stroke="#bbb" 
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
        
        {/* MAIN RESTAURANT LAYOUT - BASED EXACTLY ON ARCHITECTURAL DRAWING */}
        
        {/* Main dining area - largest open area in the center-left of the floor plan */}
        <polygon 
          points="220,150, 540,150, 540,320, 470,320, 470,360, 320,360, 320,320, 220,320" 
          fill="#eeeeee" 
          stroke="#555" 
          strokeWidth="2"
        />
        
        {/* Counter area - exactly as shown in the architectural drawing */}
        <polygon 
          points="540,150, 630,150, 630,360, 540,360" 
          fill="#f0e8d0" 
          stroke="#555" 
          strokeWidth="2"
        />
        
        {/* Kitchen area - matching the architectural drawing */}
        <polygon 
          points="630,150, 850,150, 850,260, 630,260" 
          fill="#f5e0c0" 
          stroke="#555" 
          strokeWidth="2"
        />
        
        {/* Bathrooms and facilities - matching architectural drawing */}
        <polygon 
          points="630,260, 850,260, 850,360, 630,360" 
          fill="#e0f0ff" 
          stroke="#555" 
          strokeWidth="2"
        />
        
        {/* Office and storage area - right side of floor plan */}
        <polygon 
          points="850,150, 950,150, 950,360, 850,360" 
          fill="#eaeaea" 
          stroke="#555" 
          strokeWidth="2"
        />
        
        {/* Main entrance vestibule */}
        <polygon 
          points="390,320, 470,320, 470,360, 390,360" 
          fill="#fff2f2" 
          stroke="#555" 
          strokeWidth="2"
        />
        
        {/* DINING AREA DETAILS - BASED ON ARCHITECTURAL DRAWING */}
        
        {/* Window seating area - front (bottom) of plan */}
        <rect 
          x="220" y="280" 
          width="340" height="40" 
          fill="#e6f2e6" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* Main seating area */}
        <rect 
          x="220" y="180" 
          width="340" height="100" 
          fill="#e6ffe6" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* Play area corner (circular play area visible in architectural plan) */}
        <circle 
          cx="280" 
          cy="240" 
          r="40" 
          fill="#d7f5d7" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* Second play area visible in architectural plan */}
        <circle 
          cx="400" 
          cy="240" 
          r="40" 
          fill="#d7f5d7" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* COUNTER AND KITCHEN DETAILS - MATCHING ARCHITECTURAL DRAWING */}
        
        {/* Service counter layout - matches drawing precisely */}
        <rect 
          x="550" y="200" 
          width="70" height="120" 
          fill="#fff0c0" 
          stroke="#555" 
          strokeWidth="1.5"
        />
        
        {/* Kitchen equipment layout - matching architectural drawing */}
        <rect x="650" y="160" width="180" height="30" fill="#ffe0b0" stroke="#555" strokeWidth="1" /> {/* Cooking line */}
        <rect x="650" y="200" width="180" height="40" fill="#ffecb0" stroke="#555" strokeWidth="1" /> {/* Prep area */}
        
        {/* BATHROOM LAYOUT - PRECISELY MATCHING ARCHITECTURAL DRAWING */}
        
        {/* Men's room - position matched to drawing */}
        <rect 
          x="650" y="270" 
          width="90" height="40" 
          fill="#cce5ff" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* Women's room - position matched to drawing */}
        <rect 
          x="750" y="270" 
          width="90" height="40" 
          fill="#cce0ff" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* Staff facilities - position matched to drawing */}
        <rect 
          x="650" y="320" 
          width="190" height="30" 
          fill="#e0e8ff" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* OFFICE AND STORAGE - PRECISELY MATCHING ARCHITECTURAL DRAWING */}
        
        {/* Main office */}
        <rect 
          x="860" y="180" 
          width="80" height="70" 
          fill="#e8e0f0" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* Storage rooms - visible in architectural drawing */}
        <rect 
          x="860" y="260" 
          width="80" height="90" 
          fill="#e0e0e0" 
          stroke="#555" 
          strokeWidth="1"
        />
        
        {/* INTERNAL WALL DETAILS */}
        <line x1="220" y1="180" x2="540" y2="180" stroke="#555" strokeWidth="1.5" />
        <line x1="220" y1="280" x2="540" y2="280" stroke="#555" strokeWidth="1.5" />
        <line x1="390" y1="320" x2="390" y2="360" stroke="#555" strokeWidth="1.5" />
        <line x1="470" y1="320" x2="470" y2="360" stroke="#555" strokeWidth="1.5" />
        <line x1="540" y1="150" x2="540" y2="360" stroke="#555" strokeWidth="1.5" />
        <line x1="630" y1="150" x2="630" y2="360" stroke="#555" strokeWidth="1.5" />
        <line x1="650" y1="260" x2="850" y2="260" stroke="#555" strokeWidth="1.5" />
        <line x1="740" y1="270" x2="740" y2="310" stroke="#555" strokeWidth="1.5" />
        <line x1="650" y1="310" x2="850" y2="310" stroke="#555" strokeWidth="1.5" />
        <line x1="850" y1="150" x2="850" y2="360" stroke="#555" strokeWidth="1.5" />
        
        {/* DOOR OPENINGS */}
        {/* Main entrance door (double) */}
        <line x1="430" y1="350" x2="430" y2="360" stroke="#333" strokeWidth="0" />
        <path d="M 420,350 Q 430,370 440,350" fill="none" stroke="#333" strokeWidth="1.5" />
        <path d="M 450,350 Q 440,370 430,350" fill="none" stroke="#333" strokeWidth="1.5" />
        
        {/* Side entrance door */}
        <path d="M 275,350 Q 265,370 255,350" fill="none" stroke="#333" strokeWidth="1.5" />
        
        {/* Kitchen to counter door */}
        <path d="M 650,200 Q 660,190 650,180" fill="none" stroke="#333" strokeWidth="1.5" />
        
        {/* Bathroom doors */}
        <path d="M 750,290 Q 760,280 750,270" fill="none" stroke="#333" strokeWidth="1.5" />
        <path d="M 750,330 Q 760,320 750,310" fill="none" stroke="#333" strokeWidth="1.5" />
        
        {/* Office door */}
        <path d="M 880,310 Q 870,300 860,310" fill="none" stroke="#333" strokeWidth="1.5" />
        
        {/* FURNITURE & FIXTURES */}
        {/* Window booths - 5 booths along windows */}
        {[0, 1, 2, 3, 4].map(i => (
          <g key={`booth-${i}`}>
            <rect 
              x={270 + i * 50} 
              y={160} 
              width="40" 
              height="20" 
              fill="#A5D6A7" 
              stroke="#333" 
              strokeWidth="1" 
              rx="2"
            />
            <rect 
              x={270 + i * 50} 
              y={190} 
              width="40" 
              height="20" 
              fill="#A5D6A7" 
              stroke="#333" 
              strokeWidth="1" 
              rx="2"
            />
            <rect 
              x={270 + i * 50 + 15} 
              y={182} 
              width="10" 
              height="6" 
              fill="#C8E6C9" 
              stroke="#333" 
              strokeWidth="0.5"
            />
          </g>
        ))}
        
        {/* Central dining area - 4x3 square tables */}
        {[0, 1, 2, 3].map(row => (
          [0, 1, 2].map(col => (
            <g key={`central-table-${row}-${col}`}>
              <rect 
                x={280 + col * 80} 
                y={240 + row * 20} 
                width="40" 
                height="40" 
                fill="#81C784" 
                stroke="#333" 
                strokeWidth="1" 
                rx="2"
              />
              <circle 
                cx={280 + col * 80 + 20} 
                cy={240 + row * 20 + 20} 
                r="15" 
                fill="#C8E6C9" 
                stroke="#333" 
                strokeWidth="0.5"
              />
              {/* Chairs around tables */}
              <circle cx={280 + col * 80 + 20 - 25} cy={240 + row * 20 + 20} r="6" fill="#A5D6A7" stroke="#555" strokeWidth="0.5" />
              <circle cx={280 + col * 80 + 20 + 25} cy={240 + row * 20 + 20} r="6" fill="#A5D6A7" stroke="#555" strokeWidth="0.5" />
              <circle cx={280 + col * 80 + 20} cy={240 + row * 20 + 20 - 25} r="6" fill="#A5D6A7" stroke="#555" strokeWidth="0.5" />
              <circle cx={280 + col * 80 + 20} cy={240 + row * 20 + 20 + 25} r="6" fill="#A5D6A7" stroke="#555" strokeWidth="0.5" />
            </g>
          ))
        ))}
        
        {/* Play Area Equipment */}
        <circle cx="295" cy="335" r="18" fill="#FFCC80" stroke="#FB8C00" strokeWidth="1.5" /> 
        <rect x="275" y="320" width="15" height="15" fill="#FFA726" stroke="#333" strokeWidth="1" rx="2" />
        <rect x="315" y="330" width="15" height="15" fill="#FFA726" stroke="#333" strokeWidth="1" rx="2" />
        <path d="M 280,340 Q 295,315 310,340" fill="none" stroke="#E65100" strokeWidth="2" />
        
        {/* Service Counter */}
        <rect x="560" y="180" width="80" height="120" fill="#FFD54F" stroke="#333" strokeWidth="1.5" />
        {/* POS Terminals */}
        <rect x="570" y="190" width="15" height="10" fill="#FFC107" stroke="#333" strokeWidth="1" />
        <rect x="595" y="190" width="15" height="10" fill="#FFC107" stroke="#333" strokeWidth="1" />
        <rect x="620" y="190" width="15" height="10" fill="#FFC107" stroke="#333" strokeWidth="1" />
        {/* Food pickup area */}
        <rect x="570" y="230" width="60" height="20" fill="#FFB300" stroke="#333" strokeWidth="1" />
        <rect x="570" y="260" width="60" height="20" fill="#FFB300" stroke="#333" strokeWidth="1" />
        {/* Drink station */}
        <rect x="570" y="290" width="60" height="40" fill="#FFB74D" stroke="#333" strokeWidth="1" />
        {/* Drink dispensers */}
        {[0, 1, 2, 3].map(i => (
          <rect 
            key={`drink-${i}`}
            x={575 + i * 15} 
            y={295} 
            width="10" 
            height="10" 
            fill="#F57C00" 
            stroke="#333" 
            strokeWidth="0.5" 
          />
        ))}
        
        {/* Kitchen Equipment - based on actual floor plan */}
        {/* Cooking line */}
        <rect x="670" y="160" width="160" height="30" fill="#FFA726" stroke="#333" strokeWidth="1.5" />
        {/* Fryers */}
        {[0, 1, 2].map(i => (
          <rect 
            key={`fryer-${i}`}
            x={680 + i * 30} 
            y={165} 
            width="20" 
            height="20" 
            fill="#FF9800" 
            stroke="#333" 
            strokeWidth="1" 
          />
        ))}
        {/* Grills */}
        {[0, 1].map(i => (
          <rect 
            key={`grill-${i}`}
            x={770 + i * 30} 
            y={165} 
            width="20" 
            height="20" 
            fill="#E65100" 
            stroke="#333" 
            strokeWidth="1" 
          />
        ))}
        
        {/* Prep tables */}
        <rect x="670" y="200" width="160" height="20" fill="#FFB74D" stroke="#333" strokeWidth="1.5" />
        <rect x="670" y="230" width="160" height="20" fill="#FFB74D" stroke="#333" strokeWidth="1.5" />
        
        {/* Food prep area equipment */}
        <rect x="660" y="280" width="80" height="20" fill="#FF9800" stroke="#333" strokeWidth="1.5" />
        <rect x="660" y="310" width="80" height="30" fill="#FF9800" stroke="#333" strokeWidth="1.5" />
        
        {/* Bathroom fixtures - exactly as in architectural plan */}
        {/* Men's room */}
        <rect x="760" y="275" width="15" height="10" fill="#29B6F6" stroke="#333" strokeWidth="1" />
        <rect x="785" y="275" width="15" height="10" fill="#29B6F6" stroke="#333" strokeWidth="1" />
        <rect x="810" y="275" width="15" height="10" fill="#29B6F6" stroke="#333" strokeWidth="1" />
        <rect x="760" y="290" width="20" height="15" fill="#81D4FA" stroke="#333" strokeWidth="1" />
        <rect x="790" y="290" width="20" height="15" fill="#81D4FA" stroke="#333" strokeWidth="1" />
        
        {/* Women's room */}
        <rect x="760" y="315" width="15" height="10" fill="#29B6F6" stroke="#333" strokeWidth="1" />
        <rect x="785" y="315" width="15" height="10" fill="#29B6F6" stroke="#333" strokeWidth="1" />
        <rect x="810" y="315" width="15" height="10" fill="#29B6F6" stroke="#333" strokeWidth="1" />
        <rect x="760" y="330" width="20" height="15" fill="#81D4FA" stroke="#333" strokeWidth="1" />
        <rect x="790" y="330" width="20" height="15" fill="#81D4FA" stroke="#333" strokeWidth="1" />
        <rect x="820" y="330" width="20" height="15" fill="#81D4FA" stroke="#333" strokeWidth="1" />
        
        {/* Office furniture */}
        <rect x="860" y="320" width="40" height="20" fill="#CE93D8" stroke="#333" strokeWidth="1" />
        <rect x="910" y="320" width="30" height="20" fill="#BA68C8" stroke="#333" strokeWidth="1" />
        <rect x="860" y="320" width="10" height="25" fill="#9575CD" stroke="#333" strokeWidth="1" />
        
        {/* Storage shelves and equipment - 5 rows of shelving */}
        {[0, 1, 2, 3, 4].map(i => (
          <rect 
            key={`storage-${i}`}
            x={860} 
            y={160 + i * 25} 
            width="80" 
            height="15" 
            fill="#BDBDBD" 
            stroke="#333" 
            strokeWidth="1" 
          />
        ))}
        <rect x="870" y="275" width="40" height="25" fill="#9E9E9E" stroke="#333" strokeWidth="1" />
        
        {/* ROOM LABELS - with exact positioning */}
        <text x="400" y="195" textAnchor="middle" fontSize="12" fontWeight="bold">Window Dining Area</text>
        <text x="400" y="270" textAnchor="middle" fontSize="14" fontWeight="bold">Main Dining Area</text>
        <text x="295" y="335" textAnchor="middle" fontSize="8" fontWeight="bold">Play</text>
        <text x="600" y="225" textAnchor="middle" fontSize="12" fontWeight="bold">Counter</text>
        <text x="750" y="185" textAnchor="middle" fontSize="14" fontWeight="bold">Kitchen</text>
        <text x="700" y="295" textAnchor="middle" fontSize="10" fontWeight="bold">Prep</text>
        <text x="800" y="285" textAnchor="middle" fontSize="10" fontWeight="bold">Men</text>
        <text x="800" y="325" textAnchor="middle" fontSize="10" fontWeight="bold">Women</text>
        <text x="900" y="335" textAnchor="middle" fontSize="10" fontWeight="bold">Office</text>
        <text x="900" y="230" textAnchor="middle" fontSize="12" fontWeight="bold">Storage</text>
        <text x="440" y="375" textAnchor="middle" fontSize="10" fontWeight="bold">Main Entrance</text>
        <text x="270" y="375" textAnchor="middle" fontSize="8" fontWeight="bold">Side</text>
        
        {/* North indicator */}
        <circle cx="230" cy="130" r="15" fill="white" stroke="#333" strokeWidth="1.5" />
        <text x="230" y="134" textAnchor="middle" fontSize="12" fontWeight="bold">N</text>
        
        {/* Scale indicator */}
        <line x1="750" y1="450" x2="850" y2="450" stroke="#333" strokeWidth="2" />
        <line x1="750" y1="445" x2="750" y2="455" stroke="#333" strokeWidth="2" />
        <line x1="800" y1="445" x2="800" y2="455" stroke="#333" strokeWidth="2" />
        <line x1="850" y1="445" x2="850" y2="455" stroke="#333" strokeWidth="2" />
        <text x="800" y="470" textAnchor="middle" fontSize="10">5m</text>
        
        {/* Restaurant name */}
        <text x="400" y="130" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#D32F2F">McDonald's</text>
        <text x="400" y="145" textAnchor="middle" fontSize="10">Jana Bazynskiego 2, Gdańsk</text>
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
      let x = 380;
      let y = 240;
      
      // Simple mapping of issue locations to coordinates
      if (issue.location.toLowerCase().includes("dining")) {
        x = 380;
        y = 240;
      } else if (issue.location.toLowerCase().includes("counter")) {
        x = 600;
        y = 190;
      } else if (issue.location.toLowerCase().includes("kitchen")) {
        x = 750;
        y = 190;
      } else if (issue.location.toLowerCase().includes("bathroom")) {
        x = 750;
        y = 290;
      } else if (issue.location.toLowerCase().includes("office")) {
        x = 850;
        y = 350;
      } else if (issue.location.toLowerCase().includes("storage")) {
        x = 850;
        y = 220;
      } else if (issue.location.toLowerCase().includes("entrance")) {
        x = 450;
        y = 435;
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
            <p className="text-amber-600">Click anywhere on the interior plan to pin-point the exact location of damage.</p>
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
                placeholder="e.g., Broken chair, Damaged floor tile, etc."
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
            <DialogTitle>{t('locations.mcdonalds.interiorPlan')}</DialogTitle>
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
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("dining") }}></div>
                  <span>Dining Area</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("kitchen") }}></div>
                  <span>Kitchen</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("counter") }}></div>
                  <span>Counter</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("bathroom") }}></div>
                  <span>Bathrooms</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("office") }}></div>
                  <span>Office</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("storage") }}></div>
                  <span>Storage</span>
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