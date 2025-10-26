// Enhanced Live Tracking Service for LoadConnect
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { api } from './api';

export interface LocationData {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

export interface TrackingData {
  loadId: string;
  location: LocationData;
  eta?: {
    distance: number;
    estimatedSpeed: number;
    etaMinutes: number;
    etaText: string;
  };
  geofenceAlerts?: {
    type: string;
    message: string;
    location: string;
    distance: number;
  }[];
  lastUpdate: string;
}

export interface LiveTrackingResponse {
  load: {
    id: string;
    status: string;
    isPickedUp: boolean;
    isDropped: boolean;
    pickup: {
      address: string;
      lat: number;
      lng: number;
      contactName?: string;
      contactPhone?: string;
    };
    drop: {
      address: string;
      lat: number;
      lng: number;
      contactName?: string;
      contactPhone?: string;
    };
  };
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
  };
  tracking: {
    isLive: boolean;
    currentLocation?: LocationData;
    eta?: any;
    routeInfo?: any;
    locationHistory: LocationData[];
    lastUpdate?: string;
  };
  geofences: {
    pickup: { center: { lat: number; lng: number }; radius: number };
    drop: { center: { lat: number; lng: number }; radius: number };
  };
}

class LiveTrackingService {
  private static instance: LiveTrackingService;
  private locationSubscription: Location.LocationSubscription | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;
  private isTracking = false;
  private currentLoadId: string | null = null;
  private lastLocationUpdate: Date | null = null;
  private trackingCallbacks: ((data: TrackingData) => void)[] = [];

  static getInstance(): LiveTrackingService {
    if (!LiveTrackingService.instance) {
      LiveTrackingService.instance = new LiveTrackingService();
    }
    return LiveTrackingService.instance;
  }

