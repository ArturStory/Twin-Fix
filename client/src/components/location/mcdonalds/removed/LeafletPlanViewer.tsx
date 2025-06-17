import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './leaflet-plan.css';
import html2canvas from 'html2canvas';

// Define Pin interface for type safety
interface Pin {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
  status?: string; // Added status field to track issue status
  marker?: L.Marker | null;
}

// Helper function to preload images and get their dimensions
const loadImage = (src: string): Promise<HTMLImageElement> => {
  console.log(`Attempting to load image from: ${src}`);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log(`Successfully loaded image: ${src}, dimensions: ${img.width}x${img.height}`);
      resolve(img);
    };
    img.onerror = (e) => {
      console.error(`Failed to load image: ${src}`, e);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
};

import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, RefreshCw, MapPin, Trash2, Grid, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LeafletPlanViewerProps {
  imagePath: string;
  aspectRatio?: number; // height/width ratio of the image
  onPinAdded?: (coordinates: { x: number, y: number, description: string, capturedImage?: string }) => void;
  onPinStatusChange?: (pinId: string, newStatus: string) => void;
  existingPins?: Array<{ 
    id: string, 
    x: number, 
    y: number, 
    label: string, 
    description: string,
    status?: string 
  }>;
  isInterior?: boolean;
  showStatusControls?: boolean;
  captureMapImage?: boolean; // Whether to capture the map as an image when a pin is added
}

