import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import i18n from '@/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Store, MapPin, Building, Loader2, Plus, Trash2 } from "lucide-react";

// These would come from your API in a real implementation
// Standard locations
const ALL_STANDARD_LOCATIONS = [
  {
    id: 1,
    name: "Jakubowski McDonald's",
    address: "Jana Bazynskiego 2, Gdansk",
    type: "restaurant",
    image: "https://placehold.co/600x400/png/webp?text=Jakubowski+McDonald's"
  },
  {
    id: 2,
    name: "Centrum McDonald's",
    address: "Zlota 59, Warsaw",
    type: "restaurant",
    image: "https://placehold.co/600x400/png/webp?text=Centrum+McDonald's"
  },
  {
    id: 3,
    name: "Galeria Baltycka McDonald's",
    address: "Grunwaldzka 141, Gdansk",
    type: "restaurant",
    image: "https://placehold.co/600x400/png/webp?text=Galeria+Baltycka+McDonald's"
  }
];

// Type definition for a custom location
interface CustomLocation {
  id: string;
  name: string;
  address: string;
  type: string;
  isCustom: boolean;
}

export default function LocationSelection() {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationType, setNewLocationType] = useState("restaurant");
  const [removedStandardLocations, setRemovedStandardLocations] = useState<string[]>(() => {
    // Load removed standard locations from localStorage
    const savedRemovedLocations = localStorage.getItem('removedStandardLocations');
    return savedRemovedLocations ? JSON.parse(savedRemovedLocations) : [];
  });
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>(() => {
    // Load custom locations from localStorage on component mount
    const savedLocations = localStorage.getItem('customLocations');
    return savedLocations ? JSON.parse(savedLocations) : [];
  });

  // Fetch shared locations from database
  const { data: sharedLocations = [] } = useQuery<any[]>({
    queryKey: ['/api/shared-locations'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Combine all available locations
  const LOCATIONS = useMemo(() => {
    // Start with filtered standard locations (excluding removed ones)
    const standardLocations = ALL_STANDARD_LOCATIONS.filter(
      location => !removedStandardLocations.includes(location.id.toString())
    );
    
    // Add shared locations from database
    const sharedLocationsList = sharedLocations.map((loc: any) => ({
      id: `shared-${loc.id}`,
      name: loc.name,
      address: loc.address || '',
      type: loc.type || 'restaurant'
    }));
    
    // Combine all locations and remove duplicates by name
    const allLocations = [...standardLocations, ...sharedLocationsList];
    return allLocations.filter((location, index, self) => 
      index === self.findIndex(l => l.name.toLowerCase() === location.name.toLowerCase())
    );
  }, [sharedLocations, removedStandardLocations]);

  const handleContinue = () => {
    if (!selectedLocation) return;
    
    setLoading(true);
    
    // In a real implementation, you might want to store the selected location
    // in a context or state management solution
    localStorage.setItem('selectedLocation', selectedLocation);
    
    // Simulate a small delay to show loading
    setTimeout(() => {
      setLocation(`/machines?location=${selectedLocation}`);
    }, 500);
  };
  
  const handleAddLocation = () => {
    if (!newLocationName || !newLocationAddress) return;
    
    // Create a unique ID for the custom location
    const newLocationId = `custom-${Date.now()}`;
    
    // Create the new location object
    const newLocation: CustomLocation = {
      id: newLocationId,
      name: newLocationName,
      address: newLocationAddress,
      type: newLocationType,
      isCustom: true
    };
    
    // Add to custom locations
    const updatedLocations = [...customLocations, newLocation];
    setCustomLocations(updatedLocations);
    
    // Save to localStorage
    localStorage.setItem('customLocations', JSON.stringify(updatedLocations));
    
    // Select the new location
    setSelectedLocation(newLocationId);
    
    // Reset form and close dialog
    setNewLocationName("");
    setNewLocationAddress("");
    setNewLocationType("restaurant");
    setShowAddLocationDialog(false);
  };

  const handleRemoveLocation = () => {
    if (!selectedLocation) return;
    
    let locationName = "";
    
    // Check if it's a standard or custom location
    if (selectedLocation.startsWith('custom-')) {
      // Get custom location object
      const customLocation = customLocations.find(loc => loc.id === selectedLocation);
      if (!customLocation) return;
      locationName = customLocation.name;
    } else {
      // Get standard location name
      const standardLocation = ALL_STANDARD_LOCATIONS.find(loc => loc.id.toString() === selectedLocation);
      if (!standardLocation) return;
      locationName = standardLocation.name;
    }
    
    // Confirm before removing
    if (window.confirm(t('locations.confirmRemove', { locationName }))) {
      if (selectedLocation.startsWith('custom-')) {
        // Filter out the custom location
        const updatedLocations = customLocations.filter(loc => loc.id !== selectedLocation);
        // Save updated locations to localStorage
        localStorage.setItem('customLocations', JSON.stringify(updatedLocations));
        // Update state
        setCustomLocations(updatedLocations);
      } else {
        // For standard locations, add to removedStandardLocations
        const updatedRemovedLocations = [...removedStandardLocations];
        
        // Add this location ID to the removed list if not already there
        if (!updatedRemovedLocations.includes(selectedLocation)) {
          updatedRemovedLocations.push(selectedLocation);
          localStorage.setItem('removedStandardLocations', JSON.stringify(updatedRemovedLocations));
          // Update state
          setRemovedStandardLocations(updatedRemovedLocations);
        }
      }
      
      // Reset selection
      setSelectedLocation("");
      
      // Remove any machines associated with this location
      const existingMachinesJson = localStorage.getItem('machines') || '[]';
      const existingMachines = JSON.parse(existingMachinesJson);
      
      // Remove machines associated with this location
      const updatedMachines = existingMachines.filter((m: any) => {
        // Keep machines that don't match the location being removed
        return !m.location.toLowerCase().includes(locationName.toLowerCase());
      });
      
      // Save updated machines to localStorage
      localStorage.setItem('machines', JSON.stringify(updatedMachines));
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {i18n.language === 'en' ? 'Location' : 
             i18n.language === 'es' ? 'Ubicación' : 
             i18n.language === 'pl' ? 'Lokalizacja' : 'Location'}
          </h1>
          <p className="text-gray-600 mb-8">
            {i18n.language === 'en' ? 'Choose your working location to get started' : 
             i18n.language === 'es' ? 'Elige tu ubicación de trabajo para comenzar' : 
             i18n.language === 'pl' ? 'Wybierz swoją lokalizację pracy, aby rozpocząć' : 
             'Choose your working location to get started'}
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Building className="h-5 w-5 mr-2 text-primary" />
              {i18n.language === 'en' ? 'Choose Location' : 
               i18n.language === 'es' ? 'Elegir Ubicación' : 
               i18n.language === 'pl' ? 'Wybierz Lokalizację' : 'Choose Location'}
            </CardTitle>
            <CardDescription>
              {i18n.language === 'en' ? 'Select Facility' : 
               i18n.language === 'es' ? 'Seleccionar Instalación' : 
               i18n.language === 'pl' ? 'Wybierz Obiekt' : 'Select Facility'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    i18n.language === 'en' ? 'Select Location' : 
                    i18n.language === 'es' ? 'Seleccionar Ubicación' : 
                    i18n.language === 'pl' ? 'Wybierz Lokalizację' : 'Select Location'
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default-placeholder" disabled>
                    {i18n.language === 'en' ? 'Select Location' : 
                     i18n.language === 'es' ? 'Seleccionar Ubicación' : 
                     i18n.language === 'pl' ? 'Wybierz Lokalizację' : 'Select Location'}
                  </SelectItem>
                  
                  {/* Default locations */}
                  {LOCATIONS.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500">{t('locations.standardLocations')}</div>
                      {LOCATIONS.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Custom locations */}
                  {customLocations.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500">{t('locations.customLocations')}</div>
                      {customLocations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              
              {/* Add location button */}
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setShowAddLocationDialog(true)}
              >
                <Plus className="h-4 w-4" />
                {i18n.language === 'en' ? "Add New Location" : (i18n.language === 'es' ? "Añadir Nueva Ubicación" : "Dodaj Nową Lokalizację")}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2">
            {/* Remove location button - placed between Add New Location and Continue */}
            <Button 
              variant="outline" 
              type="button"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-red-500 border-red-200 hover:bg-red-50"
              onClick={handleRemoveLocation}
              disabled={!selectedLocation}
              title={!selectedLocation ? "Select a location to remove" : `Remove ${selectedLocation.startsWith('custom-') ? 'custom' : 'standard'} location`}
            >
              <Trash2 className="h-4 w-4" />
              {i18n.language === 'en' ? 'Remove Location' : 
               i18n.language === 'es' ? 'Eliminar Ubicación' : 
               i18n.language === 'pl' ? 'Usuń Lokalizację' : 'Remove Location'}
            </Button>
            <Button 
              onClick={handleContinue} 
              disabled={!selectedLocation || loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {i18n.language === 'en' ? 'Loading...' : 
                   i18n.language === 'es' ? 'Cargando...' : 
                   i18n.language === 'pl' ? 'Ładowanie...' : 'Loading...'}
                </>
              ) : (
                <>
                  {i18n.language === 'en' ? 'Continue' : 
                   i18n.language === 'es' ? 'Continuar' : 
                   i18n.language === 'pl' ? 'Kontynuuj' : 'Continue'}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Dialog for adding a new location */}
        <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {i18n.language === 'en' ? 'Add New Location' : 
                 i18n.language === 'es' ? 'Agregar Nueva Ubicación' : 
                 i18n.language === 'pl' ? 'Dodaj Nową Lokalizację' : 'Add New Location'}
              </DialogTitle>
              <DialogDescription>
                {i18n.language === 'en' ? 'Enter location details' : 
                 i18n.language === 'es' ? 'Ingresa los detalles de la ubicación' : 
                 i18n.language === 'pl' ? 'Wprowadź szczegóły lokalizacji' : 'Enter location details'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {i18n.language === 'en' ? 'Location Name' : 
                   i18n.language === 'es' ? 'Nombre de Ubicación' : 
                   i18n.language === 'pl' ? 'Nazwa Lokalizacji' : 'Location Name'}
                </Label>
                <Input 
                  id="name" 
                  placeholder={
                    i18n.language === 'en' ? 'Enter location name' : 
                    i18n.language === 'es' ? 'Ingresa el nombre de la ubicación' : 
                    i18n.language === 'pl' ? 'Wprowadź nazwę lokalizacji' : 'Enter location name'
                  }
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">
                  {i18n.language === 'en' ? 'Location Address' : 
                   i18n.language === 'es' ? 'Dirección de Ubicación' : 
                   i18n.language === 'pl' ? 'Adres Lokalizacji' : 'Location Address'}
                </Label>
                <Input 
                  id="address" 
                  placeholder={
                    i18n.language === 'en' ? 'Enter location address' : 
                    i18n.language === 'es' ? 'Ingresa la dirección de la ubicación' : 
                    i18n.language === 'pl' ? 'Wprowadź adres lokalizacji' : 'Enter location address'
                  }
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">
                  {i18n.language === 'en' ? 'Location Type' : 
                   i18n.language === 'es' ? 'Tipo de Ubicación' : 
                   i18n.language === 'pl' ? 'Typ Lokalizacji' : 'Location Type'}
                </Label>
                <Select value={newLocationType} onValueChange={setNewLocationType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={
                      i18n.language === 'en' ? 'Select type' : 
                      i18n.language === 'es' ? 'Seleccionar tipo' : 
                      i18n.language === 'pl' ? 'Wybierz typ' : 'Select type'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">
                      {i18n.language === 'en' ? 'Restaurant' : 
                       i18n.language === 'es' ? 'Restaurante' : 
                       i18n.language === 'pl' ? 'Restauracja' : 'Restaurant'}
                    </SelectItem>
                    <SelectItem value="office">
                      {i18n.language === 'en' ? 'Office' : 
                       i18n.language === 'es' ? 'Oficina' : 
                       i18n.language === 'pl' ? 'Biuro' : 'Office'}
                    </SelectItem>
                    <SelectItem value="warehouse">
                      {i18n.language === 'en' ? 'Warehouse' : 
                       i18n.language === 'es' ? 'Almacén' : 
                       i18n.language === 'pl' ? 'Magazyn' : 'Warehouse'}
                    </SelectItem>
                    <SelectItem value="other">
                      {i18n.language === 'en' ? 'Other' : 
                       i18n.language === 'es' ? 'Otro' : 
                       i18n.language === 'pl' ? 'Inne' : 'Other'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLocationDialog(false)}>
                {i18n.language === 'en' ? 'Cancel' : 
                 i18n.language === 'es' ? 'Cancelar' : 
                 i18n.language === 'pl' ? 'Anuluj' : 'Cancel'}
              </Button>
              <Button onClick={handleAddLocation}>
                {i18n.language === 'en' ? 'Add Location' : 
                 i18n.language === 'es' ? 'Agregar Ubicación' : 
                 i18n.language === 'pl' ? 'Dodaj Lokalizację' : 'Add Location'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Default location cards */}
          {LOCATIONS.map((location) => (
            <Card 
              key={location.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedLocation === location.id.toString() ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedLocation(location.id.toString())}
            >
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <div 
                  className="w-full h-full bg-gray-200"
                  style={{
                    backgroundImage: `url(${location.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                {selectedLocation === location.id.toString() && (
                  <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </div>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{location.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" /> {location.address}
                </p>
                <p className="text-sm text-gray-500 mt-1 flex items-center">
                  <Store className="h-4 w-4 mr-1" /> {location.type}
                </p>
              </CardContent>
            </Card>
          ))}
          
          {/* Custom location cards */}
          {customLocations.map(location => (
            <Card 
              key={location.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedLocation === location.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedLocation(location.id)}
            >
              <div className="aspect-video relative overflow-hidden rounded-t-lg">
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Store className="h-16 w-16 text-gray-400" />
                </div>
                {selectedLocation === location.id && (
                  <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </div>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{location.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" /> {location.address}
                </p>
                <p className="text-sm text-gray-500 mt-1 flex items-center">
                  <Store className="h-4 w-4 mr-1" /> {location.type}
                </p>
              </CardContent>
            </Card>
          ))}
          
          {/* Add location card */}
          <Card 
            className="cursor-pointer transition-all hover:shadow-md border-dashed"
            onClick={() => setShowAddLocationDialog(true)}
          >
            <div className="aspect-video relative overflow-hidden rounded-t-lg flex items-center justify-center bg-gray-50">
              <Plus className="h-16 w-16 text-gray-300" />
            </div>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg text-center">Add New Location</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 text-center">
                Click to add a custom location
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}