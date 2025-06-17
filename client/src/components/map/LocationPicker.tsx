import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation } from "lucide-react";

interface LocationPickerProps {
  onLocationSelected: (location: string, lat?: number, lng?: number) => void;
  initialValue?: string;
}

export default function LocationPicker({ onLocationSelected, initialValue = "" }: LocationPickerProps) {
  const [locationInput, setLocationInput] = useState(initialValue);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Load Leaflet map
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
  }, []);

  // Set marker function
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
      onLocationSelected(locationName, lat, lng);
    } catch (error) {
      console.error('Error fetching location name:', error);
      // Use a generic location name with coordinates
      const locationName = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setLocationInput(locationName);
      onLocationSelected(locationName, lat, lng);
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
        onLocationSelected(result.display_name, coords[0], coords[1]);
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

  return (
    <div className="space-y-3">
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
    </div>
  );
}
