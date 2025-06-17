import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, Building, LayoutGrid } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface IndoorLocationPickerProps {
  onLocationSelected: (location: string, details: IndoorLocationDetails) => void;
  initialValue?: string;
}

export interface IndoorLocationDetails {
  buildingId?: string;
  buildingName?: string;
  floorId?: string;
  floorName?: string;
  roomName?: string;
  latitude?: number;
  longitude?: number;
  x?: number; // Position on floor plan (percentage)
  y?: number; // Position on floor plan (percentage)
}

interface Building {
  id: string;
  name: string;
  floors: Floor[];
}

interface Floor {
  id: string;
  name: string;
  imageUrl: string;
  rooms: Room[];
}

interface Room {
  id: string;
  name: string;
  x: number; // Position on floor plan (percentage)
  y: number; // Position on floor plan (percentage)
  width: number; // Width in percentage
  height: number; // Height in percentage
}

// Mock data for buildings and floors until we have a backend API
// In a real application, this would come from the API
const BUILDINGS: Building[] = [
  {
    id: "main-building",
    name: "Main Building",
    floors: [
      {
        id: "ground-floor",
        name: "Ground Floor",
        imageUrl: "/floorplans/main-building-ground.svg",
        rooms: [
          { id: "office-area", name: "Office Area", x: 20, y: 25, width: 30, height: 25 },
          { id: "meeting-room", name: "Meeting Room", x: 20, y: 65, width: 25, height: 15 },
          { id: "break-room", name: "Break Room", x: 45, y: 25, width: 20, height: 15 },
          { id: "server-room", name: "Server Room", x: 70, y: 25, width: 15, height: 15 },
          { id: "reception", name: "Reception", x: 45, y: 12, width: 20, height: 10 },
          { id: "storage", name: "Storage Room", x: 70, y: 65, width: 15, height: 15 },
          { id: "conference", name: "Conference Room", x: 45, y: 65, width: 20, height: 15 },
        ]
      },
      {
        id: "first-floor",
        name: "First Floor",
        imageUrl: "/floorplans/main-building-first.svg",
        rooms: [
          { id: "executive-office", name: "Executive Office", x: 15, y: 20, width: 20, height: 25 },
          { id: "development", name: "Development Team", x: 40, y: 20, width: 30, height: 25 },
          { id: "marketing", name: "Marketing", x: 20, y: 65, width: 25, height: 15 },
          { id: "it-support", name: "IT Support", x: 65, y: 20, width: 20, height: 25 },
          { id: "training-room", name: "Training Room", x: 45, y: 65, width: 25, height: 15 },
        ]
      },
      {
        id: "second-floor",
        name: "Second Floor",
        imageUrl: "/floorplans/main-building-second.svg",
        rooms: [
          { id: "open-office", name: "Open Office Space", x: 20, y: 30, width: 60, height: 30 },
          { id: "lounge", name: "Employee Lounge", x: 20, y: 65, width: 25, height: 15 },
          { id: "meeting-hall", name: "Meeting Hall", x: 50, y: 65, width: 30, height: 15 },
        ]
      }
    ]
  },
  {
    id: "annex",
    name: "Annex Building",
    floors: [
      {
        id: "annex-ground", 
        name: "Ground Floor",
        imageUrl: "/floorplans/annex-ground.svg",
        rooms: [
          { id: "lobby", name: "Lobby", x: 40, y: 20, width: 20, height: 15 },
          { id: "workshop", name: "Workshop", x: 20, y: 40, width: 40, height: 30 },
          { id: "storage-a1", name: "Storage A1", x: 65, y: 40, width: 15, height: 15 },
        ]
      },
      {
        id: "annex-first",
        name: "First Floor",
        imageUrl: "/floorplans/annex-first.svg",
        rooms: [
          { id: "lab-1", name: "Lab 1", x: 20, y: 30, width: 25, height: 20 },
          { id: "lab-2", name: "Lab 2", x: 50, y: 30, width: 25, height: 20 },
          { id: "small-conf", name: "Small Conference", x: 35, y: 60, width: 30, height: 15 },
        ]
      }
    ]
  }
];

