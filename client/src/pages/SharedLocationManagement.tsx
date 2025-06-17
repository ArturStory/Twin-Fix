import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash, MapPin, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SharedLocation {
  id: string;
  name: string;
  type: string;
  address?: string;
  isShared: boolean;
  createdBy?: string;
  createdAt?: string;
}

interface UserPermissions {
  canAddLocations: boolean;
  canScheduleRepairs: boolean;
  role: string | null;
  authenticated: boolean;
  username?: string;
}

export default function SharedLocationManagement() {
  const { t, i18n } = useTranslation();
  
  // Debug translation loading
  console.log('Translation debug:', {
    currentLanguage: i18n.language,
    isInitialized: i18n.isInitialized,
    hasResources: i18n.hasResourceBundle(i18n.language, 'translation'),
    testKey: t('locations.sharedLocationManagement'),
    fallbackTest: t('validation.required')
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");

  // Fetch user permissions and auth data
  const { data: permissions } = useQuery<UserPermissions>({
    queryKey: ['/api/user-permissions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: authData } = useQuery({
    queryKey: ['/api/auth/me'],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch shared locations
  const { data: locations = [], isLoading } = useQuery<SharedLocation[]>({
    queryKey: ['/api/shared-locations'],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Add location mutation
  const addLocationMutation = useMutation({
    mutationFn: async (locationData: { name: string; address?: string }) => {
      console.log('🔍 Attempting to add location:', locationData);
      
      // Try to refresh authentication before making the request
      try {
        const authCheck = await fetch('/api/auth/me', { credentials: 'include' });
        const authResult = await authCheck.json();
        console.log('🔐 Auth status before location creation:', authResult);
      } catch (e) {
        console.log('🔐 Auth check failed:', e);
      }
      
      // Get stored user data as fallback
      const storedUser = localStorage.getItem('auth_user');
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      // Add auth header if we have stored user data
      if (storedUser) {
        headers['x-user-auth'] = storedUser;
        console.log('🔄 Adding fallback auth header');
      }
      
      const response = await fetch('/api/shared-locations', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name: locationData.name,
          type: 'restaurant',
          address: locationData.address
        })
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add location');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shared-locations'] });
      setNewLocationName("");
      setNewLocationAddress("");
      toast({
        title: t('locations.locationAdded'),
        description: t('locations.locationAddedDescription'),
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error('Error adding location:', error);
      toast({
        title: t('error.failed'),
        description: error.message || t('locations.failedToAddLocation'),
        variant: "destructive",
      });
    }
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      // Get stored user data for authentication
      const storedUser = localStorage.getItem('auth_user');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add auth header if we have stored user data
      if (storedUser) {
        headers['x-user-auth'] = storedUser;
      }
      
      const response = await fetch(`/api/shared-locations/${locationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete location');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shared-locations'] });
      toast({
        title: t('locations.locationDeleted'),
        description: t('locations.locationDeletedDescription'),
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting location:', error);
      toast({
        title: t('error.failed'),
        description: error.message || t('locations.failedToDeleteLocation'),
        variant: "destructive",
      });
    }
  });

  const handleAddLocation = () => {
    if (!newLocationName.trim()) {
      toast({
        title: t('validation.required'),
        description: t('locations.locationNameRequired'),
        variant: "destructive",
      });
      return;
    }

    addLocationMutation.mutate({
      name: newLocationName.trim(),
      address: newLocationAddress.trim() || undefined
    });
  };

  const handleDeleteLocation = (locationId: string) => {
    deleteLocationMutation.mutate(locationId);
  };

  // Check if user is stored in localStorage (fallback for authentication issues)
  const storedUser = localStorage.getItem('auth_user');
  const hasStoredAuth = storedUser ? JSON.parse(storedUser) : null;

  // Allow access if user is authenticated through any method
  const isAuthenticated = permissions?.authenticated || (authData as any)?.authenticated || hasStoredAuth;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto pb-20">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t('auth.loginRequired')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('sharedLocationManagement', 'Zarządzanie Współdzielonymi Lokalizacjami')}</h1>
        <p className="text-muted-foreground">{t('manageSharedLocations', 'Zarządzaj lokalizacjami dostępnymi dla wszystkich użytkowników')}</p>
      </div>

      {/* Add Location Section - Only for admin/owner */}
      {(permissions?.canAddLocations || 
        (authData as any)?.user?.role === 'admin' || 
        (authData as any)?.user?.role === 'owner' ||
        (hasStoredAuth && ['admin', 'owner'].includes(hasStoredAuth.role))) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <Plus className="mr-2 h-5 w-5 inline" />
              {t('addNewLocation', 'Dodaj Nową Lokalizację')}
            </CardTitle>
            <CardDescription>
              {t('enterLocationDetails', 'Wprowadź szczegóły lokalizacji')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location-name">{t('locationName', 'Nazwa Lokalizacji')}</Label>
                <Input
                  id="location-name"
                  placeholder={t('locationNamePlaceholder', 'np. Restauracja przy Głównej')}
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location-address">
                  {t('address', 'Adres')} ({t('common.optional', 'Opcjonalne')})
                </Label>
                <Input
                  id="location-address"
                  placeholder={t('addressPlaceholder', 'Wprowadź adres lokalizacji')}
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAddLocation}
                disabled={addLocationMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {addLocationMutation.isPending ? t('common.adding', 'Dodawanie...') : t('addLocation', 'Dodaj Lokalizację')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations List */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Building className="mr-2 h-5 w-5 inline" />
            {t('allLocations', 'Wszystkie Lokalizacje')}
          </CardTitle>
          <CardDescription>
            {t('locationsAvailable', 'Dostępne lokalizacje')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{t('locations.noLocationsFound')}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{location.name}</h3>
                    {location.address && (
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {t('shared', 'współdzielona')}
                      </span>
                      {location.createdBy && (
                        <span className="text-xs text-muted-foreground">
                          {t('addedBy', 'dodane przez')} {location.createdBy}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {(permissions?.canAddLocations || 
                    (hasStoredAuth && ['admin', 'owner'].includes(hasStoredAuth.role))) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                      disabled={deleteLocationMutation.isPending}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Info */}
      {!(permissions?.canAddLocations || 
         (hasStoredAuth && ['admin', 'owner'].includes(hasStoredAuth.role))) && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t('locations.adminOnlyMessage')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('auth.currentRole')}: {permissions?.role || t('common.unknown')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}