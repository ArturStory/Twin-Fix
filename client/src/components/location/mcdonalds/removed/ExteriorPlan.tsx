import { useState, useRef } from "react";
import { Issue, IssueStatus } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Pin, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AreaDefinition {
  id: string;
  name: string;
  shape: "rect" | "circle" | "poly";
  coords: number[];
  description: string;
  type: "building" | "parking" | "entrance" | "drivethru" | "green" | "road";
}

interface ExteriorPlanProps {
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

export default function ExteriorPlan({ issues, pinMode = false, onPinAdded }: ExteriorPlanProps) {
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
  const svgRef = useRef<SVGSVGElement>(null);

  // Define interactive areas on the exterior plan
  const areas: AreaDefinition[] = [
    {
      id: "main-building",
      name: t('locations.mcdonalds.mainBuilding'),
      shape: "rect",
      coords: [300, 150, 650, 350],
      description: t('locations.mcdonalds.mainBuildingDesc'),
      type: "building"
    },
    {
      id: "parking-front",
      name: t('locations.mcdonalds.parkingFront'),
      shape: "rect",
      coords: [300, 380, 650, 500],
      description: t('locations.mcdonalds.parkingFrontDesc'),
      type: "parking"
    },
    {
      id: "parking-side",
      name: t('locations.mcdonalds.parkingSide'),
      shape: "rect",
      coords: [680, 150, 800, 350],
      description: t('locations.mcdonalds.parkingSideDesc'),
      type: "parking"
    },
    {
      id: "main-entrance",
      name: t('locations.mcdonalds.mainEntrance'),
      shape: "rect",
      coords: [450, 350, 500, 380],
      description: t('locations.mcdonalds.mainEntranceDesc'),
      type: "entrance"
    },
    {
      id: "drive-thru-entry",
      name: t('locations.mcdonalds.driveThruEntry'),
      shape: "rect",
      coords: [200, 200, 270, 250],
      description: t('locations.mcdonalds.driveThruEntryDesc'),
      type: "drivethru"
    },
    {
      id: "drive-thru-exit",
      name: t('locations.mcdonalds.driveThruExit'),
      shape: "rect",
      coords: [150, 300, 220, 350],
      description: t('locations.mcdonalds.driveThruExitDesc'),
      type: "drivethru"
    },
    {
      id: "green-area",
      name: t('locations.mcdonalds.greenArea'),
      shape: "rect",
      coords: [100, 100, 270, 180],
      description: t('locations.mcdonalds.greenAreaDesc'),
      type: "green"
    },
    {
      id: "road-access",
      name: t('locations.mcdonalds.roadAccess'),
      shape: "rect",
      coords: [450, 30, 500, 130],
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

  // Render all area overlays
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
      }
      return null;
    });
  };

  // Handle map clicks for adding pins in pin mode
  const handleMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!pinModeActive || !svgRef.current) return;

    // Get click coordinates relative to the SVG
    const svgElement = svgRef.current;
    const svgRect = svgElement.getBoundingClientRect();
    const svgPoint = svgElement.createSVGPoint();
    
    svgPoint.x = event.clientX - svgRect.left;
    svgPoint.y = event.clientY - svgRect.top;
    
    // Convert to SVG coordinate space
    const svgWidth = svgRect.width;
    const svgHeight = svgRect.height;
    
    const viewBoxWidth = 960;
    const viewBoxHeight = 520;
    
    const x = (svgPoint.x / svgWidth) * viewBoxWidth;
    const y = (svgPoint.y / svgHeight) * viewBoxHeight;
    
    // Set temporary pin and show dialog
    setTempPin({ x, y });
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
    setTempPin(null);
    
    // Call the onPinAdded callback if provided
    const coordinates = `X: ${Math.round(tempPin.x)}, Y: ${Math.round(tempPin.y)}`;
    if (onPinAdded) {
      onPinAdded(coordinates, newPinLabel);
    }
    
    setNewPinLabel("");
    setShowPinDialog(false);
    
    toast({
      title: "Pin Added",
      description: "Your damage location pin has been added to the exterior plan.",
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

  // Render user-added pins
  const renderUserPins = () => {
    return userPins.map(pin => (
      <g key={pin.id} onClick={() => setSelectedPin(pin)} style={{ cursor: "pointer" }}>
        <circle cx={pin.x} cy={pin.y} r="10" fill={pin.color} />
        <Pin className="h-5 w-5 text-white" x={pin.x - 2.5} y={pin.y - 2.5} />
      </g>
    ));
  };
  
  // Render temporary pin while placing
  const renderTempPin = () => {
    if (!tempPin) return null;
    
    return (
      <g>
        <circle cx={tempPin.x} cy={tempPin.y} r="10" fill="#FF5722" fillOpacity="0.7" />
        <Pin className="h-5 w-5 text-white" x={tempPin.x - 2.5} y={tempPin.y - 2.5} />
        <circle cx={tempPin.x} cy={tempPin.y} r="15" fill="none" stroke="#FF5722" strokeWidth="2" strokeOpacity="0.5">
          <animate attributeName="r" from="15" to="25" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
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
          <circle cx={x} cy={y} r="10" fill={color} />
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

  return (
    <div className="h-full relative">
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
          variant="outline" 
          size="sm"
          onClick={() => setIsFullscreen(true)}
        >
          <Maximize2 className="h-4 w-4 mr-1" /> 
          {t('locations.fullscreen')}
        </Button>
      </div>

      <div className="p-4 h-full overflow-auto">
        {pinModeActive && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-sm">
            <p className="font-medium text-amber-700">Pin Mode Active</p>
            <p className="text-amber-600">Click anywhere on the exterior plan to pin-point the exact location of damage.</p>
          </div>
        )}
        
        <svg 
          ref={svgRef}
          viewBox="0 0 960 520" 
          className={`w-full h-auto ${pinModeActive ? 'cursor-crosshair' : ''}`}
          onClick={pinModeActive ? handleMapClick : undefined}
        >
          {/* Base floor plan image */}
          <image
            href="/images/mcdonalds-exterior.jpg"
            width="960"
            height="520"
            preserveAspectRatio="xMidYMid meet"
          />
          
          {/* Interactive area overlays */}
          {renderAreaOverlays()}

          {/* Issue markers */}
          {renderIssueMarkers()}
          
          {/* User pins */}
          {renderUserPins()}
          
          {/* Temporary pin */}
          {renderTempPin()}
        </svg>
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
              <div className="mt-4 text-sm text-gray-500">
                <p>Location: X: {Math.round(selectedPin.x)}, Y: {Math.round(selectedPin.y)}</p>
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
            </div>
            
            <svg 
              ref={svgRef}
              viewBox="0 0 960 520"
              className={`w-full h-auto ${pinModeActive ? 'cursor-crosshair' : ''}`}
              onClick={pinModeActive ? handleMapClick : undefined}
            >
              {/* Base floor plan image */}
              <image
                href="/images/mcdonalds-exterior.jpg"
                width="960"
                height="520"
                preserveAspectRatio="xMidYMid meet"
              />
              
              {/* Interactive area overlays */}
              {renderAreaOverlays()}

              {/* Issue markers */}
              {renderIssueMarkers()}
              
              {/* User pins */}
              {renderUserPins()}
              
              {/* Temporary pin */}
              {renderTempPin()}
            </svg>
            
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