export default function IndoorLocationPicker({ onLocationSelected, initialValue = "" }: IndoorLocationPickerProps) {
  const [locationMode, setLocationMode] = useState<"outdoor" | "indoor">("outdoor");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(BUILDINGS[0].id);
  const [selectedFloorId, setSelectedFloorId] = useState<string>(BUILDINGS[0].floors[0].id);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [locationInput, setLocationInput] = useState(initialValue);
  const [customLocation, setCustomLocation] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<{x: number, y: number} | null>(null);
  
  // For outdoor map
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const floorPlanContainerRef = useRef<HTMLDivElement>(null);

  // Get the currently selected building and floor
  const selectedBuilding = BUILDINGS.find(b => b.id === selectedBuildingId) || BUILDINGS[0];
  const selectedFloor = selectedBuilding.floors.find(f => f.id === selectedFloorId) || selectedBuilding.floors[0];
  const selectedRoom = selectedFloor.rooms.find(r => r.id === selectedRoomId);
  
  // Load Leaflet map for outdoor location
  useEffect(() => {
    if (locationMode === "outdoor" && typeof window !== 'undefined') {
      import('leaflet').then(L => {
        if (!mapLoaded && mapContainerRef.current) {
          // Initialize map
          mapRef.current = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 13);
          
          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(mapRef.current);
          
          // Add click handler to set marker
          mapRef.current.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            setMarker([lat, lng]);
            fetchLocationName(lat, lng);
          });
          
          setMapLoaded(true);
        }
      });
    }
  }, [locationMode]);

  // Set marker function for outdoor map
  const setMarker = (coords: [number, number]) => {
    import('leaflet').then(L => {
      if (!mapRef.current) return;
      
      // Remove existing marker
      if (markerRef.current) {
        mapRef.current.removeLayer(markerRef.current);
      }
      
      // Create new marker
      markerRef.current = L.marker(coords).addTo(mapRef.current);
      setCurrentCoords(coords);
      
      // Pan to marker
      mapRef.current.panTo(coords);
    });
  };
  
  // Fetch location name from coordinates
  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      setIsLoading(true);
      
      // Use Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en-US,en' } }
      );
      
      if (!response.ok) throw new Error('Failed to fetch location name');
      
      const data = await response.json();
      
      // Construct a readable address
      let locationName = data.display_name;
      
      // If the name is too long, try to construct a shorter version
      if (locationName.length > 80) {
        const parts = [];
        
        if (data.address) {
          if (data.address.road) parts.push(data.address.road);
          if (data.address.house_number) parts.unshift(data.address.house_number);
          if (data.address.suburb) parts.push(data.address.suburb);
          if (data.address.city) parts.push(data.address.city);
          if (data.address.state) parts.push(data.address.state);
        }
        
        if (parts.length > 0) {
          locationName = parts.join(', ');
        }
      }
      
      setLocationInput(locationName);
      
      // Form the location details
      const details: IndoorLocationDetails = {
        latitude: lat,
        longitude: lng
      };
      
      onLocationSelected(locationName, details);
    } catch (error) {
      console.error('Error fetching location name:', error);
      // Use a generic location name with coordinates
      const locationName = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setLocationInput(locationName);
      onLocationSelected(locationName, { latitude: lat, longitude: lng });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Search for location by name
  const searchLocation = async () => {
    if (!locationInput.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Use Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`,
        { headers: { 'Accept-Language': 'en-US,en' } }
      );
      
      if (!response.ok) throw new Error('Failed to search location');
      
      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
        
        setMarker(coords);
        setLocationInput(result.display_name);
        onLocationSelected(result.display_name, { latitude: coords[0], longitude: coords[1] });
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Use current location
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMarker(coords);
          fetchLocationName(coords[0], coords[1]);
        },
        (error) => {
          console.error('Error getting current location:', error);
          setIsLoading(false);
        }
      );
    }
  };

  // Handle indoor location selection
  const handleBuildingChange = (buildingId: string) => {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (building) {
      setSelectedBuildingId(buildingId);
      setSelectedFloorId(building.floors[0]?.id || "");
      setSelectedRoomId("");
      setSelectedPoint(null);
      updateIndoorLocationText();
    }
  };

  const handleFloorChange = (floorId: string) => {
    setSelectedFloorId(floorId);
    setSelectedRoomId("");
    setSelectedPoint(null);
    updateIndoorLocationText();
  };

  const handleRoomChange = (roomId: string) => {
    if (roomId === "no-room") {
      setSelectedRoomId("");
      setSelectedPoint(null);
    } else {
      setSelectedRoomId(roomId);
      setSelectedPoint(null);
      
      // Auto-select the center point of the room
      const room = selectedFloor.rooms.find(r => r.id === roomId);
      if (room) {
        const centerX = room.x + (room.width / 2);
        const centerY = room.y + (room.height / 2);
        setSelectedPoint({ x: centerX, y: centerY });
      }
    }
    
    updateIndoorLocationText();
  };

  const handleFloorPlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!floorPlanContainerRef.current) return;
    
    const rect = floorPlanContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setSelectedPoint({ x, y });
    
    // Check if the click is inside a room
    const clickedRoom = selectedFloor.rooms.find(room => 
      x >= room.x && x <= (room.x + room.width) && 
      y >= room.y && y <= (room.y + room.height)
    );
    
    if (clickedRoom) {
      setSelectedRoomId(clickedRoom.id);
    } else {
      setSelectedRoomId("");
    }
    
    updateIndoorLocationText();
  };

  const updateIndoorLocationText = () => {
    let locationText = '';
    
    if (selectedBuilding) {
      locationText += selectedBuilding.name;
      
      if (selectedFloor) {
        locationText += `, ${selectedFloor.name}`;
        
        if (selectedRoom) {
          locationText += `, ${selectedRoom.name}`;
        }
        
        if (customLocation) {
          locationText += ` (${customLocation})`;
        }
      }
    }
    
    setLocationInput(locationText);
    
    // Form the location details
    const details: IndoorLocationDetails = {
      buildingId: selectedBuilding.id,
      buildingName: selectedBuilding.name,
      floorId: selectedFloor.id,
      floorName: selectedFloor.name,
      roomName: selectedRoom?.name,
      x: selectedPoint?.x,
      y: selectedPoint?.y
    };
    
    onLocationSelected(locationText, details);
  };

  const handleCustomLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomLocation(e.target.value);
    updateIndoorLocationText();
  };

  // Render the floor plan with clickable rooms
  const renderFloorPlan = () => {
    return (
      <div 
        className="w-full h-[250px] border rounded-md relative overflow-hidden bg-gray-50 cursor-pointer"
        onClick={handleFloorPlanClick}
        ref={floorPlanContainerRef}
      >
        {/* Image background - in a real app we'd use the actual floor plan SVG */}
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-25" />
            <p>Floor Plan Preview</p>
            <p className="text-sm">(Click to select a specific location)</p>
          </div>
        </div>
        
        {/* Render rooms */}
        {selectedFloor.rooms.map(room => (
          <div
            key={room.id}
            className={cn(
              "absolute border-2 rounded-sm bg-opacity-30",
              selectedRoomId === room.id ? "border-primary bg-primary-50" : "border-gray-300 bg-gray-100"
            )}
            style={{
              left: `${room.x}%`,
              top: `${room.y}%`,
              width: `${room.width}%`,
              height: `${room.height}%`
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleRoomChange(room.id);
            }}
          >
            <span className="absolute top-1 left-1 text-xs font-medium text-gray-700">
              {room.name}
            </span>
          </div>
        ))}
        
        {/* Selected point marker */}
        {selectedPoint && (
          <div 
            className="absolute w-4 h-4 rounded-full bg-primary border-2 border-white transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${selectedPoint.x}%`,
              top: `${selectedPoint.y}%`
            }}
          />
        )}
      </div>
    );
  };

  return (
    <Tabs value={locationMode} onValueChange={(value) => setLocationMode(value as "outdoor" | "indoor")} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="outdoor" className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>Outdoor Location</span>
        </TabsTrigger>
        <TabsTrigger value="indoor" className="flex items-center gap-1">
          <Building className="h-4 w-4" />
          <span>Indoor Location</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="outdoor" className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for a location..."
              className="pl-8"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
            />
          </div>
          <Button type="button" variant="outline" onClick={searchLocation} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
          <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={isLoading}>
            <Navigation className="h-4 w-4" />
            <span className="sr-only">Use current location</span>
          </Button>
        </div>
        
        <div className="rounded-md border border-gray-300 bg-gray-100 h-40 relative overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full"></div>
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        
        <p className="text-xs text-gray-500">
          {isLoading 
            ? "Loading location data..." 
            : "Click on the map to set a location or search by address"
          }
        </p>
      </TabsContent>
      
      <TabsContent value="indoor" className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">Building</Label>
            <Select value={selectedBuildingId} onValueChange={handleBuildingChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {BUILDINGS.map(building => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="mb-2 block">Floor</Label>
            <Select value={selectedFloorId} onValueChange={handleFloorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a floor" />
              </SelectTrigger>
              <SelectContent>
                {selectedBuilding.floors.map(floor => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label className="mb-2 block">Room (Optional)</Label>
          <Select value={selectedRoomId} onValueChange={handleRoomChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a room or area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-room">No specific room</SelectItem>
              {selectedFloor.rooms.map(room => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="mb-2 block">Floor Plan</Label>
          {renderFloorPlan()}
        </div>
        
        <div>
          <Label className="mb-2 block">Additional Location Details (Optional)</Label>
          <Input
            placeholder="E.g., Near the window, By the door, etc."
            value={customLocation}
            onChange={handleCustomLocationChange}
          />
        </div>
        
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium">Selected Location:</p>
            <p className="text-base">{locationInput || "No location selected"}</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}