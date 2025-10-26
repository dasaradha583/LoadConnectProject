import * as Location from 'expo-location';
import { api } from './api';

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface RoutePoint extends LocationData {
  id: string;
}

export interface GeofenceRegion {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  title: string;
}

class LocationService {
  private static instance: LocationService;
  private watchId: Location.LocationSubscription | null = null;
  private currentLocation: LocationData | null = null;
  private routePoints: RoutePoint[] = [];
  private geofences: GeofenceRegion[] = [];
  private trackingActive: boolean = false;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return false;
      }

      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.log('Background location permission denied');
        // Still return true as foreground permission is sufficient for basic functionality
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
        accuracy: location.coords.accuracy || undefined,
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
      };

      this.currentLocation = locationData;
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  async startLocationTracking(callback: (location: LocationData) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: Date.now(),
            accuracy: location.coords.accuracy || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
          };
          this.currentLocation = locationData;
          
          // Add to route if tracking is active
          if (this.trackingActive) {
            this.addRoutePoint(locationData);
          }
          
          // Check geofences
          this.checkGeofences(locationData);
          
          callback(locationData);
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  stopLocationTracking(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  getLastKnownLocation(): LocationData | null {
    return this.currentLocation;
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Route tracking methods
  startRouteTracking(): void {
    this.trackingActive = true;
    this.routePoints = [];
  }

  stopRouteTracking(): RoutePoint[] {
    this.trackingActive = false;
    return [...this.routePoints];
  }

  private addRoutePoint(location: LocationData): void {
    const routePoint: RoutePoint = {
      ...location,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    this.routePoints.push(routePoint);
  }

  getRoutePoints(): RoutePoint[] {
    return [...this.routePoints];
  }

  clearRoute(): void {
    this.routePoints = [];
  }

  // Geofencing methods
  addGeofence(geofence: GeofenceRegion): void {
    this.geofences.push(geofence);
  }

  removeGeofence(geofenceId: string): void {
    this.geofences = this.geofences.filter(g => g.id !== geofenceId);
  }

  private checkGeofences(location: LocationData): void {
    this.geofences.forEach(geofence => {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      ) * 1000; // Convert to meters

      if (distance <= geofence.radius) {
        // Driver entered geofence
        console.log(`Entered geofence: ${geofence.title}`);
        // Here you could trigger a callback or event
      }
    });
  }

  // Utility methods
  calculateTotalDistance(points: RoutePoint[]): number {
    if (points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.calculateDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }
    return totalDistance;
  }

  getEstimatedTravelTime(distance: number, averageSpeed: number = 50): number {
    // Returns time in minutes
    return (distance / averageSpeed) * 60;
  }

  isLocationNearDestination(
    currentLocation: LocationData,
    destination: { latitude: number; longitude: number },
    thresholdKm: number = 0.5
  ): boolean {
    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude
    );
    return distance <= thresholdKm;
  }

  // Backend integration methods
  async updateDriverLocationOnServer(driverId: string): Promise<boolean> {
    try {
      if (!this.currentLocation) {
        console.log('No current location to update');
        return false;
      }

      // Get address from coordinates (optional)
      let address: string | undefined;
      try {
        const reverseGeocodeResult = await Location.reverseGeocodeAsync({
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
        });
        
        if (reverseGeocodeResult.length > 0) {
          const result = reverseGeocodeResult[0];
          address = `${result.street || ''} ${result.city || ''} ${result.region || ''}`.trim();
        }
      } catch (error) {
        console.log('Reverse geocoding failed:', error);
      }

      const response = await api.post<any>(`/location/driver/${driverId}/location`, {
        latitude: this.currentLocation.latitude,
        longitude: this.currentLocation.longitude,
        accuracy: this.currentLocation.accuracy,
        speed: this.currentLocation.speed,
        heading: this.currentLocation.heading,
        address,
      });

      return response.success;
    } catch (error) {
      console.error('Error updating driver location on server:', error);
      return false;
    }
  }

  async setDriverAvailabilityOnServer(driverId: string, isAvailable: boolean): Promise<boolean> {
    try {
      const response = await api.post<any>(`/location/driver/${driverId}/availability`, {
        isAvailable,
      });

      return response.success;
    } catch (error) {
      console.error('Error setting driver availability on server:', error);
      return false;
    }
  }

  async getDriverLocationFromServer(driverId: string): Promise<LocationData | null> {
    try {
      const response = await api.get<any>(`/location/driver/${driverId}/location`);
      
      if (response.success && response.data) {
        const location = response.data;
        return {
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          timestamp: new Date(location.lastUpdated).getTime(),
          accuracy: location.accuracy ? parseFloat(location.accuracy) : undefined,
          speed: location.speed ? parseFloat(location.speed) : undefined,
          heading: location.heading ? parseFloat(location.heading) : undefined,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting driver location from server:', error);
      return null;
    }
  }

  async getNearbyDriversFromServer(
    location: { latitude: number; longitude: number },
    radiusKm: number = 50,
    vehicleTypes?: string[]
  ): Promise<{
    driver: any;
    location: LocationData;
    distance: number;
  }[]> {
    try {
      const params = new URLSearchParams({
        lat: location.latitude.toString(),
        lng: location.longitude.toString(),
        radius: radiusKm.toString(),
      });

      if (vehicleTypes && vehicleTypes.length > 0) {
        params.append('vehicleTypes', vehicleTypes.join(','));
      }

      const response = await api.get<any>(`/location/drivers/nearby?${params.toString()}`);
      
      if (response.success && response.data) {
        return response.data.map((item: any) => ({
          driver: item.driver,
          location: {
            latitude: parseFloat(item.location.latitude),
            longitude: parseFloat(item.location.longitude),
            timestamp: new Date(item.location.lastUpdated).getTime(),
            accuracy: item.location.accuracy ? parseFloat(item.location.accuracy) : undefined,
            speed: item.location.speed ? parseFloat(item.location.speed) : undefined,
            heading: item.location.heading ? parseFloat(item.location.heading) : undefined,
          },
          distance: item.distance,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting nearby drivers from server:', error);
      return [];
    }
  }

  // Get count of available drivers near a location
  async getDriverCountFromServer(
    location: { latitude: number; longitude: number }
  ): Promise<{ within100km: number; within150km: number } | null> {
    try {
      const params = new URLSearchParams({
        lat: location.latitude.toString(),
        lng: location.longitude.toString(),
      });

      const response = await api.get<any>(`/location/drivers/count?${params.toString()}`);
      
      if (response.success && response.data) {
        return {
          within100km: response.data.within100km,
          within150km: response.data.within150km,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting driver count from server:', error);
      return null;
    }
  }

  // Start real-time location tracking for drivers
  async startDriverTracking(driverId: string, intervalMs: number = 30000): Promise<void> {
    if (this.trackingActive) {
      console.log('Tracking already active');
      return;
    }

    try {
      await this.requestPermissions();
      await this.startLocationTracking(() => {});
      
      // Update server location periodically
      const updateInterval = setInterval(async () => {
        await this.updateDriverLocationOnServer(driverId);
      }, intervalMs);

      // Store interval ID for cleanup
      (this as any).serverUpdateInterval = updateInterval;
      
      console.log(`Started driver tracking for ${driverId} with ${intervalMs}ms intervals`);
    } catch (error) {
      console.error('Error starting driver tracking:', error);
    }
  }

  async stopDriverTracking(): Promise<void> {
    this.stopLocationTracking();
    
    if ((this as any).serverUpdateInterval) {
      clearInterval((this as any).serverUpdateInterval);
      (this as any).serverUpdateInterval = null;
    }
    
    console.log('Stopped driver tracking');
  }
}

export default LocationService;
