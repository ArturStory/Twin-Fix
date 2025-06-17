import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, MapPin, Plus, Building, Edit, Trash2 } from "lucide-react";

// Import Leaflet (already used in our IndoorLocationPicker component)
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Types for our building registry
interface Building {
  id: string;
  name: string;
  address: string;
  description?: string;
  latitude: number;
  longitude: number;
  floors: Floor[];
}

interface Floor {
  id: string;
  name: string;
  level: number;
  description?: string;
  imageUrl: string;
}

export default function BuildingRegistry() {
  const { toast } = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [isEditingBuilding, setIsEditingBuilding] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  
  // Map related refs and state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Form state for adding/editing buildings
  const [buildingForm, setBuildingForm] = useState({
    name: "",
    address: "",
    description: "",
    latitude: 0,
    longitude: 0
  });
  
  // Mock data for now - in a real app, we'd fetch this from the API
  useEffect(() => {
    // Simulate loading buildings from API
    setIsLoading(true);
    setTimeout(() => {
      setBuildings([
        {
          id: "bldg-1",
          name: "Main Office Building",
          address: "123 Company Street, City",
          description: "The primary headquarters with executive offices",
          latitude: 40.7128,
          longitude: -74.0060,
          floors: [
            {
              id: "floor-1-1",
              name: "Ground Floor",
              level: 0,
              description: "Reception, Security, Cafeteria",
              imageUrl: "/images/main-building-ground.jpg"
            },
            {
              id: "floor-1-2",
              name: "First Floor",
              level: 1,
              description: "Meeting Rooms, Development Teams",
              imageUrl: "/images/main-building-first.jpg"
            }
          ]
        },
        {
          id: "bldg-2",
          name: "Production Facility",
          address: "456 Industrial Avenue, City",
          description: "Manufacturing and logistics hub",
          latitude: 40.7118,
          longitude: -74.0050,
          floors: [
            {
              id: "floor-2-1",
              name: "Ground Floor",
              level: 0,
              description: "Assembly Line, Materials Storage",
              imageUrl: "/images/production-ground.jpg"
            }
          ]
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);
  
  // Initialize the map when the component mounts
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      // Default view centered on New York (would be user's location in a real app)
      const map = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Add click handler to select location
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setSelectedLocation({ lat, lng });
        setBuildingForm(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        
        // Add or move marker
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
      });
      
      mapRef.current = map;
      setMapLoaded(true);
    }
  }, []);
  
  // Update markers for all buildings once they're loaded
  useEffect(() => {
    if (mapRef.current && buildings.length > 0 && mapLoaded) {
      // Clear any existing markers
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      
      // Add markers for all buildings
      const bounds = L.latLngBounds([]);
      
      buildings.forEach(building => {
        const marker = L.marker([building.latitude, building.longitude])
          .bindPopup(`<b>${building.name}</b><br>${building.address}`)
          .addTo(mapRef.current!);
          
        bounds.extend([building.latitude, building.longitude]);
      });
      
      // Fit map to show all buildings
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [buildings, mapLoaded]);
  
  const handleAddBuilding = () => {
    // Reset form
    setBuildingForm({
      name: "",
      address: "",
      description: "",
      latitude: 0,
      longitude: 0
    });
    
    // Clear any markers
    if (markerRef.current && mapRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    
    setSelectedLocation(null);
    setIsAddingBuilding(true);
  };
  
  const handleEditBuilding = (building: Building) => {
    setSelectedBuildingId(building.id);
    setBuildingForm({
      name: building.name,
      address: building.address,
      description: building.description || "",
      latitude: building.latitude,
      longitude: building.longitude
    });
    
    // Set marker on the map
    if (mapRef.current) {
      if (markerRef.current) {
        markerRef.current.setLatLng([building.latitude, building.longitude]);
      } else {
        markerRef.current = L.marker([building.latitude, building.longitude]).addTo(mapRef.current);
      }
      
      // Center map on the building
      mapRef.current.setView([building.latitude, building.longitude], 15);
    }
    
    setSelectedLocation({ lat: building.latitude, lng: building.longitude });
    setIsEditingBuilding(true);
  };
  
  const handleDeleteBuilding = (buildingId: string) => {
    // In a real app, you'd call an API to delete the building
    // For now, we'll just update our local state
    setBuildings(prev => prev.filter(b => b.id !== buildingId));
    
    toast({
      title: "Building deleted",
      description: "The building has been removed from the registry",
    });
  };
  
  const handleSaveBuilding = () => {
    // Validate form
    if (!buildingForm.name || !buildingForm.address || !selectedLocation) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a location on the map",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, you'd call an API to save the building
    // For now, we'll just update our local state
    if (isEditingBuilding && selectedBuildingId) {
      // Update existing building
      setBuildings(prev => prev.map(b => 
        b.id === selectedBuildingId 
          ? {
              ...b,
              name: buildingForm.name,
              address: buildingForm.address,
              description: buildingForm.description || undefined,
              latitude: selectedLocation.lat,
              longitude: selectedLocation.lng
            }
          : b
      ));
      
      toast({
        title: "Building updated",
        description: "The building information has been updated",
      });
      
      setIsEditingBuilding(false);
    } else {
      // Add new building
      const newBuilding: Building = {
        id: `bldg-${Date.now()}`, // Generate a temporary ID
        name: buildingForm.name,
        address: buildingForm.address,
        description: buildingForm.description || undefined,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        floors: [] // Start with no floors
      };
      
      setBuildings(prev => [...prev, newBuilding]);
      
      toast({
        title: "Building added",
        description: "The new building has been added to the registry",
      });
      
      setIsAddingBuilding(false);
    }
    
    // Clear form and selected location
    setBuildingForm({
      name: "",
      address: "",
      description: "",
      latitude: 0,
      longitude: 0
    });
    
    setSelectedLocation(null);
    setSelectedBuildingId(null);
    
    // Clear marker
    if (markerRef.current && mapRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBuildingForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const renderBuildingTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (buildings.length === 0) {
      return (
        <div className="text-center p-8 bg-gray-50 rounded-md">
          <Building className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700">No Buildings Registered</h3>
          <p className="text-gray-500 mt-1 mb-4">
            Start by adding your first building to the registry.
          </p>
          <Button onClick={handleAddBuilding}>
            <Plus className="h-4 w-4 mr-2" />
            Add Building
          </Button>
        </div>
      );
    }
    
    return (
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-[100px]">Floors</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buildings.map(building => (
              <TableRow key={building.id}>
                <TableCell className="font-medium">{building.name}</TableCell>
                <TableCell>{building.address}</TableCell>
                <TableCell>{building.floors.length}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditBuilding(building)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Building</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete "{building.name}"? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {}}>Cancel</Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleDeleteBuilding(building.id)}
                          >
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Building Registry</h2>
          <p className="mt-1 text-gray-600">Manage all company buildings and their locations</p>
        </div>
        <Button onClick={handleAddBuilding}>
          <Plus className="h-4 w-4 mr-2" />
          Add Building
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buildings</CardTitle>
              <CardDescription>All registered company buildings</CardDescription>
            </CardHeader>
            <CardContent>
              {renderBuildingTable()}
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location Map</CardTitle>
              <CardDescription>View building locations on the map</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] rounded-md overflow-hidden">
                <div ref={mapContainerRef} className="w-full h-full"></div>
                {!mapLoaded && (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Click on the map to set building location
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog 
        open={isAddingBuilding || isEditingBuilding} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingBuilding(false);
            setIsEditingBuilding(false);
            setSelectedBuildingId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEditingBuilding ? "Edit Building" : "Add New Building"}
            </DialogTitle>
            <DialogDescription>
              {isEditingBuilding 
                ? "Update building information and location" 
                : "Register a new building in the company registry"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Building Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Main Office Building" 
                  value={buildingForm.name}
                  onChange={handleFormChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  name="address" 
                  placeholder="123 Company Street, City" 
                  value={buildingForm.address}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Brief description of the building and its function" 
                value={buildingForm.description}
                onChange={handleFormChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="h-[200px] rounded-md overflow-hidden border">
                <div className="w-full h-full">
                  {/* This is our map container - handled by the useEffect hook */}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {selectedLocation 
                  ? `Selected: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}` 
                  : "Click on the map to set the building location"}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingBuilding(false);
                setIsEditingBuilding(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveBuilding}
              disabled={!selectedLocation || !buildingForm.name || !buildingForm.address}
            >
              {isEditingBuilding ? "Update Building" : "Add Building"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}