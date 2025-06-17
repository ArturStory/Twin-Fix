import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './leaflet-plan.css';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { IssueStatus } from '@shared/schema';

// UI Components
import { Button } from '@/components/ui/button';
import { 
  ZoomIn, ZoomOut, Maximize, RefreshCw, MapPin, 
  Grid, CheckCircle, Clock 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IssueReportForm } from '../../issues/IssueReportForm';

// Define interface for issue pins
interface IssuePin {
  id: string | number;
  x: number;
  y: number;
  title: string;
  description: string;
  status: IssueStatus;
  marker?: L.Marker | null;
  createdAt?: Date;
  updatedAt?: Date;
  reportedByName?: string;
  issueType?: string;
  priority?: string;
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

// Get marker icon based on issue status
const getMarkerIcon = (status: IssueStatus): L.Icon => {
  let iconColor = '';
  
  switch (status) {
    case IssueStatus.PENDING:
      iconColor = 'red';
      break;
    case IssueStatus.IN_PROGRESS:
      iconColor = 'orange';
      break;
    case IssueStatus.SCHEDULED:
      iconColor = 'blue';
      break;
    case IssueStatus.URGENT:
      iconColor = 'purple';
      break;
    case IssueStatus.COMPLETED:
    case IssueStatus.FIXED:
      iconColor = 'green';
      break;
    default:
      iconColor = 'gray';
  }
  
  return L.divIcon({
    className: `issue-marker issue-marker-${iconColor}`,
    html: `<div class="marker-icon marker-${iconColor}"></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  }) as L.Icon;
};

interface EnhancedLeafletPlanViewerProps {
  imagePath: string;
  aspectRatio?: number; // height/width ratio of the image
  existingIssues?: Array<IssuePin>; 
  isInterior?: boolean;
  showControls?: boolean;
  onIssueAdded?: (issue: any) => void;
  onIssueUpdated?: (issueId: string | number, newStatus: IssueStatus) => void;
}

export default function EnhancedLeafletPlanViewer({ 
  imagePath, 
  aspectRatio = 0.5,
  existingIssues = [],
  isInterior = true,
  showControls = true,
  onIssueAdded,
  onIssueUpdated
}: EnhancedLeafletPlanViewerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const mapInitializedRef = useRef<boolean>(false);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  
  // State
  const [pins, setPins] = useState<IssuePin[]>([]);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [pinMode, setPinMode] = useState<boolean>(false);
  const [mouseCoords, setMouseCoords] = useState<{x: number, y: number} | null>(null);
  const [newPinCoords, setNewPinCoords] = useState<{x: number, y: number} | null>(null);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Issue detail state
  const [selectedIssue, setSelectedIssue] = useState<IssuePin | null>(null);
  const [isIssueDetailsDialogOpen, setIsIssueDetailsDialogOpen] = useState<boolean>(false);
  const [isIssueStatusDialogOpen, setIsIssueStatusDialogOpen] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<IssueStatus>(IssueStatus.PENDING);
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Add a pin for an issue to the map
  const addIssuePin = useCallback((map: L.Map, issue: IssuePin) => {
    try {
      console.log(`Adding issue ${issue.id} at coordinates [${issue.y}, ${issue.x}]`);
      console.log('Adding pin for issue:', issue);
      
      // Validate coordinates
      if (typeof issue.x !== 'number' || typeof issue.y !== 'number' || 
          isNaN(issue.x) || isNaN(issue.y) || !isFinite(issue.x) || !isFinite(issue.y)) {
        console.warn(`Invalid coordinates for issue ${issue.id}:`, issue.x, issue.y);
        
        // Set default coordinates based on issue id to spread pins out
        const baseX = 500;
        const baseY = 500;
        const idNum = typeof issue.id === 'string' ? parseInt(issue.id, 10) || 0 : Number(issue.id);
        issue.x = baseX + (idNum % 10) * 50;
        issue.y = baseY + Math.floor(idNum / 10) * 50;
        
        console.log(`Using default coordinates for issue ${issue.id}: [${issue.y}, ${issue.x}]`);
      }
      
      console.log(`Creating marker at [${issue.y}, ${issue.x}]`);
      
      // Create marker with appropriate icon based on status
      const marker = L.marker([issue.y, issue.x], {
        icon: getMarkerIcon(issue.status || IssueStatus.PENDING)
      }).addTo(map);
      
      // Create popup content with issue details
      const popupContent = `
        <div class="issue-popup">
          <h3>${issue.title}</h3>
          <p>${issue.description}</p>
          <div class="issue-status">
            <span class="status-label">Status:</span> 
            <span class="status-value status-${issue.status}">${issue.status}</span>
          </div>
          ${issue.reportedByName ? `<div class="reported-by">Reported by: ${issue.reportedByName}</div>` : ''}
          ${issue.createdAt ? `<div class="created-at">Reported on: ${new Date(issue.createdAt).toLocaleDateString()}</div>` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      // Add click handler to show issue details
      marker.on('click', () => {
        console.log('Pin clicked:', issue);
        setSelectedIssue({...issue, marker});
        setIsIssueDetailsDialogOpen(true);
        
        // Force the dialog to open with a slight delay to ensure state is updated
        setTimeout(() => {
          setIsIssueDetailsDialogOpen(true);
        }, 50);
      });
      
      // Update the issue in our pins state with the marker reference
      setPins(currentPins => {
        const pinExists = currentPins.some(p => p.id === issue.id);
        
        if (pinExists) {
          return currentPins.map(p => p.id === issue.id ? {...issue, marker} : p);
        } else {
          return [...currentPins, {...issue, marker}];
        }
      });
      
      console.log(`Successfully added marker for issue ${issue.id}`);
      return marker;
    } catch (error) {
      console.error('Error adding pin for issue:', error, issue);
      return null;
    }
  }, [isInterior]);
  
  // Function to update pin status visually
  const updatePinStatus = useCallback((issueId: string | number, newStatus: IssueStatus) => {
    setPins(currentPins => {
      return currentPins.map(pin => {
        if (pin.id === issueId) {
          // If the pin has a marker, update its icon
          if (pin.marker) {
            pin.marker.setIcon(getMarkerIcon(newStatus));
            
            // Update the popup content
            const updatedPopupContent = `
              <div class="issue-popup">
                <h3>${pin.title}</h3>
                <p>${pin.description}</p>
                <div class="issue-status">
                  <span class="status-label">Status:</span> 
                  <span class="status-value status-${newStatus}">${newStatus}</span>
                </div>
                ${pin.reportedByName ? `<div class="reported-by">Reported by: ${pin.reportedByName}</div>` : ''}
                ${pin.createdAt ? `<div class="created-at">Reported on: ${new Date(pin.createdAt).toLocaleDateString()}</div>` : ''}
              </div>
            `;
            
            pin.marker.bindPopup(updatedPopupContent);
          }
          
          return {...pin, status: newStatus};
        }
        return pin;
      });
    });
  }, []);
  
  // Function to handle updating an issue's status
  const handleUpdateIssueStatus = useCallback(async () => {
    if (!selectedIssue) return;
    
    setIsSubmitting(true);
    console.log('Updating issue status:', selectedIssue.id, 'to', newStatus);
    
    try {
      // Call API to update issue status
      const response = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes
        })
      });
      