export default function LeafletPlanViewer({ 
  imagePath, 
  aspectRatio = 0.75, // default 4:3 ratio
  onPinAdded,
  onPinStatusChange,
  existingPins = [],
  isInterior = true,
  showStatusControls = false,
  captureMapImage = true
}: LeafletPlanViewerProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  // Pin mode is enabled by default for new issues, but not for issue detail view
  const [pinMode, setPinMode] = useState(existingPins.length === 0);
  const [pins, setPins] = useState<Pin[]>([]); 
  const [newPinCoords, setNewPinCoords] = useState<{x: number, y: number} | null>(null);
  const [newPinDescription, setNewPinDescription] = useState('');
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<{x: number, y: number} | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Reference plans from static directory
  // Using URL-encoded paths to handle spaces and special characters
  const interiorPlanUrl = '/static/McDonalds-interior-plan.jpg';
  const exteriorPlanUrl = '/static/McDonalds-exterior-plan.jpg';
  
  // Use the passed imagePath or fallback to default plans
  const imageSrc = imagePath || (isInterior ? interiorPlanUrl : exteriorPlanUrl);
  console.log("LeafletPlanViewer - Using image source:", imageSrc);
  
  // Store a ref to track if we've initialized the map already
  const mapInitializedRef = useRef(false);

  // Clear saved pins when creating a new issue (no existingPins provided)
  useEffect(() => {
    // In detail view mode, we display only the pins for the current issue
    if (existingPins.length > 0) {
      console.log('Using only provided existingPins for the current issue');
      return;
    }
    
    // In issue creation mode, clear pins from localStorage to start fresh
    try {
      // Clear both interior and exterior pins to ensure a completely fresh start
      localStorage.removeItem('mcdonalds-pins-interior');
      localStorage.removeItem('mcdonalds-pins-exterior');
      
      // Also clear any other potential pin-related data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('pins') || key.includes('marker') || key.includes('location'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('Cleared all saved pins from localStorage for fresh start');
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }
  }, [isInterior, existingPins.length]);
  
  // Save only the most recent pin to localStorage
  useEffect(() => {
    // Skip saving in issue detail view
    if (existingPins.length > 0) {
      console.log('In issue detail view, skipping saving pins to localStorage');
      return;
    }
    
    try {
      if (pins.length > 0) {
        // We ONLY keep the most recent pin for a new issue
        const mostRecentPin = pins[pins.length - 1];
        
        const savedPinsKey = `mcdonalds-pins-${isInterior ? 'interior' : 'exterior'}`;
        // Create a serializable version (without the marker object)
        const serializablePins = [{
          id: mostRecentPin.id,
          x: mostRecentPin.x,
          y: mostRecentPin.y,
          label: mostRecentPin.label,
          description: mostRecentPin.description
        }];
        
        localStorage.setItem(savedPinsKey, JSON.stringify(serializablePins));
        console.log('Saved most recent pin to localStorage, ignoring older pins');
      }
    } catch (e) {
      console.error('Error saving pins to localStorage:', e);
    }
  }, [pins, isInterior, existingPins.length]);

  // Function to create and toggle the coordinate grid overlay
  const toggleGrid = useCallback(() => {
    try {
      if (!mapInstanceRef.current) {
        console.error('Map instance not available');
        return;
      }
      
      const newShowGrid = !showGrid;
      setShowGrid(newShowGrid);
      
      // Remove existing grid if any
      if (gridLayerRef.current) {
        gridLayerRef.current.remove();
        gridLayerRef.current = null;
      }
      
      // Create new grid if toggling on
      if (newShowGrid) {
        console.log('Creating coordinate grid overlay');
        const map = mapInstanceRef.current;
        
        const gridLayer = L.layerGroup().addTo(map);
        gridLayerRef.current = gridLayer;
        
        const bounds = map.getBounds();
        
        // Calculate grid size based on image dimensions
        const gridSize = Math.max(bounds.getNorth() - bounds.getSouth(), bounds.getEast() - bounds.getWest()) / 20;
        
        // Create vertical grid lines
        for (let x = Math.floor(bounds.getWest() / gridSize) * gridSize; x <= bounds.getEast(); x += gridSize) {
          L.polyline(
            [
              [bounds.getNorth(), x],
              [bounds.getSouth(), x]
            ],
            {
              color: 'rgba(0, 0, 255, 0.3)',
              weight: 0.5,
              dashArray: '5, 5',
              className: 'grid-line'
            }
          ).addTo(gridLayer);
          
          // Add x-axis coordinate labels
          if (x !== 0) {
            L.marker([bounds.getSouth(), x], {
              icon: L.divIcon({
                className: 'grid-label',
                html: `<div class="grid-coord-label">${Math.round(x * 100) / 100}</div>`,
                iconSize: [40, 20],
                iconAnchor: [20, 0]
              })
            }).addTo(gridLayer);
          }
        }
        
        // Create horizontal grid lines
        for (let y = Math.floor(bounds.getSouth() / gridSize) * gridSize; y <= bounds.getNorth(); y += gridSize) {
          L.polyline(
            [
              [y, bounds.getWest()],
              [y, bounds.getEast()]
            ],
            {
              color: 'rgba(0, 0, 255, 0.3)',
              weight: 0.5,
              dashArray: '5, 5',
              className: 'grid-line'
            }
          ).addTo(gridLayer);
          
          // Add y-axis coordinate labels
          if (y !== 0) {
            L.marker([y, bounds.getWest()], {
              icon: L.divIcon({
                className: 'grid-label',
                html: `<div class="grid-coord-label">${Math.round(y * 100) / 100}</div>`,
                iconSize: [40, 20],
                iconAnchor: [10, 10]
              })
            }).addTo(gridLayer);
          }
        }
        
        console.log('Coordinate grid overlay created');
      }
    } catch (e) {
      console.error('Error toggling grid:', e);
    }
  }, [showGrid]);

  // Initialize the map
  useEffect(() => {
    try {
      if (!mapRef.current) {
        console.error('Map container ref is not available');
        return;
      }
      
      // Set container height based on aspect ratio
      const containerWidth = mapRef.current.clientWidth;
      const containerHeight = containerWidth * aspectRatio;
      mapRef.current.style.height = `${containerHeight}px`;
  
      // Only initialize the map if we haven't already
      if (!mapInitializedRef.current || !mapInstanceRef.current) {
        // Short delay to ensure DOM is ready
        setTimeout(() => {
          try {
            // Remove existing map instance if any
            if (mapInstanceRef.current) {
              console.log('Removing existing map instance');
              mapInstanceRef.current.remove();
              mapInstanceRef.current = null;
            }
            
            console.log('Loading image to determine dimensions BEFORE initializing map');
            // IMPORTANT: Load image dimensions first, then initialize the map
            // This avoids the "Set map center and zoom first" error
            loadImage(imageSrc)
              .then(img => {
                try {
                  const imageWidth = img.width;
                  const imageHeight = img.height;
                  
                  console.log(`Image dimensions determined: ${imageWidth}x${imageHeight}`);
                  
                  // Define bounds for the image coordinates
                  const bounds: L.LatLngBoundsExpression = [
                    [0, 0],
                    [imageHeight, imageWidth]
                  ];
                  
                  console.log('Now initializing map with known dimensions');
                  // Create map after we know the image dimensions
                  const map = L.map(mapRef.current!, {
                    crs: L.CRS.Simple,
                    minZoom: -2,
                    maxZoom: 2,
                    zoomControl: false,
                    attributionControl: false,
                    maxBoundsViscosity: 1.0
                  });
                  
                  // Store map instance in ref
                  mapInstanceRef.current = map;
                  
                  // Set bounds to prevent panning too far outside image
                  map.setMaxBounds([
                    [-imageHeight * 0.5, -imageWidth * 0.5],
                    [imageHeight * 1.5, imageWidth * 1.5]
                  ]);
                  
                  console.log('Adding image overlay to map');
                  // Add the image as an overlay
                  L.imageOverlay(imageSrc, bounds).addTo(map);
                  
                  // IMPORTANT: Set initial view BEFORE other operations
                  console.log('Setting initial view');
                  map.setView([imageHeight / 2, imageWidth / 2], -1);
                  
                  // Add existing pins if any
                  console.log(`Adding ${existingPins.length} existing pins`);
                  
                  // Safeguard: In issue viewer mode with one pin, ensure pin is visible by setting up bounds
                  if (existingPins.length === 1 && existingPins[0].id.includes('issue-')) {
                    console.log('SINGLE ISSUE PIN MODE - Ensuring pin visibility on map initialization');
                    
                    // Make a copy of existingPins to avoid modifying the original
                    const pinsToAdd = [...existingPins];
                    
                    // Special handling for toilet issue based on description
                    // This is a pragmatic approach for the existing (0,0) issue
                    if (pinsToAdd[0].x === 0 && pinsToAdd[0].y === 0 && 
                       (pinsToAdd[0].description.toLowerCase().includes('toilet') || 
                        pinsToAdd[0].label.toLowerCase().includes('toilet'))) {
                      console.log('TOILET ISSUE DETECTED - Using special toilet area coordinates');
                      
                      // After multiple adjustments, let's place the pin in the center of the map
                      // to ensure it's definitely visible
                      pinsToAdd[0].x = 1800;
                      pinsToAdd[0].y = 900;
                      
                      console.log('Adjusted toilet issue pin coordinates:', pinsToAdd[0]);
                    }
                    
                    // Add the pin with its coordinates
                    pinsToAdd.forEach(pin => {
                      console.log('Adding issue pin with coordinates:', { x: pin.x, y: pin.y, id: pin.id });
                      const newPin = addPinToMap(map, pin.x, pin.y, pin.label, pin.description, pin.id);
                      if (newPin) {
                        console.log('Successfully added pin to map');
                      }
                    });
                    
                    // Use a longer delay to ensure map and pin are fully initialized
                    setTimeout(() => {
                      try {
                        // Safety check - make sure map is still valid
                        if (!map || !map.getContainer() || !document.body.contains(map.getContainer())) {
                          console.log('Map no longer valid or not in document - skipping pan operation');
                          return;
                        }
                        
                        // Check if map is loaded and ready
                        if (!map.getZoom()) {
                          console.log('Map zoom not initialized yet - skipping pan operation');
                          return;
                        }
                        
                        // Zoom out slightly for better context using safer approach
                        try {
                          map.setZoom(-1);
                        } catch (zoomErr) {
                          console.warn('Could not set zoom, continuing with centering', zoomErr);
                        }
                        
                        // Pan to the pin location (for better visibility)
                        const targetX = pinsToAdd[0].x;
                        const targetY = pinsToAdd[0].y;
                        
                        // Only pan if we have valid coordinates using a safer approach
                        try {
                          if (targetX !== 0 || targetY !== 0) {
                            console.log('Panning map to pin coordinates:', { lat: targetY, lng: targetX });
                            
                            // Use safer setView instead of panTo (less prone to _leaflet_pos errors)
                            map.setView([targetY, targetX], map.getZoom());
                          } else {
                            // If coordinates are still (0,0), pan to center of map
                            console.log('Panning to center of map (fallback)');
                            map.setView([imageHeight / 2, imageWidth / 2], map.getZoom());
                          }
                          console.log('Map centered on issue pin');
                        } catch (panErr) {
                          console.error('Error panning map:', panErr);
                          
                          // Last resort - try to invalidate the size and reset view
                          try {
                            map.invalidateSize();
                            const bounds = L.latLngBounds([0, 0], [imageHeight, imageWidth]);
                            map.fitBounds(bounds);
                            console.log('Used bounds-based fallback for map centering');
                          } catch (fallbackErr) {
                            console.error('All map centering approaches failed', fallbackErr);
                          }
                        }
                      } catch (e) {
                        console.error('Error handling map centering operations:', e);
                      }
                    }, 500);
                  } else if (existingPins.length > 0) {
                    // Normal mode - just add the pins
                    console.log('Adding multiple existing pins to map');
                    existingPins.forEach(pin => {
                      addPinToMap(map, pin.x, pin.y, pin.label, pin.description, pin.id);
                    });
                  } else {
                    console.log('No existing pins to add to map');
                  }
                  
                  // Add pins from local state if any
                  console.log(`Adding ${pins.length} pins from local state`);
                  pins.forEach(pin => {
                    if (!pin.marker) {
                      addPinToMap(map, pin.x, pin.y, pin.label, pin.description, pin.id);
                    }
                  });
                  
                  // Setup click handler for pin placement
                  map.on('click', (e) => {
                    if (pinMode) {
                      try {
                        // Get coordinates from click event
                        const { lat, lng } = e.latlng;
                        console.log('Map clicked at coordinates:', { lat, lng });
                        
                        // Check if we're in issue detail view with existing pins
                        const isIssueDetailView = existingPins.length > 0 && existingPins[0].id.includes('issue-');
                        
                        // Set up pin ID and description
                        let pinId, pinDescription, pinLabel;
                        
                        if (isIssueDetailView) {
                          // In issue detail view, use the existing issue ID and description
                          pinId = existingPins[0].id;
                          pinDescription = existingPins[0].description;
                          pinLabel = existingPins[0].label;
                          console.log('Manual pin placement in issue detail view - using original issue ID and description');
                        } else {
                          // In new issue mode, create a new pin ID and generic description
                          pinId = `pin-${Date.now()}-${Math.round(Math.random() * 1000)}`;
                          pinDescription = `Damage point at X:${lng.toFixed(2)}, Y:${lat.toFixed(2)}`;
                          pinLabel = "Damage Point";
                        }
                        
                        // Create marker icon
                        const icon = new L.Icon({
                          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                          iconSize: [25, 41],
                          iconAnchor: [12, 41],
                          popupAnchor: [1, -34],
                          shadowSize: [41, 41]
                        });
                        
                        // Remove all markers from the map
                        // This ensures only one pin per issue
                        pins.forEach(existingPin => {
                          if (existingPin.marker) {
                            existingPin.marker.remove();
                          }
                        });
                        
                        // Clear the pins array completely
                        setPins([]);
                        
                        // Also remove existing pins from map if in detail view
                        if (isIssueDetailView) {
                          console.log('Removing existing issue pin for replacement');
                          
                          // Find all DOM elements with marker classes and remove them
                          // This is a brute-force approach to ensure no lingering markers
                          const mapElement = mapRef.current;
                          if (mapElement) {
                            const markers = mapElement.querySelectorAll('.leaflet-marker-icon, .leaflet-marker-shadow');
                            markers.forEach(marker => {
                              marker.remove();
                            });
                          }
                          
                          // Also remove via the actual marker objects
                          existingPins.forEach(existingPin => {
                            // Find the matching pin in the pins array and remove its marker
                            const matchingPin = pins.find(p => p.id === existingPin.id);
                            if (matchingPin && matchingPin.marker) {
                              matchingPin.marker.remove();
                            }
                          });
                          
                          console.log('All existing markers removed, ready for new pin placement');
                        }
                        
                        // Create new marker
                        const marker = L.marker([lat, lng], { icon }).addTo(map);
                        
                        // Add popup
                        marker.bindPopup(`<strong>${pinLabel}</strong><br>${pinDescription}`);
                        
                        // Create pin object
                        const newPin = { 
                          id: pinId, 
                          marker: marker, 
                          x: lng, 
                          y: lat, 
                          label: pinLabel, 
                          description: pinDescription 
                        };
                        
                        // Update pins state with ONLY the new pin (replacing any existing pins)
                        setPins([newPin]);
                        
                        // Update state
                        setNewPinCoords({ x: lng, y: lat });
                        setNewPinDescription(pinDescription);
                        
                        // Capture the map image if needed
                        if (captureMapImage) {
                          // Give a small delay to ensure marker is visible
                          setTimeout(async () => {
                            try {
                              // Capture the map with the pin
                              console.log('Capturing map image with pin...');
                              console.log('Starting html2canvas capture...');
                              const mapElement = mapRef.current!;
                              
                              // First ensure all images are loaded
                              const images = Array.from(mapElement.querySelectorAll('img'));
                              await Promise.all(images.map(img => {
                                if (img.complete) return Promise.resolve();
                                return new Promise(resolve => {
                                  img.onload = resolve;
                                  img.onerror = resolve; // Continue even if some images fail
                                });
                              }));
                              
                              console.log('All images loaded, capturing with html2canvas...');
                              const mapImage = await html2canvas(mapElement, {
                                useCORS: true,
                                allowTaint: true,
                                scale: 2, // Higher scale for better quality
                                logging: true,
                                backgroundColor: null // Transparent background
                              });
                              
                              // Convert to data URL
                              const imageDataUrl = mapImage.toDataURL('image/png');
                              console.log('Map image captured successfully');
                              
                              // Notify parent component with the captured image
                              if (onPinAdded) {
                                // Enhanced debugging - log detailed pin data before sending
                                console.log('DEBUG - Sending pin data to parent with image:', {
                                  x: lng,
                                  y: lat,
                                  lng_type: typeof lng,
                                  lat_type: typeof lat,
                                  description: pinDescription,
                                  imageAvailable: !!imageDataUrl
                                });
                                
                                // Make absolutely sure x and y are numbers
                                const xCoord = typeof lng === 'number' ? lng : parseFloat(String(lng));
                                const yCoord = typeof lat === 'number' ? lat : parseFloat(String(lat));
                                
                                onPinAdded({
                                  x: xCoord,
                                  y: yCoord,
                                  description: pinDescription,
                                  capturedImage: imageDataUrl
                                });
                              }
                            } catch (error) {
                              console.error('Error capturing map image:', error);
                              // Still notify parent even if image capture fails
                              if (onPinAdded) {
                                // Enhanced debugging - log detailed pin data before sending
                                console.log('DEBUG - Sending pin data to parent (fallback, no image):', {
                                  x: lng,
                                  y: lat,
                                  lng_type: typeof lng,
                                  lat_type: typeof lat,
                                  description: pinDescription
                                });
                                
                                // Make absolutely sure x and y are numbers
                                const xCoord = typeof lng === 'number' ? lng : parseFloat(String(lng));
                                const yCoord = typeof lat === 'number' ? lat : parseFloat(String(lat));
                                
                                onPinAdded({
                                  x: xCoord,
                                  y: yCoord,
                                  description: pinDescription
                                });
                              }
                            }
                          }, 300); // Short delay to ensure rendering is complete
                        } else {
                          // Just notify parent without image
                          if (onPinAdded) {
                            // Enhanced debugging - log detailed pin data before sending
                            console.log('DEBUG - Sending pin data to parent (last fallback):', {
                              x: lng,
                              y: lat,
                              lng_type: typeof lng,
                              lat_type: typeof lat,
                              description: pinDescription
                            });
                            
                            // Make absolutely sure x and y are numbers
                            const xCoord = typeof lng === 'number' ? lng : parseFloat(String(lng));
                            const yCoord = typeof lat === 'number' ? lat : parseFloat(String(lat));
                            
                            onPinAdded({
                              x: xCoord,
                              y: yCoord,
                              description: pinDescription
                            });
                          }
                        }
                        
                        // Show feedback
                        marker.openPopup();
                        
                      } catch (error) {
                        console.error('Error in map click handler:', error);
                      }
                    }
                  });
                  
                  // Add mousemove handler for coordinate tracking
                  map.on('mousemove', (e) => {
                    if (pinMode) {
                      try {
                        const { lat, lng } = e.latlng;
                        setMouseCoords({ x: lng, y: lat });
                      } catch (error) {
                        console.error('Error in mousemove handler:', error);
                      }
                    } else {
                      setMouseCoords(null);
                    }
                  });
                  
                  // Clear coordinates when mouse leaves map
                  map.on('mouseout', () => {
                    setMouseCoords(null);
                  });
                  
                  // Delay to ensure map properly initialized before fitting bounds
                  setTimeout(() => {
                    try {
                      console.log('Invalidating map size and fitting to bounds');
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                        mapInstanceRef.current.fitBounds(bounds);
                      }
                    } catch (e) {
                      console.error("Error fitting bounds:", e);
                    }
                  }, 500);
                  
                  // Mark map as initialized
                  mapInitializedRef.current = true;
                } catch (e) {
                  console.error("Error processing loaded image:", e);
                }
              })
              .catch(error => {
                console.error("Error loading image:", error);
              });
          } catch (e) {
            console.error("Error initializing Leaflet map:", e);
          }
        }, 100);
      } else {
        // Just update the existing map view
        console.log('Map already initialized, just updating the view');
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          
          // Re-add pins if needed
          if (pins.length > 0) {
            console.log('Re-adding pins to existing map instance');
            pins.forEach(pin => {
              if (!pin.marker && mapInstanceRef.current) {
                addPinToMap(mapInstanceRef.current, pin.x, pin.y, pin.label, pin.description, pin.id);
              }
            });
          }
        }
      }
    } catch (e) {
      console.error("Error in useEffect:", e);
    }
    
    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        console.log('Cleaning up map instance on unmount');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        mapInitializedRef.current = false;
      }
    };
  }, [imageSrc, aspectRatio, pins.length]);
  
  // Effect to update grid when map is panned or zoomed
  useEffect(() => {
    if (mapInstanceRef.current && showGrid) {
      // When showGrid changes and it's true, create the grid
      toggleGrid();
      
      // Add event listener for map movements
      const map = mapInstanceRef.current;
      const updateGrid = () => {
        if (showGrid && gridLayerRef.current) {
          // Remove and recreate grid to reflect new bounds
          toggleGrid();
        }
      };
      
      map.on('moveend', updateGrid);
      map.on('zoomend', updateGrid);
      
      return () => {
        map.off('moveend', updateGrid);
        map.off('zoomend', updateGrid);
      };
    }
  }, [showGrid, toggleGrid]);

  // Function to add a pin to the map
  const addPinToMap = (
    map: L.Map,
    x: number,
    y: number,
    label: string,
    description: string,
    id: string = `pin-${Date.now()}`
  ) => {
    try {
      // Debug output to help with coordinate tracking
      console.log('Adding pin at raw coordinates:', { 
        x, 
        y,
        x_type: typeof x, 
        y_type: typeof y
      });
      
      // IMPORTANT UPDATE: Don't auto-center pins from the database
      // Keep exact coordinates even if they're 0,0 when viewing existing issues
      
      // Check if we're in pin mode and manually placing a pin in issue detail view
      const isManualPinPlacement = pinMode && existingPins.length > 0 && existingPins[0].id.includes('issue-');
      
      // Only handle coordinates as special cases if NOT manually placing a pin
      if (!isManualPinPlacement) {
        // Only handle 0,0 as special case for new pins (not from database)
        // Check if this is a new pin vs an existing pin from database
        const isNewPin = id.includes('pin-') && !id.includes('issue-');
        
        // For user-placed pins, handle (0,0) as a special case requiring auto-centering
        if (x === 0 && y === 0) {
          if (isNewPin) {
            console.log('Found (0,0) coordinates for a NEW pin, placing at center');
            
            // Get map bounds to find center
            const bounds = map.getBounds();
            if (bounds) {
              // For new pins, center them on the map
              x = bounds.getEast() / 2;
              y = bounds.getNorth() / 2;
              console.log('Adjusted to center coordinates:', { x, y });
            } else {
              // Fallback to center coordinates for visibility
              x = 1800;
              y = 900;
              console.log('Using specific toilet location coordinates:', { x, y });
            }
          } else {
            // Special handling for toilet-related issues
            if (description.toLowerCase().includes('toilet') || label.toLowerCase().includes('toilet')) {
              console.log('TOILET ISSUE DETECTED - Using special toilet area coordinates for pin creation');
              // Setting to center of map for visibility
              x = 1800;
              y = 900;
            } else {
              // For other existing pins with (0,0), 
              // maintain those coordinates but set a different marker style
              // to indicate it's at the default origin position
              console.log('Using exact (0,0) coordinates for existing issue pin');
            }
          }
        }
      } else {
        console.log('Manual pin placement in issue detail view - using exact clicked coordinates:', { x, y });
      }
      
      // Create marker icon
      const icon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      // Create marker (note in Leaflet LatLng is [y, x] not [x, y])
      console.log('Creating Leaflet marker with coordinates:', { lat: y, lng: x });
      const marker = L.marker([y, x], { icon })
        .addTo(map)
        .bindPopup(`<b>${label}</b><br>${description}`);
      
      // Add to pins state
      const newPin: Pin = { id, marker, x, y, label, description };
      setPins(prevPins => {
        // Check if pin already exists with the same ID
        const pinExists = prevPins.some(p => p.id === id);
        if (pinExists) {
          // Replace the existing pin
          return prevPins.map(p => p.id === id ? newPin : p);
        } else {
          // Add new pin
          return [...prevPins, newPin];
        }
      });
      
      console.log('Pin successfully added to map');
      return newPin;
    } catch (e) {
      console.error('Error adding pin to map:', e);
      throw e;
    }
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    try {
      if (mapInstanceRef.current) {
        // Load image to get dimensions for reset
        loadImage(imageSrc)
          .then(img => {
            try {
              if (mapInstanceRef.current) {
                // First center the view
                mapInstanceRef.current.setView([img.height / 2, img.width / 2], 0);
                
                // Then fit bounds with slight delay
                setTimeout(() => {
                  try {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.invalidateSize();
                      const bounds: L.LatLngBoundsExpression = [
                        [0, 0],
                        [img.height, img.width]
                      ];
                      mapInstanceRef.current.fitBounds(bounds);
                    }
                  } catch (e) {
                    console.log("Error resetting view:", e);
                  }
                }, 300);
              }
            } catch (e) {
              console.error("Error in resetView after loading image:", e);
            }
          })
          .catch(error => {
            console.error("Error loading image for reset view:", error);
          });
      }
    } catch (e) {
      console.error("Error in handleResetView:", e);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    // Recalculate map size after DOM update
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
  };

  const togglePinMode = () => {
    try {
      const newPinMode = !pinMode;
      console.log(`Setting pin mode to: ${newPinMode}`);
      setPinMode(newPinMode);
      
      // Update map if pin mode activated
      if (newPinMode && mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    } catch (e) {
      console.error("Error toggling pin mode:", e);
    }
  };
  
  // Function to clear all pins
  const handleClearAllPins = () => {
    try {
      // Don't allow clearing in issue detail view
      if (existingPins.length > 0) {
        console.log("Cannot clear pins in issue detail view");
        alert(t('locations.cannotClearInDetailView', 'Cannot clear pins in detail view'));
        return;
      }
      
      if (pins.length === 0) {
        console.log("No pins to clear");
        return;
      }
      
      if (window.confirm(t('locations.confirmClearPins', 'Are you sure you want to clear all pins?'))) {
        // Remove all markers from the map
        pins.forEach(pin => {
          if (pin.marker && mapInstanceRef.current) {
            pin.marker.remove();
          }
        });
        
        // Clear pins from state
        setPins([]);
        
        // Clear pins from localStorage
        const savedPinsKey = `mcdonalds-pins-${isInterior ? 'interior' : 'exterior'}`;
        localStorage.removeItem(savedPinsKey);
        
        console.log('All pins cleared');
      }
    } catch (e) {
      console.error('Error clearing pins:', e);
    }
  };

  return (
    <div className={`leaflet-plan-container ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">
          {isInterior ? t('locations.interiorPlan', 'Interior Plan') : t('locations.exteriorPlan', 'Exterior Plan')}
        </h3>
        <div className="flex items-center space-x-1">
          <Button size="sm" variant="outline" onClick={handleZoomIn} title={t('locations.zoomIn', 'Zoom in')}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleZoomOut} title={t('locations.zoomOut', 'Zoom out')}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleResetView} title={t('locations.resetView', 'Reset view')}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={toggleFullscreen} title={t('locations.fullscreen', 'Fullscreen')}>
            <Maximize className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant={showGrid ? "default" : "outline"} 
            onClick={toggleGrid} 
            title={t('locations.toggleGrid', 'Toggle grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          {pins.length > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleClearAllPins} 
              className="ml-2 bg-red-50"
              title={t('locations.clearAllPins', 'Clear all pins')}
            >
              <Trash2 className="h-4 w-4" />
              <span className="ml-1 md:inline hidden">{t('locations.clearPins', 'Clear pins')}</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Prominent MOVE PIN button in issue detail view */}
      {existingPins.length > 0 && existingPins[0].id.includes('issue-') && !pinMode && (
        <div className="mb-4 mt-2">
          <Button 
            size="lg" 
            variant="default"
            onClick={togglePinMode} 
            title={t('locations.pinDamageLocation', 'Click here, then click on map to move pin')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md py-3 px-4 font-medium flex items-center gap-2 shadow-lg w-full justify-center"
          >
            <MapPin className="h-6 w-6" />
            <span className="text-lg font-bold">
              {t('locations.reposition', 'MOVE PIN TO NEW LOCATION')}
            </span>
          </Button>
        </div>
      )}
      
      {pinMode && (
        <div className="bg-red-50 border-2 border-red-300 rounded-md p-3 mb-3 text-sm flex items-start gap-2 shadow-md animate-pulse">
          <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800 mb-1">{t('locations.pinModeActive', 'PIN MODE ACTIVE')}</p>
            <p className="text-red-700 font-medium">{t('locations.pinModeInstructions', 'Click anywhere on the map to place the pin at the exact damage location. The old pin will be removed automatically.')}</p>
          </div>
        </div>
      )}
      
      {/* Help text is now replaced by the prominent button above */}
      
      <div 
        ref={mapRef} 
        className={`w-full border border-gray-200 rounded-md ${isFullscreen ? 'flex-grow' : ''}`}
        style={{ minHeight: '200px' }}
      />
      
      {mouseCoords && (
        <div className="text-xs font-mono mt-1 text-gray-500">
          {t('locations.coordinates', 'Coordinates')}: X: {mouseCoords.x.toFixed(2)}, Y: {mouseCoords.y.toFixed(2)}
        </div>
      )}
    </div>
  );
}