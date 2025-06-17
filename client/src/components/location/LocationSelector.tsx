import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building, LayoutDashboard, DoorClosed, Edit, Plus, Trash, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types for location data
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

interface LocationSelectorProps {
  onLocationSelect: (locationPath: string) => void;
  className?: string;
  title?: string;
  description?: string;
  editEnabled?: boolean; // Whether the user can edit locations directly
  allowCustomLocations?: boolean; // Whether to allow adding custom locations
}

/**
 * A component for selecting location from buildings, floors, and rooms
 * Provides structured location selection through building, floor, and room hierarchy
 * Now supports adding, editing, and removing locations directly
 */
export default function LocationSelector({
  onLocationSelect,
  className = '',
  title = '',
  description = '',
  editEnabled = true,
  allowCustomLocations = true
}: LocationSelectorProps) {
  const { t } = useTranslation();
  
  // State for location data
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  
  // State for editing locations
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showEditBuilding, setShowEditBuilding] = useState(false);
  const [showEditFloor, setShowEditFloor] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const { toast } = useToast();
  
  // Selected references
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const selectedFloor = selectedBuilding?.floors.find(f => f.id === selectedFloorId);
  const selectedRoom = selectedFloor?.rooms.find(r => r.id === selectedRoomId);
  
  // Load locations from localStorage
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      
      const savedLocations = localStorage.getItem('mcd-locations');
      if (savedLocations) {
        setBuildings(JSON.parse(savedLocations));
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
  
  // Functions for location management
  const handleAddBuilding = () => {
    if (!newLocationName.trim()) {
      toast({
        title: "Pole Wymagane",
        description: "Nazwa budynku jest wymagana",
        variant: "destructive",
      });
      return;
    }
    
    const newBuilding: BuildingData = {
      id: uuidv4(),
      name: newLocationName.trim(),
      floors: []
    };
    
    setBuildings([...buildings, newBuilding]);
    setNewLocationName('');
    setShowAddBuilding(false);
    
    toast({
      title: t('locations.buildingCreated'),
      description: t('locations.buildingCreatedDescription', { name: newBuilding.name }),
    });
    
    // Auto-select the new building
    setSelectedBuildingId(newBuilding.id);
  };
  
  const handleAddFloor = () => {
    if (!selectedBuildingId) {
      toast({
        title: t('validation.selectionRequired'),
        description: t('locations.selectBuildingFirst'),
        variant: "destructive",
      });
      return;
    }
    
    if (!newLocationName.trim()) {
      toast({
        title: "Pole Wymagane",
        description: "Nazwa piętra jest wymagana",
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        const newFloor: FloorData = {
          id: uuidv4(),
          name: newLocationName.trim(),
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
    setNewLocationName('');
    setShowAddFloor(false);
    
    // Find and select the newly created floor
    const newFloorId = updatedBuildings
      .find(b => b.id === selectedBuildingId)?.floors
      .slice(-1)[0]?.id;
    
    if (newFloorId) {
      setSelectedFloorId(newFloorId);
    }
    
    toast({
      title: t('locations.floorCreated'),
      description: t('locations.floorCreatedDescription'),
    });
  };
  
  const handleAddRoom = () => {
    if (!selectedBuildingId || !selectedFloorId) {
      toast({
        title: t('validation.selectionRequired'),
        description: t('locations.selectFloorFirst'),
        variant: "destructive",
      });
      return;
    }
    
    if (!newLocationName.trim()) {
      toast({
        title: "Pole Wymagane",
        description: "Nazwa pokoju jest wymagana",
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
                name: newLocationName.trim()
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
    setNewLocationName('');
    setShowAddRoom(false);
    
    // Find and select the newly created room
    const newRoomId = updatedBuildings
      .find(b => b.id === selectedBuildingId)?.floors
      .find(f => f.id === selectedFloorId)?.rooms
      .slice(-1)[0]?.id;
    
    if (newRoomId) {
      setSelectedRoomId(newRoomId);
    }
    
    toast({
      title: t('locations.roomCreated'),
      description: t('locations.roomCreatedDescription'),
    });
  };
  
  const handleEditBuilding = () => {
    if (!selectedBuildingId || !newLocationName.trim()) {
      toast({
        title: "Pole Wymagane",
        description: "Nazwa budynku jest wymagana",
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        return {
          ...building,
          name: newLocationName.trim()
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setNewLocationName('');
    setShowEditBuilding(false);
    
    toast({
      title: t('locations.buildingUpdated'),
      description: t('locations.buildingUpdatedDescription'),
    });
  };
  
  const handleEditFloor = () => {
    if (!selectedBuildingId || !selectedFloorId || !newLocationName.trim()) {
      toast({
        title: "Pole Wymagane",
        description: "Nazwa piętra jest wymagana",
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
                name: newLocationName.trim()
              };
            }
            return floor;
          })
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setNewLocationName('');
    setShowEditFloor(false);
    
    toast({
      title: t('locations.floorUpdated'),
      description: t('locations.floorUpdatedDescription'),
    });
  };
  
  const handleEditRoom = () => {
    if (!selectedBuildingId || !selectedFloorId || !selectedRoomId || !newLocationName.trim()) {
      toast({
        title: "Pole Wymagane",
        description: "Nazwa pokoju jest wymagana",
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
                rooms: floor.rooms.map(room => {
                  if (room.id === selectedRoomId) {
                    return {
                      ...room,
                      name: newLocationName.trim()
                    };
                  }
                  return room;
                })
              };
            }
            return floor;
          })
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setNewLocationName('');
    setShowEditRoom(false);
    
    toast({
      title: t('locations.roomUpdated'),
      description: t('locations.roomUpdatedDescription'),
    });
  };
  
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
    setSelectedBuildingId('');
    setSelectedFloorId('');
    setSelectedRoomId('');
    
    toast({
      title: t('locations.buildingDeleted'),
      description: t('locations.buildingDeletedDescription'),
    });
  };
  
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
    setSelectedFloorId('');
    setSelectedRoomId('');
    
    toast({
      title: t('locations.floorDeleted'),
      description: t('locations.floorDeletedDescription'),
    });
  };
  
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
    setSelectedRoomId('');
    
    toast({
      title: t('locations.roomDeleted'),
      description: t('locations.roomDeletedDescription'),
    });
  };
  
  // Update parent component when location selection changes
  useEffect(() => {
    // Create a formatted location path with proper symbols
    let locationPath = '';
    
    if (selectedBuilding) {
      locationPath = selectedBuilding.name;
      
      if (selectedFloor) {
        locationPath += ` > ${selectedFloor.name}`;
        
        if (selectedRoom) {
          locationPath += ` > ${selectedRoom.name}`;
        }
      }
    }
    
    console.log("Location selected in LocationSelector:", locationPath);
    
    // Always call onLocationSelect with the current path (even if empty)
    // This ensures the parent component receives updates
    onLocationSelect(locationPath);
    
  }, [selectedBuildingId, selectedFloorId, selectedRoomId, selectedBuilding, selectedFloor, selectedRoom, onLocationSelect]);
  
  // Reset lower level selections when higher level changes
  useEffect(() => {
    if (!selectedBuildingId) {
      setSelectedFloorId('');
      setSelectedRoomId('');
    }
  }, [selectedBuildingId]);
  
  useEffect(() => {
    if (!selectedFloorId) {
      setSelectedRoomId('');
    }
  }, [selectedFloorId]);
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>{title || t('locations.selectLocation')}</CardTitle>
        <CardDescription>
          {description || t('locations.selectLocationDescription')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-4">
          {/* Building selection with edit controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {t('locations.building')}
              </Label>
              
              {editEnabled && allowCustomLocations && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowAddBuilding(true)}
                    title={t('locations.addBuilding')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  
                  {selectedBuildingId && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setNewLocationName(selectedBuilding?.name || '');
                          setShowEditBuilding(true);
                        }}
                        title={t('locations.editBuilding')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDeleteBuilding}
                        title={t('locations.deleteBuilding')}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <Select
              value={selectedBuildingId}
              onValueChange={(value) => {
                setSelectedBuildingId(value);
                setSelectedFloorId('');
                setSelectedRoomId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('locations.selectBuilding')} />
              </SelectTrigger>
              <SelectContent>
                {buildings.length === 0 ? (
                  <SelectItem value="no-buildings" disabled>
                    {t('locations.noBuildings')}
                  </SelectItem>
                ) : (
                  buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Floor selection with edit controls - only show if a building is selected */}
          {selectedBuildingId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  <LayoutDashboard className="h-4 w-4" />
                  {t('locations.floor')}
                </Label>
                
                {editEnabled && allowCustomLocations && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowAddFloor(true)}
                      title={t('locations.addFloor')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    {selectedFloorId && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setNewLocationName(selectedFloor?.name || '');
                            setShowEditFloor(true);
                          }}
                          title={t('locations.editFloor')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleDeleteFloor}
                          title={t('locations.deleteFloor')}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <Select
                value={selectedFloorId}
                onValueChange={(value) => {
                  setSelectedFloorId(value);
                  setSelectedRoomId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('locations.selectFloor')} />
                </SelectTrigger>
                <SelectContent>
                  {!selectedBuilding || selectedBuilding.floors.length === 0 ? (
                    <SelectItem value="no-floors" disabled>
                      {t('locations.noFloors')}
                    </SelectItem>
                  ) : (
                    selectedBuilding.floors.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Room selection with edit controls - only show if a floor is selected */}
          {selectedFloorId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  <DoorClosed className="h-4 w-4" />
                  {t('locations.room')}
                </Label>
                
                {editEnabled && allowCustomLocations && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowAddRoom(true)}
                      title={t('locations.addRoom')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    {selectedRoomId && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setNewLocationName(selectedRoom?.name || '');
                            setShowEditRoom(true);
                          }}
                          title={t('locations.editRoom')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleDeleteRoom}
                          title={t('locations.deleteRoom')}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <Select
                value={selectedRoomId}
                onValueChange={setSelectedRoomId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('locations.selectRoom')} />
                </SelectTrigger>
                <SelectContent>
                  {!selectedFloor || selectedFloor.rooms.length === 0 ? (
                    <SelectItem value="no-rooms" disabled>
                      {t('locations.noRooms')}
                    </SelectItem>
                  ) : (
                    selectedFloor.rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Display the selected location for verification */}
          {selectedBuildingId && (
            <div className="mt-2 text-sm">
              <p className="font-medium text-muted-foreground">
                {t('locations.selectedLocation')}:
                <span className="font-bold text-primary ml-1">
                  {selectedBuilding?.name || ''}
                  {selectedFloor ? ` > ${selectedFloor.name}` : ''}
                  {selectedRoom ? ` > ${selectedRoom.name}` : ''}
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Dialogs for adding/editing locations */}
      {/* Add Building Dialog */}
      <Dialog open={showAddBuilding} onOpenChange={setShowAddBuilding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('locations.addBuilding')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="new-building-name">{t('locations.buildingName')}</Label>
            <Input 
              id="new-building-name"
              placeholder={t('locations.buildingNamePlaceholder')}
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBuilding(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddBuilding}>
              {t('locations.addBuilding')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Floor Dialog */}
      <Dialog open={showAddFloor} onOpenChange={setShowAddFloor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('locations.addFloor')}</DialogTitle>
            <DialogDescription>
              {t('locations.addFloorToBuilding', { building: selectedBuilding?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="new-floor-name">{t('locations.floorName')}</Label>
            <Input 
              id="new-floor-name"
              placeholder={t('locations.floorNamePlaceholder')}
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFloor(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddFloor}>
              {t('locations.addFloor')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Room Dialog */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('locations.addRoom')}</DialogTitle>
            <DialogDescription>
              {t('locations.addRoomToFloor', { 
                building: selectedBuilding?.name,
                floor: selectedFloor?.name 
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="new-room-name">{t('locations.roomName')}</Label>
            <Input 
              id="new-room-name"
              placeholder={t('locations.roomNamePlaceholder')}
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoom(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddRoom}>
              {t('locations.addRoom')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Building Dialog */}
      <Dialog open={showEditBuilding} onOpenChange={setShowEditBuilding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('locations.editBuilding')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="edit-building-name">{t('locations.buildingName')}</Label>
            <Input 
              id="edit-building-name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditBuilding(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditBuilding}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Floor Dialog */}
      <Dialog open={showEditFloor} onOpenChange={setShowEditFloor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('locations.editFloor')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="edit-floor-name">{t('locations.floorName')}</Label>
            <Input 
              id="edit-floor-name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditFloor(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditFloor}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Room Dialog */}
      <Dialog open={showEditRoom} onOpenChange={setShowEditRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('locations.editRoom')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="edit-room-name">{t('locations.roomName')}</Label>
            <Input 
              id="edit-room-name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRoom(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditRoom}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}