  // Start live tracking for a driver
  async startDriverTracking(loadId: string): Promise<boolean> {
    try {
      console.log(`🚀 Starting live tracking for load: ${loadId}`);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Request background permissions for continuous tracking
      if (Platform.OS === 'android') {
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus.status !== 'granted') {
          console.warn('Background location permission denied - tracking may be limited');
        }
      }

      this.currentLoadId = loadId;
      this.isTracking = true;

      // Start location subscription
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Or every 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      // Start periodic status checks
      this.trackingInterval = setInterval(() => {
        this.checkTrackingStatus();
      }, 30000); // Every 30 seconds

      console.log('✅ Live tracking started successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to start live tracking:', error);
      return false;
    }
  }

  // Stop live tracking
  async stopDriverTracking(): Promise<void> {
    try {
      console.log('🛑 Stopping live tracking');

      this.isTracking = false;
      this.currentLoadId = null;

      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }

      console.log('✅ Live tracking stopped');
    } catch (error) {
      console.error('❌ Error stopping live tracking:', error);
    }
  }

  // Handle location updates from GPS
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    if (!this.isTracking || !this.currentLoadId) return;

    try {
      const locationData: LocationData = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        heading: location.coords.heading ?? undefined,
        speed: location.coords.speed ?? undefined,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: new Date().toISOString()
      };

      // Update driver location using our new method
      const locationUpdateSuccess = await this.updateDriverLocation(this.currentLoadId, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        speed: location.coords.speed ?? 0,
        heading: location.coords.heading ?? 0,
        accuracy: location.coords.accuracy ?? 0
      });

      if (locationUpdateSuccess) {
        this.lastLocationUpdate = new Date();
        console.log(`📍 Location updated: ${locationData.lat}, ${locationData.lng}`);
      }

      // Also try the legacy stream-location endpoint for backward compatibility
      try {
        const response = await api.post(`/loads/${this.currentLoadId}/stream-location`, locationData);
        if (response.success && response.data) {
          const responseData = response.data as any;
          const trackingData: TrackingData = {
            loadId: this.currentLoadId,
            location: locationData,
            eta: responseData.eta,
            geofenceAlerts: responseData.geofenceAlerts,
            lastUpdate: locationData.timestamp
          };

          this.notifyCallbacks(trackingData);
        }
      } catch (streamError) {
        console.warn('Legacy stream-location failed:', streamError);
      }

    } catch (error) {
      console.error('❌ Failed to stream location:', error);
    }
  }

  // Check tracking status and handle issues
  private checkTrackingStatus(): void {
    if (!this.isTracking) return;

    const now = new Date();
    const timeSinceLastUpdate = this.lastLocationUpdate 
      ? now.getTime() - this.lastLocationUpdate.getTime()
      : 0;

    // If no location update in 2 minutes, something might be wrong
    if (timeSinceLastUpdate > 120000) {
      console.warn('⚠️ No location updates for 2 minutes - checking GPS status');
      this.diagnoseTrackingIssues();
    }
  }

  // Diagnose and handle tracking issues
  private async diagnoseTrackingIssues(): Promise<void> {
    try {
      // Check if location services are still enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        console.error('❌ Location services disabled');
        return;
      }

      // Try to get current position manually
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (position) {
        console.log('✅ GPS working - manual position obtained');
        this.handleLocationUpdate(position);
      }

    } catch (error) {
      console.error('❌ GPS diagnosis failed:', error);
    }
  }

  // Get live tracking data for vendors
  async getLiveTrackingData(loadId: string): Promise<LiveTrackingResponse | null> {
    try {
      console.log(`🔍 [LiveTracking] Requesting live tracking data for load: ${loadId}`);
      console.log(`📡 [LiveTracking] Making API call to: /loads/${loadId}/live-tracking`);
      
      // Check authentication status
      const authStatus = api.getAuthenticationStatus();
      console.log(`🔐 [LiveTracking] Authentication status:`, authStatus);
      
      if (!authStatus.hasToken) {
        console.warn(`⚠️ [LiveTracking] No authentication token available - API call may fail`);
      }
      
      const response = await api.get(`/loads/${loadId}/live-tracking`);
      
      console.log(`📊 [LiveTracking] API response:`, response);
      
      if (response.success) {
        console.log(`✅ [LiveTracking] Successfully retrieved tracking data`);
        return response.data as LiveTrackingResponse;
      }
      
      console.log(`❌ [LiveTracking] API returned unsuccessful response`);
      return null;
    } catch (error) {
      console.error('❌ [LiveTracking] Failed to get live tracking data:', error);
      
      // Additional error details
      if (error instanceof Error) {
        console.error('❌ [LiveTracking] Error message:', error.message);
        console.error('❌ [LiveTracking] Error stack:', error.stack);
      }
      
      return null;
    }
  }

  // Get location history
  async getLocationHistory(loadId: string, options?: {
    limit?: number;
    from?: Date;
    to?: Date;
  }): Promise<LocationData[]> {
    try {
      const params: any = {};
      if (options?.limit) params.limit = options.limit;
      if (options?.from) params.from = options.from.toISOString();
      if (options?.to) params.to = options.to.toISOString();

      const queryParams = new URLSearchParams(params).toString();
      const endpoint = queryParams 
        ? `/loads/${loadId}/location-history?${queryParams}`
        : `/loads/${loadId}/location-history`;
      const response = await api.get(endpoint);
      
      if (response.success) {
        return response.data as LocationData[];
      }
      
      return [];
    } catch (error) {
      console.error('❌ Failed to get location history:', error);
      return [];
    }
  }

  // Get current driver location/coordinates for a specific load
  async getDriverCurrentLocation(loadId: string): Promise<{
    latitude: number;
    longitude: number;
    lastUpdate: string;
    speed?: number;
    heading?: number;
    accuracy?: number;
  } | null> {
    try {
      console.log(`🗺️ [LiveTracking] Getting driver current location for load: ${loadId}`);
      
      // Check authentication status
      const authStatus = api.getAuthenticationStatus();
      console.log(`🔐 [LiveTracking] Authentication status:`, authStatus);
      
      if (!authStatus.hasToken) {
        console.warn(`⚠️ [LiveTracking] No authentication token available`);
        return null;
      }
      
      const response = await api.get(`/loads/${loadId}/driver-location`);
      
      if (response.success && response.data) {
        console.log(`✅ [LiveTracking] Driver location retrieved:`, response.data);
        const apiData = response.data as any;
        
        // The API returns { driver, load, location }, extract the location object
        const locationData = apiData.location || apiData;
        
        return {
          latitude: locationData.latitude || locationData.lat,
          longitude: locationData.longitude || locationData.lng,
          lastUpdate: locationData.lastUpdate || locationData.timestamp,
          speed: locationData.speed,
          heading: locationData.heading,
          accuracy: locationData.accuracy
        };
      }
      
      console.log(`❌ [LiveTracking] No driver location data available`);
      return null;
    } catch (error) {
      console.error('❌ [LiveTracking] Failed to get driver location:', error);
      return null;
    }
  }

  // Update driver location (for drivers)
  async updateDriverLocation(loadId: string, location: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
  }): Promise<boolean> {
    try {
      console.log(`📍 [LiveTracking] Updating driver location for load: ${loadId}`);
      
      const response = await api.post(`/loads/${loadId}/update-location`, {
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed || 0,
        heading: location.heading || 0,
        accuracy: location.accuracy || 0,
        timestamp: new Date().toISOString()
      });
      
      if (response.success) {
        console.log(`✅ [LiveTracking] Driver location updated successfully`);
        return true;
      }
      
      console.log(`❌ [LiveTracking] Failed to update driver location:`, response.message);
      return false;
    } catch (error: any) {
      console.error('❌ [LiveTracking] Error updating driver location:', error);
      
      // If load is no longer active (delivered, cancelled, etc.), stop tracking
      if (error.message && (
        error.message.includes('delivered') || 
        error.message.includes('completed') ||
        error.message.includes('cancelled') ||
        error.message.includes('Cannot update location')
      )) {
        console.log('🛑 [LiveTracking] Load is no longer active, stopping tracking');
        await this.stopDriverTracking();
      }
      
      return false;
    }
  }

  // Subscribe to tracking updates
  onTrackingUpdate(callback: (data: TrackingData) => void): () => void {
    this.trackingCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.trackingCallbacks.indexOf(callback);
      if (index > -1) {
        this.trackingCallbacks.splice(index, 1);
      }
    };
  }

  // Notify all callbacks
  private notifyCallbacks(data: TrackingData): void {
    this.trackingCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in tracking callback:', error);
      }
    });
  }

  // Utility: Calculate distance between two points
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Check if tracking is active
  get isActivelyTracking(): boolean {
    return this.isTracking && !!this.currentLoadId;
  }

  // Get current load being tracked
  get currentLoad(): string | null {
    return this.currentLoadId;
  }

  // Get last update time
  get lastUpdate(): Date | null {
    return this.lastLocationUpdate;
  }
}

export default LiveTrackingService;
