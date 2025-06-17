import { useState, useEffect, useRef } from "react";
import { Issue, IssueStatus } from "@shared/schema";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";

interface MapDisplayProps {
  issues: Issue[];
  singleIssueMode?: boolean;
  center?: [number, number];
  zoom?: number;
}

export default function MapDisplay({ 
  issues, 
  singleIssueMode = false,
  center,
  zoom = 13
}: MapDisplayProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize map - only runs once on component mount
  useEffect(() => {
    let leafletMap: any = null;
    let isMounted = true;
    
    async function initializeMap() {
      if (!mapContainerRef.current) return;
      
      try {
        // Dynamic import of Leaflet
        const L = await import('leaflet');
        console.log('Leaflet library loaded successfully');
        
        // Default map center - Gdansk, Poland
        const defaultCenter: [number, number] = [54.352, 18.659];
        
        // Create map with the div container
        leafletMap = L.map(mapContainerRef.current);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletMap);
        
        // Set initial view
        leafletMap.setView(center || defaultCenter, zoom);
        
        // If still mounted, update state
        if (isMounted) {
          setMap(leafletMap);
          setLoading(false);
          console.log('Map initialized successfully');
        }
      } catch (err) {
        console.error('Error initializing map:', err);
        if (isMounted) {
          setError('Failed to load map. Please refresh the page.');
          setLoading(false);
        }
      }
    }
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeMap();
    }, 200);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timer);
      
      if (leafletMap) {
        leafletMap.remove();
      }
    };
  }, []);
  
  // Update markers when issues or map changes
  useEffect(() => {
    if (!map) return;
    
    async function updateMarkers() {
      try {
        const L = await import('leaflet');
        
        // Clear existing markers from the map and array
        markers.forEach(marker => {
          if (map) marker.remove();
        });
        
        const newMarkers: any[] = [];
        
        // Add new markers for each issue
        issues.forEach(issue => {
          if (issue.latitude && issue.longitude) {
            // Determine marker color based on status
            let colorClass = 'bg-gray-500'; // Default for pending
            
            switch (issue.status) {
              case IssueStatus.COMPLETED:
                colorClass = 'bg-green-500';
                break;
              case IssueStatus.IN_PROGRESS:
                colorClass = 'bg-yellow-500';
                break;
              case IssueStatus.URGENT:
                colorClass = 'bg-red-500';
                break;
              case IssueStatus.SCHEDULED:
                colorClass = 'bg-blue-500';
                break;
            }
            
            // Create HTML for marker
            const markerHtml = `
              <div class="relative">
                <div class="${colorClass} w-6 h-6 rounded-full flex items-center justify-center text-white">
                  ${issue.status === IssueStatus.URGENT ? '<span>!</span>' : '<span>•</span>'}
                </div>
                ${issue.status === IssueStatus.URGENT ? 
                  '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>' : ''}
              </div>
            `;
            
            // Create custom icon
            const icon = L.divIcon({
              html: markerHtml,
              className: 'custom-div-icon',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });
            
            // Create and add marker to map
            const marker = L.marker([issue.latitude, issue.longitude], { icon }).addTo(map);
            
            // Add popup with issue info
            marker.bindPopup(`
              <div class="p-2">
                <h3 class="font-semibold">${issue.title}</h3>
                <p class="text-sm">${issue.location}</p>
                <a 
                  href="/issue/${issue.id}"
                  class="mt-2 inline-block text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                >
                  View Details
                </a>
              </div>
            `);
            
            newMarkers.push(marker);
          }
        });
        
        // Update markers state
        setMarkers(newMarkers);
        
        // Adjust map view to fit all markers if not in single issue mode
        if (newMarkers.length > 0 && !singleIssueMode) {
          const group = L.featureGroup(newMarkers);
          map.fitBounds(group.getBounds(), {
            padding: [50, 50],
            maxZoom: 15
          });
        }
      } catch (err) {
        console.error('Error updating markers:', err);
        setError('Failed to update map markers');
      }
    }
    
    updateMarkers();
  }, [map, issues, singleIssueMode]);
  
  // Update center and zoom if provided and map exists
  useEffect(() => {
    if (map && center) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  
  // Loading state
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-sm">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-gray-700 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} size="sm">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
  
  // No issues state with map still showing
  if (issues.length === 0 && map) {
    return (
      <div className="relative h-full w-full">
        <div ref={mapContainerRef} className="h-full w-full"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg text-center">
          <MapPin className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-700">No issues reported yet</p>
        </div>
      </div>
    );
  }
  
  // Map display
  return (
    <div ref={mapContainerRef} className="h-full w-full"></div>
  );
}
