import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Building, FileText, Plus, Save, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from '@/lib/queryClient';


export interface BuildingDetails {
  buildingId: string;
  buildingName: string;
  floorId?: string;
  floorName?: string;
  roomId?: string;
  roomName?: string;
  details?: string;
}

interface BuildingSelectorProps {
  onLocationSelected: (location: string, details: BuildingDetails) => void;
  initialValue?: string;
}

// Data structures for buildings and floors
interface BuildingData {
  id: string;
  name: string;
  floors: FloorData[];
}

interface FloorData {
  id: string;
  name: string;
  rooms: RoomData[];
}

interface RoomData {
  id: string;
  name: string;
}

// Initial buildings data
// Standard McDonald's room layout to use in all locations
const standardMcDonaldsRooms = [
  { id: "dining-area", name: "Dining Area" },
  { id: "kitchen", name: "Kitchen" },
  { id: "drive-thru", name: "Drive-thru" },
  { id: "restrooms", name: "Restrooms" },
  { id: "backoffice", name: "Back Office" },
  { id: "storage", name: "Storage" },
  { id: "freezer", name: "Freezer" },
  { id: "counter", name: "Service Counter" }
];

const INITIAL_BUILDINGS: BuildingData[] = [
  {
    id: "mcdonalds-downtown",
    name: "McDonald's Downtown",
    floors: [
      {
        id: "ground-floor",
        name: "Ground Floor",
        rooms: [...standardMcDonaldsRooms]
      }
    ]
  },
  {
    id: "mcdonalds-mall",
    name: "McDonald's Shopping Mall",
    floors: [
      {
        id: "mall-floor",
        name: "Mall Floor",
        rooms: [...standardMcDonaldsRooms]
      }
    ]
  },
  {
    id: "jakubowski-mcdonalds",
    name: "Jakubowski McDonald's",
    floors: [
      {
        id: "restaurant-floor",
        name: "Restaurant Floor",
        rooms: [...standardMcDonaldsRooms]
      }
    ]
  }
];