      if (response.ok) {
        const json = await response.json();
        console.log('Issue status updated successfully:', json);
        
        // Update the pin on the map
        updatePinStatus(selectedIssue.id, newStatus);
        
        // Show success message
        toast({
          title: "Status Updated",
          description: `Issue status changed to ${newStatus}`,
        });
        
        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
        queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
        
        // If a callback was provided, call it
        if (onIssueUpdated) {
          onIssueUpdated(selectedIssue.id, newStatus);
        }
        
        // Close the dialog
        setIsIssueDetailsDialogOpen(false);
      } else {
        console.error('Error response from server:', await response.text());
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating issue status:', error);
      toast({
        title: "Error",
        description: "Failed to update issue status. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIssue, newStatus, statusNotes, toast, queryClient, onIssueUpdated, updatePinStatus, setIsIssueDetailsDialogOpen]);
  
  // Function to handle marking an issue as fixed (convenience function)
  const handleMarkAsFixed = useCallback(async () => {
    if (!selectedIssue) return;
    
    setIsSubmitting(true);
    console.log('Marking issue as fixed:', selectedIssue.id);
    
    try {
      // Call API to mark issue as fixed by updating the status
      const response = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: IssueStatus.FIXED,
          notes: `Issue marked as fixed by ${localStorage.getItem('userName') || 'anonymous user'}`
        })
      });
      
      if (response.ok) {
        const json = await response.json();
        console.log('Issue marked as fixed successfully:', json);
        
        // Update the pin on the map
        updatePinStatus(selectedIssue.id, IssueStatus.FIXED);
        
        // Show success message
        toast({
          title: "Issue Fixed",
          description: "Issue has been marked as fixed",
        });
        
        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
        queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
        
        // If a callback was provided, call it
        if (onIssueUpdated) {
          onIssueUpdated(selectedIssue.id, IssueStatus.FIXED);
        }
        
        // Close the dialogs
        setIsIssueDetailsDialogOpen(false);
      } else {
        console.error('Error response from server:', await response.text());
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error('Error marking issue as fixed:', error);
      toast({
        title: "Error",
        description: "Failed to mark issue as fixed. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIssue, toast, queryClient, onIssueUpdated, updatePinStatus, setIsIssueDetailsDialogOpen]);
  
  // Function to handle creating a new issue
  const handleAddIssue = useCallback((issueData: any) => {
    if (!mapInstanceRef.current || !newPinCoords) return;
    
    const newIssue: IssuePin = {
      id: `temp-${Date.now()}`, // Will be replaced with real ID from server
      x: newPinCoords.x,
      y: newPinCoords.y,
      title: issueData.title,
      description: issueData.description,
      status: IssueStatus.PENDING,
      issueType: issueData.issueType,
      priority: issueData.priority,
      reportedByName: localStorage.getItem('userName') || 'Anonymous User',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add pin to map
    const marker = addIssuePin(mapInstanceRef.current, newIssue);
    
    // Close the dialog
    setIsPinDialogOpen(false);
    setNewPinCoords(null);
    
    // Call callback if provided
    if (onIssueAdded) {
      onIssueAdded({
        ...issueData,
        pinX: newPinCoords.x,
        pinY: newPinCoords.y,
        isInteriorPin: isInterior
      });
    }
  }, [mapInstanceRef, newPinCoords, onIssueAdded, addIssuePin, isInterior]);
  
  // Function to create and toggle the coordinate grid overlay
  const toggleGrid = useCallback(() => {
    try {
      if (!mapInstanceRef.current) {
        console.error('Map instance not available');
        return;
      }
      
      const newShowGrid = !showGrid;
      setShowGrid(newShowGrid);
      
      // If we already have a grid, remove it
      if (gridLayerRef.current) {
        gridLayerRef.current.remove();
        gridLayerRef.current = null;
      }
      
      // If toggling on, create and add the grid
      if (newShowGrid) {
        console.log('Creating coordinate grid overlay');
        const map = mapInstanceRef.current;
        
        // Create a new layer group for the grid
        const gridLayer = L.layerGroup().addTo(map);
        gridLayerRef.current = gridLayer;
        
        // Get map bounds
        const bounds = map.getBounds();
        const northWest = bounds.getNorthWest();
        const southEast = bounds.getSouthEast();
        
        // Calculate grid size based on the image dimensions
        const gridSize = Math.max(bounds.getNorth() - bounds.getSouth(), bounds.getEast() - bounds.getWest()) / 20;
        
        // Create vertical lines
        for (let x = Math.floor(bounds.getWest() / gridSize) * gridSize; x <= bounds.getEast(); x += gridSize) {
          const line = L.polyline(
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
          
          // Add coordinate labels for x-axis
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
        
        // Create horizontal lines
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
          
          // Add coordinate labels for y-axis
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

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    // Need to invalidate size after the DOM has updated
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        
        // Adjust the bounds to fit the entire image
        if (mapInstanceRef.current._layers) {
          const bounds = Object.values(mapInstanceRef.current._layers)
            .filter((layer: any) => layer instanceof L.ImageOverlay)
            .map((layer: any) => layer.getBounds())
            .find(Boolean);
            
          if (bounds) {
            mapInstanceRef.current.fitBounds(bounds);
          }
        }
      }
    }, 100);
  }, [isFullscreen]);

  // Initialize the map when the component mounts
  useEffect(() => {
    async function initializeMap() {
      if (!mapRef.current) return;
      
      try {
        // Load the image to determine its dimensions
        const img = await loadImage(imagePath);
        console.log('Image dimensions determined:', img.width, 'x', img.height);
        
        // Calculate the map bounds based on the image dimensions
        // The bounds define the coordinate system for the image overlay
        const southWest = [0, 0];
        const northEast = [img.height, img.width];
        const bounds = L.latLngBounds([southWest, northEast]);
        
        // Create a new map instance
        if (mapInstanceRef.current) {
          console.log('Removing existing map instance');
          mapInstanceRef.current.remove();
        }
        
        console.log('Initializing new Leaflet map instance');
        const map = L.map(mapRef.current, {
          crs: L.CRS.Simple,
          minZoom: -2,
          maxZoom: 2,
          zoomControl: showControls,
          attributionControl: false,
          maxBoundsViscosity: 1.0
        });
        
        mapInstanceRef.current = map;
        
        // Add the image overlay to the map
        console.log('Adding image overlay to map');
        L.imageOverlay(imagePath, bounds).addTo(map);
        
        // Set the view to fit the bounds
        console.log('Setting initial view');
        map.fitBounds(bounds);
        
        // Add existing issues as pins if provided
        if (existingIssues?.length) {
          console.log(`Adding ${existingIssues.length} existing issues`, existingIssues);
          existingIssues.forEach(issue => addIssuePin(map, issue));
        }
        
        // Add pins from local state
        if (pins.length) {
          console.log(`Adding ${pins.length} pins from local state`);
          pins.forEach(pin => {
            if (!pin.marker) {
              addIssuePin(map, pin);
            }
          });
        }
        
        // Set up the click handler for adding new pins
        console.log('Setting up click handler');
        map.on('click', (e: L.LeafletMouseEvent) => {
          if (pinMode) {
            const {lat, lng} = e.latlng;
            console.log('Map clicked at coordinates:', lat, lng);
            
            // Store the coordinates for the new pin
            setNewPinCoords({x: lng, y: lat});
            
            // Open the dialog to add a new issue
            setIsPinDialogOpen(true);
          }
        });
        
        // Track mouse position for coordinate display
        map.on('mousemove', (e: L.LeafletMouseEvent) => {
          if (pinMode) {
            setMouseCoords({x: e.latlng.lng, y: e.latlng.lat});
          }
        });
        
        map.on('mouseout', () => {
          setMouseCoords(null);
        });
        
        // Cleanup function
        return () => {
          if (mapInstanceRef.current) {
            console.log('Cleaning up map instance on unmount');
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }
        };
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
    
    initializeMap();
  }, [imagePath, addIssuePin, pins, pinMode, showControls, existingIssues]);
  
  // Recreate grid when dimensions change
  useEffect(() => {
    if (showGrid && mapInstanceRef.current) {
      toggleGrid();
      toggleGrid();
    }
  }, [isFullscreen, toggleGrid, showGrid]);
  
  // Recalculate the map container size when window is resized
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        console.log('Invalidating map size and fitting to bounds');
        mapInstanceRef.current.invalidateSize();
        
        // Find image overlay bounds and fit to them
        if (mapInstanceRef.current._layers) {
          const bounds = Object.values(mapInstanceRef.current._layers)
            .filter((layer: any) => layer instanceof L.ImageOverlay)
            .map((layer: any) => layer.getBounds())
            .find(Boolean);
            
          if (bounds) {
            mapInstanceRef.current.fitBounds(bounds);
          }
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Call once to make sure size is correct
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Log the image source being used
  useEffect(() => {
    console.log(`Using image source: ${imagePath}`);
  }, [imagePath]);
  
  return (
    <div className={`leaflet-plan-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="leaflet-plan-header">
        <h2>{isInterior ? 'Interior Floor Plan' : 'Exterior Floor Plan'}</h2>
        {showControls && (
          <div className="map-controls">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => mapInstanceRef.current?.zoomIn()}
              title={t('zoomIn')}
            >
              <ZoomIn size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => mapInstanceRef.current?.zoomOut()}
              title={t('zoomOut')}
            >
              <ZoomOut size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleFullscreen}
              title={t('toggleFullscreen')}
            >
              <Maximize size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleGrid}
              title={t('toggleGrid')}
              className={showGrid ? 'active' : ''}
            >
              <Grid size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPinMode(!pinMode)}
              title={pinMode ? t('disablePinMode') : t('enablePinMode')}
              className={pinMode ? 'active' : ''}
            >
              <MapPin size={16} />
            </Button>
          </div>
        )}
      </div>
      
      <div 
        ref={mapRef} 
        className={`leaflet-map-container ${pinMode ? 'pin-mode' : ''}`}
      />
      
      {pinMode && mouseCoords && (
        <div className="coordinates-display">
          X: {Math.round(mouseCoords.x)}, Y: {Math.round(mouseCoords.y)}
        </div>
      )}
      
      {/* Dialog for adding a new issue */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report New Issue</DialogTitle>
            <DialogDescription>
              Submit details about the issue at this location.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <IssueReportForm 
              onSuccess={handleAddIssue}
              coordinates={{
                pinX: newPinCoords?.x,
                pinY: newPinCoords?.y,
                isInteriorPin: isInterior
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for viewing issue details */}
      <Dialog open={isIssueDetailsDialogOpen} onOpenChange={setIsIssueDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
          </DialogHeader>
          
          {selectedIssue && (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium">{selectedIssue.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge>
                    {selectedIssue.status}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <p>{selectedIssue.description}</p>
                
                <div className="text-sm text-muted-foreground">
                  {selectedIssue.reportedByName && (
                    <div>Reported by: {selectedIssue.reportedByName}</div>
                  )}
                  
                  {selectedIssue.createdAt && (
                    <div>Date: {new Date(selectedIssue.createdAt).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button 
                  onClick={handleMarkAsFixed}
                  disabled={
                    selectedIssue.status === IssueStatus.FIXED || 
                    selectedIssue.status === IssueStatus.COMPLETED
                  }
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Fixed
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setIsIssueDetailsDialogOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Status update dialog */}
      <Dialog open={isIssueStatusDialogOpen} onOpenChange={setIsIssueStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Issue Status</DialogTitle>
            <DialogDescription>
              Change the status of this issue and add optional notes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">New Status</Label>
              <Select 
                defaultValue={newStatus} 
                onValueChange={(value) => setNewStatus(value as IssueStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={IssueStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={IssueStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={IssueStatus.SCHEDULED}>Scheduled</SelectItem>
                  <SelectItem value={IssueStatus.URGENT}>Urgent</SelectItem>
                  <SelectItem value={IssueStatus.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={IssueStatus.FIXED}>Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                placeholder="Add any notes about this status change" 
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsIssueStatusDialogOpen(false)}
              >
                Cancel
              </Button>
              
              <Button
                variant="default"
                onClick={newStatus === IssueStatus.FIXED ? handleMarkAsFixed : handleUpdateIssueStatus}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Status legend */}
      {showControls && (
        <div className="status-legend">
          <h3>Status Legend</h3>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color legend-pending"></span>
              <span>Pending</span>
            </div>
            <div className="legend-item">
              <span className="legend-color legend-in-progress"></span>
              <span>In Progress</span>
            </div>
            <div className="legend-item">
              <span className="legend-color legend-urgent"></span>
              <span>Urgent</span>
            </div>
            <div className="legend-item">
              <span className="legend-color legend-scheduled"></span>
              <span>Scheduled</span>
            </div>
            <div className="legend-item">
              <span className="legend-color legend-fixed"></span>
              <span>Fixed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}