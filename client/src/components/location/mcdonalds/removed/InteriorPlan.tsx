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
import { Maximize2, Plus, Pin, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AreaDefinition {
  id: string;
  name: string;
  shape: "rect" | "circle" | "poly";
  coords: number[];
  description: string;
  type: "dining" | "kitchen" | "counter" | "bathroom" | "storage" | "entrance";
}

interface InteriorPlanProps {
  issues: Issue[];
}

interface PinPoint {
  x: number;
  y: number;
  label: string;
  color: string;
  id: string;
}

export default function InteriorPlan({ issues }: InteriorPlanProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedArea, setSelectedArea] = useState<AreaDefinition | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [userPins, setUserPins] = useState<PinPoint[]>([]);
  const [newPinLabel, setNewPinLabel] = useState("");
  const [tempPin, setTempPin] = useState<{x: number, y: number} | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [selectedPin, setSelectedPin] = useState<PinPoint | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Define interactive areas on the floor plan
  const areas: AreaDefinition[] = [
    {
      id: "dining-area-central",
      name: t('locations.mcdonalds.diningArea'),
      shape: "rect",
      coords: [100, 150, 300, 350],
      description: t('locations.mcdonalds.diningAreaDesc'),
      type: "dining"
    },
    {
      id: "dining-area-window",
      name: t('locations.mcdonalds.diningWindow'),
      shape: "rect",
      coords: [100, 50, 300, 130],
      description: t('locations.mcdonalds.diningWindowDesc'),
      type: "dining"
    },
    {
      id: "kitchen-area",
      name: t('locations.mcdonalds.kitchen'),
      shape: "rect",
      coords: [400, 100, 750, 250],
      description: t('locations.mcdonalds.kitchenDesc'),
      type: "kitchen"
    },
    {
      id: "counter-area",
      name: t('locations.mcdonalds.counter'),
      shape: "rect",
      coords: [350, 270, 650, 330],
      description: t('locations.mcdonalds.counterDesc'),
      type: "counter"
    },
    {
      id: "bathroom-area",
      name: t('locations.mcdonalds.bathrooms'),
      shape: "rect",
      coords: [650, 270, 750, 400],
      description: t('locations.mcdonalds.bathroomsDesc'),
      type: "bathroom"
    },
    {
      id: "storage-area",
      name: t('locations.mcdonalds.storage'),
      shape: "rect",
      coords: [650, 400, 750, 500],
      description: t('locations.mcdonalds.storageDesc'),
      type: "storage"
    },
    {
      id: "entrance-main",
      name: t('locations.mcdonalds.entrance'),
      shape: "rect",
      coords: [200, 400, 300, 450],
      description: t('locations.mcdonalds.entranceDesc'),
      type: "entrance"
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
      case "dining": return "rgba(52, 152, 219, 0.4)";    // Blue
      case "kitchen": return "rgba(231, 76, 60, 0.4)";    // Red
      case "counter": return "rgba(241, 196, 15, 0.4)";   // Yellow
      case "bathroom": return "rgba(142, 68, 173, 0.4)";  // Purple
      case "storage": return "rgba(149, 165, 166, 0.4)";  // Gray
      case "entrance": return "rgba(46, 204, 113, 0.4)";  // Green
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
    if (!pinMode || !svgRef.current) return;

    // Get click coordinates relative to the SVG
    const svgElement = svgRef.current;
    const svgRect = svgElement.getBoundingClientRect();
    const svgPoint = svgElement.createSVGPoint();
    
    svgPoint.x = event.clientX - svgRect.left;
    svgPoint.y = event.clientY - svgRect.top;
    
    // Convert to SVG coordinate space
    const svgWidth = svgRect.width;
    const svgHeight = svgRect.height;
    
    const viewBoxWidth = 850;
    const viewBoxHeight = 550;
    
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
    setNewPinLabel("");
    setShowPinDialog(false);
    
    toast({
      title: "Pin Added",
      description: "Your damage location pin has been added to the floor plan.",
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
      let x = 225;
      let y = 250;
      
      // Simple mapping of issue locations to coordinates
      if (issue.location.toLowerCase().includes("dining")) {
        if (issue.location.toLowerCase().includes("window")) {
          x = 200;
          y = 90;
        } else {
          x = 200;
          y = 250;
        }
      } else if (issue.location.toLowerCase().includes("kitchen")) {
        x = 575;
        y = 175;
      } else if (issue.location.toLowerCase().includes("counter")) {
        x = 500;
        y = 300;
      } else if (issue.location.toLowerCase().includes("bathroom")) {
        x = 700;
        y = 335;
      } else if (issue.location.toLowerCase().includes("storage")) {
        x = 700;
        y = 450;
      } else if (issue.location.toLowerCase().includes("entrance")) {
        x = 250;
        y = 425;
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
          variant={pinMode ? "default" : "outline"} 
          size="sm"
          onClick={() => setPinMode(!pinMode)}
          className="mr-2"
        >
          <Pin className="h-4 w-4 mr-1" /> 
          {pinMode ? "Exit Pin Mode" : "Pin Damage Location"}
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
        {pinMode && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-sm">
            <p className="font-medium text-amber-700">Pin Mode Active</p>
            <p className="text-amber-600">Click anywhere on the floor plan to pin-point the exact location of damage.</p>
          </div>
        )}
        
        <svg 
          ref={svgRef}
          viewBox="0 0 850 550" 
          className={`w-full h-auto ${pinMode ? 'cursor-crosshair' : ''}`}
          onClick={pinMode ? handleMapClick : undefined}
        >
          {/* Base floor plan image */}
          <image
            href="/images/mcdonalds-floorplan.jpg"
            width="850"
            height="550"
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
                placeholder="e.g., Broken chair, Damaged wall, etc."
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

      {/* Area Details Dialog */}
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
                variant={pinMode ? "default" : "outline"} 
                size="sm"
                onClick={() => setPinMode(!pinMode)}
              >
                <Pin className="h-4 w-4 mr-1" /> 
                {pinMode ? "Exit Pin Mode" : "Pin Damage Location"}
              </Button>
            </div>
            
            <svg 
              viewBox="0 0 850 550"
              className={`w-full h-auto ${pinMode ? 'cursor-crosshair' : ''}`}
              onClick={pinMode ? handleMapClick : undefined}
            >
              {/* Base floor plan image */}
              <image
                href="/images/mcdonalds-floorplan.jpg"
                width="850"
                height="550"
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
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("dining") }}></div>
                  <span>{t('locations.legendSeating')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("kitchen") }}></div>
                  <span>{t('locations.legendKitchen')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("counter") }}></div>
                  <span>{t('locations.legendService')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("bathroom") }}></div>
                  <span>{t('locations.legendRestroom')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("entrance") }}></div>
                  <span>{t('locations.legendEntrance')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: getAreaColor("storage") }}></div>
                  <span>{t('locations.legendUtility')}</span>
                </div>
                <div className="flex items-center col-span-2">
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