export default function BuildingSelector({ onLocationSelected, initialValue = "" }: BuildingSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for location data
  const [buildings, setBuildings] = useState<BuildingData[]>([...INITIAL_BUILDINGS]); // Copy of initial data
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(INITIAL_BUILDINGS[0]?.id || "");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [additionalDetails, setAdditionalDetails] = useState<string>("");
  const [locationText, setLocationText] = useState<string>(initialValue);

  // State for creating new locations
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [isAddingFloor, setIsAddingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  // Get selected building, floor, and room objects
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId) || buildings[0];
  const selectedFloor = selectedBuilding?.floors.find(f => f.id === selectedFloorId) || (selectedBuilding?.floors[0] || null);
  const selectedRoom = selectedFloorId && selectedRoomId ? 
    selectedFloor?.rooms.find(r => r.id === selectedRoomId) : null;

  // When building selection changes, reset floor and room
  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    const building = buildings.find(b => b.id === buildingId);
    if (building && building.floors.length > 0) {
      setSelectedFloorId(building.floors[0].id);
      setSelectedRoomId("");
    } else {
      setSelectedFloorId("");
      setSelectedRoomId("");
    }
    updateLocationText();
  };

  // When floor selection changes, reset room
  const handleFloorChange = (floorId: string) => {
    setSelectedFloorId(floorId);
    setSelectedRoomId("");
    updateLocationText();
  };

  const handleRoomChange = (roomId: string) => {
    // If "no-room" is selected, we set an empty string for the room ID
    setSelectedRoomId(roomId === "no-room" ? "" : roomId);
    updateLocationText();
  };

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdditionalDetails(e.target.value);
    updateLocationText();
  };

  // Add new building
  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) {
      toast({
        title: t('locations.errors.emptyName'),
        description: t('locations.errors.enterBuildingName'),
        variant: "destructive"
      });
      return;
    }

    const newBuildingId = `building-${Date.now()}`;
    const newBuilding: BuildingData = {
      id: newBuildingId,
      name: newBuildingName,
      floors: [
        {
          id: `${newBuildingId}-floor-1`,
          name: "Ground Floor",
          rooms: [
            { id: "dining-area", name: "Dining Area" },
            { id: "kitchen", name: "Kitchen" },
            { id: "drive-thru", name: "Drive-thru" },
            { id: "restrooms", name: "Restrooms" },
            { id: "backoffice", name: "Back Office" },
            { id: "storage", name: "Storage" },
            { id: "freezer", name: "Freezer" },
            { id: "counter", name: "Service Counter" }
          ]
        }
      ]
    };

    // Add to local state
    setBuildings(prev => [...prev, newBuilding]);
    setSelectedBuildingId(newBuildingId);
    setSelectedFloorId(newBuilding.floors[0].id);
    setIsAddingBuilding(false);
    setNewBuildingName("");
    
    toast({
      title: t('locations.buildingAdded'),
      description: t('locations.buildingAddedSuccess', { name: newBuilding.name }),
    });

    // Update location text after state updates
    setTimeout(updateLocationText, 0);
  };

  // Add new floor to selected building
  const handleAddFloor = () => {
    if (!newFloorName.trim()) {
      toast({
        title: t('locations.errors.emptyName'),
        description: t('locations.errors.enterFloorName'),
        variant: "destructive"
      });
      return;
    }

    if (!selectedBuilding) {
      toast({
        title: t('locations.errors.noBuildingSelected'),
        description: t('locations.errors.selectBuildingFirst'),
        variant: "destructive"
      });
      return;
    }

    const newFloorId = `${selectedBuilding.id}-floor-${Date.now()}`;
    const newFloor: FloorData = {
      id: newFloorId,
      name: newFloorName,
      rooms: [...standardMcDonaldsRooms]
    };

    // Update the selected building with the new floor
    setBuildings(prev => 
      prev.map(building => 
        building.id === selectedBuilding.id 
          ? { ...building, floors: [...building.floors, newFloor] }
          : building
      )
    );

    setSelectedFloorId(newFloorId);
    setIsAddingFloor(false);
    setNewFloorName("");
    
    toast({
      title: t('locations.floorAdded'),
      description: t('locations.floorAddedSuccess', { name: newFloor.name }),
    });

    // Update location text after state updates
    setTimeout(updateLocationText, 0);
  };

  // Add new room to selected floor
  const handleAddRoom = () => {
    if (!newRoomName.trim()) {
      toast({
        title: t('locations.errors.emptyName'),
        description: t('locations.errors.enterRoomName'),
        variant: "destructive"
      });
      return;
    }

    if (!selectedBuilding || !selectedFloor) {
      toast({
        title: t('locations.errors.noFloorSelected'),
        description: t('locations.errors.selectFloorFirst'),
        variant: "destructive"
      });
      return;
    }

    const newRoomId = `${selectedFloor.id}-room-${Date.now()}`;
    const newRoom: RoomData = {
      id: newRoomId,
      name: newRoomName
    };

    // Update the selected building and floor with the new room
    setBuildings(prev => 
      prev.map(building => 
        building.id === selectedBuilding.id 
          ? {
              ...building,
              floors: building.floors.map(floor => 
                floor.id === selectedFloor.id
                  ? { ...floor, rooms: [...floor.rooms, newRoom] }
                  : floor
              )
            }
          : building
      )
    );

    setSelectedRoomId(newRoomId);
    setIsAddingRoom(false);
    setNewRoomName("");
    
    toast({
      title: t('locations.roomAdded'),
      description: t('locations.roomAddedSuccess', { name: newRoom.name }),
    });

    // Update location text after state updates
    setTimeout(updateLocationText, 0);
  };

  const updateLocationText = () => {
    let text = "";
    
    if (selectedBuilding) {
      text += selectedBuilding.name;
      
      if (selectedFloor) {
        text += `, ${selectedFloor.name}`;
        
        if (selectedRoom) {
          text += `, ${selectedRoom.name}`;
        }
      }
      
      if (additionalDetails) {
        text += ` (${additionalDetails})`;
      }
    }
    
    setLocationText(text);
    
    // Send the data back to the parent component
    const details: BuildingDetails = {
      buildingId: selectedBuilding?.id || "",
      buildingName: selectedBuilding?.name || "",
      floorId: selectedFloor?.id,
      floorName: selectedFloor?.name,
      roomId: selectedRoom?.id,
      roomName: selectedRoom?.name,
      details: additionalDetails || undefined
    };
    
    onLocationSelected(text, details);
  };

  // Initialize the component with first building/floor if none is selected
  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(buildings[0].id);
      
      if (buildings[0].floors.length > 0) {
        setSelectedFloorId(buildings[0].floors[0].id);
      }
      
      updateLocationText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  return (
    <div>
      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <Label htmlFor="building">{t('locations.building')}</Label>
          <Dialog open={isAddingBuilding} onOpenChange={setIsAddingBuilding}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex gap-1">
                <Plus size={16} /> {t('locations.addBuilding')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('locations.addNewBuilding')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-building-name">{t('locations.buildingName')}</Label>
                  <Input
                    id="new-building-name"
                    placeholder={t('locations.buildingNamePlaceholder')}
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddBuilding} className="flex gap-1">
                  <Save size={16} /> {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Select value={selectedBuildingId} onValueChange={handleBuildingChange}>
          <SelectTrigger id="building">
            <SelectValue placeholder={t('locations.selectBuilding')} />
          </SelectTrigger>
          <SelectContent>
            {buildings.map((building: BuildingData) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedBuilding && (
          <>
            <div className="flex justify-between items-center mt-2">
              <Label htmlFor="floor">{t('locations.floor')}</Label>
              <Dialog open={isAddingFloor} onOpenChange={setIsAddingFloor}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="flex gap-1">
                    <Plus size={16} /> {t('locations.addFloor')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('locations.addNewFloor')}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-floor-name">{t('locations.floorName')}</Label>
                      <Input
                        id="new-floor-name"
                        placeholder={t('locations.floorNamePlaceholder')}
                        value={newFloorName}
                        onChange={(e) => setNewFloorName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddFloor} className="flex gap-1">
                      <Save size={16} /> {t('common.save')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <Select value={selectedFloorId} onValueChange={handleFloorChange}>
              <SelectTrigger id="floor">
                <SelectValue placeholder={t('locations.selectFloor')} />
              </SelectTrigger>
              <SelectContent>
                {selectedBuilding.floors.map((floor: FloorData) => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        
        {selectedFloor && (
          <>
            <div className="flex justify-between items-center mt-2">
              <Label htmlFor="room">{t('locations.room')}</Label>
              <Dialog open={isAddingRoom} onOpenChange={setIsAddingRoom}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="flex gap-1">
                    <Plus size={16} /> {t('locations.addRoom')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('locations.addNewRoom')}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-room-name">{t('locations.roomName')}</Label>
                      <Input
                        id="new-room-name"
                        placeholder={t('locations.roomNamePlaceholder')}
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddRoom} className="flex gap-1">
                      <Save size={16} /> {t('common.save')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <Select value={selectedRoomId || "no-room"} onValueChange={handleRoomChange}>
              <SelectTrigger id="room">
                <SelectValue placeholder={t('locations.selectRoom')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-room">{t('locations.noSpecificRoom')}</SelectItem>
                {selectedFloor.rooms.map((room: RoomData) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        
        <div className="mt-2">
          <Label htmlFor="details">{t('locations.additionalDetails')}</Label>
          <Input
            id="details"
            placeholder={t('locations.additionalDetailsPlaceholder')}
            value={additionalDetails}
            onChange={handleDetailsChange}
          />
        </div>
        
        <div className="mt-4 border p-3 bg-muted/20 rounded-md">
          <Label className="mb-1 block">{t('locations.selectedLocation')}</Label>
          <p className="text-sm p-2 border rounded-md bg-background">
            {locationText || t('locations.noLocation')}
          </p>
        </div>
      </div>
    </div>
  );
}