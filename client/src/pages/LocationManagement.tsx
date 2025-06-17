import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Check, Building, LayoutDashboard, DoorClosed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TranslateLocationName } from "@/components/location/TranslateLocationName";

// Types for buildings data
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

export default function LocationManagement() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  // Helper function to get localized validation messages
  const getValidationMessage = (key: string) => {
    const currentLang = i18n.language;
    const messages: { [key: string]: { [lang: string]: string } } = {
      requiredField: {
        en: "Required Field",
        es: "Campo Obligatorio", 
        pl: "Pole Wymagane"
      },
      buildingNameRequired: {
        en: "Building name is required",
        es: "El nombre del edificio es obligatorio",
        pl: "Nazwa budynku jest wymagana"
      },
      floorNameRequired: {
        en: "Floor name is required", 
        es: "El nombre del piso es obligatorio",
        pl: "Nazwa piętra jest wymagana"
      },
      roomNameRequired: {
        en: "Room name is required",
        es: "El nombre de la habitación es obligatorio", 
        pl: "Nazwa pokoju jest wymagana"
      }
    };
    return messages[key]?.[currentLang] || messages[key]?.["en"] || key;
  };
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [activeTab, setActiveTab] = useState("create-building");
  
  // Form state
  const [newBuildingName, setNewBuildingName] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [newFloorName, setNewFloorName] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  
  // References to selected items
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const selectedFloor = selectedBuilding?.floors.find(f => f.id === selectedFloorId);
  
  // Load data from localStorage
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      
      const savedLocations = localStorage.getItem('mcd-locations');
      if (savedLocations) {
        setBuildings(JSON.parse(savedLocations));
      } else {
        // Add example locations if none exist
        const exampleBuildings: BuildingData[] = [
          {
            id: uuidv4(),
            name: "McDonald's - Main Street",
            floors: [
              {
                id: uuidv4(),
                name: "Ground Floor", // Use English names in data, translations will be applied in UI
                rooms: [
                  { id: uuidv4(), name: "Kitchen" },
                  { id: uuidv4(), name: "Dining Area" },
                  { id: uuidv4(), name: "Restrooms" }
                ]
              },
              {
                id: uuidv4(),
                name: "First Floor",
                rooms: [
                  { id: uuidv4(), name: "Office" },
                  { id: uuidv4(), name: "Storage" },
                  { id: uuidv4(), name: "Staff Room" }
                ]
              }
            ]
          },
          {
            id: uuidv4(),
            name: "McDonald's - Downtown",
            floors: [
              {
                id: uuidv4(),
                name: "Main Floor",
                rooms: [
                  { id: uuidv4(), name: "Kitchen" },
                  { id: uuidv4(), name: "Counter Area" },
                  { id: uuidv4(), name: "Dining Area" }
                ]
              }
            ]
          }
        ];
        
        setBuildings(exampleBuildings);
        localStorage.setItem('mcd-locations', JSON.stringify(exampleBuildings));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }, []);
  
  // Save buildings to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || buildings.length === 0) return;
      localStorage.setItem('mcd-locations', JSON.stringify(buildings));
    } catch (error) {
      console.error('Error saving locations:', error);
    }
  }, [buildings]);
  
  // Handle creating a new building
  const handleCreateBuilding = () => {
    if (!newBuildingName.trim()) {
      toast({
        title: getValidationMessage('requiredField'),
        description: getValidationMessage('buildingNameRequired'),
        variant: "destructive",
      });
      return;
    }
    
    const newBuilding: BuildingData = {
      id: uuidv4(),
      name: newBuildingName.trim(),
      floors: []
    };
    
    setBuildings([...buildings, newBuilding]);
    setNewBuildingName("");
    
    toast({
      title: t('locations.buildingCreated'),
      description: t('locations.buildingCreatedDescription', { name: newBuilding.name }),
      variant: "default",
    });
    
    // Auto-select the new building for adding floors
    setSelectedBuildingId(newBuilding.id);
    setActiveTab("create-floor");
  };
  
  // Handle creating a new floor
  const handleCreateFloor = () => {
    if (!selectedBuildingId) {
      toast({
        title: t('validation.selectionRequired'),
        description: t('locations.selectBuildingFirst'),
        variant: "destructive",
      });
      return;
    }
    
    if (!newFloorName.trim()) {
      toast({
        title: getValidationMessage('requiredField'),
        description: getValidationMessage('floorNameRequired'),
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        const newFloor: FloorData = {
          id: uuidv4(),
          name: newFloorName.trim(),
          rooms: []
        };
        
        return {
          ...building,
          floors: [...building.floors, newFloor]
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setNewFloorName("");
    
    // Get the ID of the new floor
    const newFloorId = updatedBuildings
      .find(b => b.id === selectedBuildingId)?.floors
      .slice(-1)[0]?.id;
    
    if (newFloorId) {
      setSelectedFloorId(newFloorId);
    }
    
    toast({
      title: t('locations.floorCreated'),
      description: t('locations.floorCreatedDescription'),
      variant: "default",
    });
    
    // Auto-switch to room creation
    setActiveTab("create-room");
  };
  
  // Handle creating a new room
  const handleCreateRoom = () => {
    if (!selectedBuildingId || !selectedFloorId) {
      toast({
        title: t('validation.selectionRequired'),
        description: t('locations.selectFloorFirst'),
        variant: "destructive",
      });
      return;
    }
    
    if (!newRoomName.trim()) {
      toast({
        title: getValidationMessage('requiredField'),
        description: getValidationMessage('roomNameRequired'),
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        return {
          ...building,
          floors: building.floors.map(floor => {
            if (floor.id === selectedFloorId) {
              const newRoom: RoomData = {
                id: uuidv4(),
                name: newRoomName.trim()
              };
              
              return {
                ...floor,
                rooms: [...floor.rooms, newRoom]
              };
            }
            return floor;
          })
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setNewRoomName("");
    
    toast({
      title: t('locations.roomCreated'),
      description: t('locations.roomCreatedDescription'),
      variant: "default",
    });
  };
  
  // Handle deleting a building
  const handleDeleteBuilding = () => {
    if (!selectedBuildingId) {
      toast({
        title: t('validation.selectionRequired'),
        description: t('locations.selectBuildingToDelete'),
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.filter(b => b.id !== selectedBuildingId);
    setBuildings(updatedBuildings);
    setSelectedBuildingId("");
    setSelectedFloorId("");
    setSelectedRoomId("");
    
    toast({
      title: t('locations.buildingDeleted'),
      description: t('locations.buildingDeletedDescription'),
      variant: "default",
    });
  };
  
  // Handle deleting a floor
  const handleDeleteFloor = () => {
    if (!selectedBuildingId || !selectedFloorId) {
      toast({
        title: t('validation.selectionRequired'),
        description: t('locations.selectFloorToDelete'),
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        return {
          ...building,
          floors: building.floors.filter(f => f.id !== selectedFloorId)
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setSelectedFloorId("");
    setSelectedRoomId("");
    
    toast({
      title: "Floor Deleted",
      description: "The floor has been successfully removed from the location",
      variant: "default",
    });
  };
  
  // Handle deleting a room
  const handleDeleteRoom = () => {
    if (!selectedBuildingId || !selectedFloorId || !selectedRoomId) {
      toast({
        title: t('validation.selectionRequired'),
        description: t('locations.selectRoomToDelete'),
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        return {
          ...building,
          floors: building.floors.map(floor => {
            if (floor.id === selectedFloorId) {
              return {
                ...floor,
                rooms: floor.rooms.filter(r => r.id !== selectedRoomId)
              };
            }
            return floor;
          })
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setSelectedRoomId("");
    
    toast({
      title: "Room Deleted",
      description: "The room has been successfully removed from the floor",
      variant: "default",
    });
  };
  
  // Hardcoded translations as a fallback in case the i18n system isn't working properly
  const getTranslation = (key: string, defaultValue: string) => {
    const translated = t(key);
    // If the translation is returning the raw key, use the default value instead
    return translated === key ? defaultValue : translated;
  };

  return (
    <div className="container mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{getTranslation('locations.locationManagement', 'Location Management')}</h1>
        <p className="text-muted-foreground">{getTranslation('locations.managementDescription', 'Manage buildings, floors and rooms')}</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="create-building">
            <Building className="mr-2 h-4 w-4" />
            {getTranslation('locations.addBuilding', 'Add Building')}
          </TabsTrigger>
          <TabsTrigger value="create-floor">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {getTranslation('locations.addFloor', 'Add Floor')}
          </TabsTrigger>
          <TabsTrigger value="create-room">
            <DoorClosed className="mr-2 h-4 w-4" />
            {getTranslation('locations.addRoom', 'Add Room')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create-building">
          <Card>
            <CardHeader>
              <CardTitle>{getTranslation('locations.addBuilding', 'Add Building')}</CardTitle>
              <CardDescription>{getTranslation('locations.addBuildingDescription', 'Add a new building to your locations')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="building-name">{getTranslation('locations.buildingName', 'Building Name')}</Label>
                  <Input
                    id="building-name"
                    placeholder={getTranslation('locations.buildingNamePlaceholder', 'Enter the building name')}
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateBuilding}>
                  <Plus className="mr-2 h-4 w-4" />
                  {getTranslation('locations.addBuilding', 'Add Building')}
                </Button>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>{getTranslation('locations.deleteBuilding', 'Delete Building')}</Label>
                  <Select
                    value={selectedBuildingId}
                    onValueChange={setSelectedBuildingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={getTranslation('locations.selectBuilding', 'Select Building')} />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="destructive" onClick={handleDeleteBuilding}>
                  <Trash className="mr-2 h-4 w-4" />
                  {getTranslation('locations.deleteBuilding', 'Delete Building')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create-floor">
          <Card>
            <CardHeader>
              <CardTitle>{getTranslation('locations.addFloor', 'Add Floor')}</CardTitle>
              <CardDescription>{getTranslation('locations.addFloorDescription', 'Add a new floor to the selected building')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>{getTranslation('locations.selectBuilding', 'Select Building')}</Label>
                  <Select
                    value={selectedBuildingId}
                    onValueChange={setSelectedBuildingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={getTranslation('locations.selectBuilding', 'Select Building')} />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="floor-name">{getTranslation('locations.floorName', 'Floor Name')}</Label>
                  <Input
                    id="floor-name"
                    placeholder={getTranslation('locations.floorNamePlaceholder', 'Enter the floor name')}
                    value={newFloorName}
                    onChange={(e) => setNewFloorName(e.target.value)}
                  />
                </div>
                
                <Button onClick={handleCreateFloor} disabled={!selectedBuildingId}>
                  <Plus className="mr-2 h-4 w-4" />
                  {getTranslation('locations.addFloor', 'Add Floor')}
                </Button>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>{getTranslation('locations.selectFloorToDelete', 'Select Floor to Delete')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={selectedBuildingId}
                      onValueChange={(value) => {
                        setSelectedBuildingId(value);
                        setSelectedFloorId(""); // Reset floor selection
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation('locations.selectBuilding', 'Select Building')} />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={selectedFloorId}
                      onValueChange={setSelectedFloorId}
                      disabled={!selectedBuildingId || !selectedBuilding?.floors.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation('locations.selectFloor', 'Select Floor')} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedBuilding?.floors.map((floor) => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  variant="destructive"
                  onClick={handleDeleteFloor}
                  disabled={!selectedBuildingId || !selectedFloorId}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {getTranslation('locations.deleteFloor', 'Delete Floor')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create-room">
          <Card>
            <CardHeader>
              <CardTitle>{getTranslation('locations.addRoom', 'Add Room')}</CardTitle>
              <CardDescription>{getTranslation('locations.addRoomDescription', 'Add a new room to the selected floor')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>{getTranslation('locations.selectLocation', 'Select Location')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={selectedBuildingId}
                      onValueChange={(value) => {
                        setSelectedBuildingId(value);
                        setSelectedFloorId(""); // Reset floor and room selections
                        setSelectedRoomId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation('locations.selectBuilding', 'Select Building')} />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={selectedFloorId}
                      onValueChange={setSelectedFloorId}
                      disabled={!selectedBuildingId || !selectedBuilding?.floors.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation('locations.selectFloor', 'Select Floor')} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedBuilding?.floors.map((floor) => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="room-name">{getTranslation('locations.roomName', 'Room Name')}</Label>
                  <Input
                    id="room-name"
                    placeholder={getTranslation('locations.roomNamePlaceholder', 'Enter the room name')}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                  />
                </div>
                
                <Button
                  onClick={handleCreateRoom}
                  disabled={!selectedBuildingId || !selectedFloorId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {getTranslation('locations.addRoom', 'Add Room')}
                </Button>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>{getTranslation('locations.selectRoomToDelete', 'Select Room to Delete')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={selectedBuildingId}
                      onValueChange={(value) => {
                        setSelectedBuildingId(value);
                        setSelectedFloorId(""); // Reset floor and room selections
                        setSelectedRoomId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation('locations.selectBuilding', 'Select Building')} />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={selectedFloorId}
                      onValueChange={(value) => {
                        setSelectedFloorId(value);
                        setSelectedRoomId(""); // Reset room selection
                      }}
                      disabled={!selectedBuildingId || !selectedBuilding?.floors.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation('locations.selectFloor', 'Select Floor')} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedBuilding?.floors.map((floor) => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={selectedRoomId}
                      onValueChange={setSelectedRoomId}
                      disabled={!selectedBuildingId || !selectedFloorId || !selectedFloor?.rooms.length}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation('locations.selectRoom', 'Select Room')} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedFloor?.rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  variant="destructive"
                  onClick={handleDeleteRoom}
                  disabled={!selectedBuildingId || !selectedFloorId || !selectedRoomId}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {getTranslation('locations.deleteRoom', 'Delete Room')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Current Location Structure Display */}
      <Card className="mt-10">
        <CardHeader>
          <CardTitle>{getTranslation('locations.currentStructure', 'Current Structure')}</CardTitle>
          <CardDescription>{getTranslation('locations.currentStructureDescription', 'Layout and organization of the current establishment')}</CardDescription>
        </CardHeader>
        <CardContent>
          {buildings.length > 0 ? (
            <div className="space-y-6">
              {buildings.map((building) => (
                <div key={building.id} className="border rounded-md p-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Building className="mr-2 h-4 w-4" />
                    {building.name}
                  </h3>
                  
                  {building.floors.length > 0 ? (
                    <div className="ml-6 mt-2 space-y-4">
                      {building.floors.map((floor) => (
                        <div key={floor.id} className="border-l pl-4 py-2">
                          <h4 className="font-medium flex items-center">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            {getTranslation(
                              // Map standard floor names to their translation keys
                              floor.name === "Ground Floor" ? "locations.groundFloor" :
                              floor.name === "First Floor" ? "locations.firstFloor" :
                              floor.name === "Main Floor" ? "locations.mainFloor" :
                              floor.name.startsWith('locations.') ? floor.name :
                              "locations." + floor.name.toLowerCase().replace(/\s+/g, ''),
                              // Default name if translation fails
                              floor.name
                            )}
                          </h4>
                          
                          {floor.rooms.length > 0 ? (
                            <ul className="ml-6 mt-2 space-y-1">
                              {floor.rooms.map((room) => (
                                <li key={room.id} className="flex items-center text-sm">
                                  <DoorClosed className="mr-2 h-3 w-3" />
                                  {getTranslation(
                                    // Map standard room names to their translation keys
                                    room.name === "Kitchen" ? "locations.kitchen" :
                                    room.name === "Dining Area" ? "locations.diningArea" :
                                    room.name === "Counter Area" ? "locations.counterArea" :
                                    room.name === "Restrooms" ? "locations.restrooms" :
                                    room.name === "Office" ? "locations.office" :
                                    room.name === "Storage" ? "locations.storage" :
                                    room.name.startsWith('locations.') ? room.name :
                                    "locations." + room.name.toLowerCase().replace(/\s+/g, ''),
                                    // Default name if translation fails
                                    room.name
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="ml-6 text-sm text-muted-foreground">
                              No rooms added yet
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="ml-6 text-sm text-muted-foreground">
                      No floors added yet
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                No locations added yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}