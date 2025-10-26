// ===================================================================
// UPDATED FRONTEND SERVICES FOR NORMALIZED BACKEND
// Enhanced Location Flow and Map Display Integration  
// Date: October 23, 2025
// ===================================================================

// ===================== LIVE TRACKING SERVICE =====================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './config';

class LiveTrackingService {
  constructor() {
    this.locationUpdateInterval = null;
    this.trackingInterval = null;
    this.isTracking = false;
    this.currentLoadId = null;
  }

  // Enhanced location update with normalized API
  async updateDriverLocation(locationData, loadId = null) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          speed: locationData.speed,
          heading: locationData.heading,
          altitude: locationData.altitude,
          address: locationData.address,
          loadId: loadId // Link to specific load if tracking
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update location');
      }

      console.log('Location updated successfully:', result.data);
      return result.data;

    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  // Get live tracking data with enhanced location flow
  async getLiveTrackingData(loadId) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/loads/${loadId}/live-tracking`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get tracking data');
      }

      // Transform data for frontend consumption
      const trackingData = result.data;
      
      return {
        load: trackingData.load,
        driver: trackingData.driver,
        tracking: {
          isLive: trackingData.tracking.isLive,
          currentLocation: trackingData.tracking.currentLocation,
          eta: trackingData.tracking.eta,
          locationHistory: trackingData.tracking.locationHistory,
          // Additional map display properties
          routeCoordinates: this.generateRouteCoordinates(trackingData.tracking.locationHistory),
          mapBounds: this.calculateMapBounds(trackingData)
        }
      };

    } catch (error) {
      console.error('Error getting live tracking data:', error);
      throw error;
    }
  }

  // Generate route coordinates for map polyline
  generateRouteCoordinates(locationHistory) {
    if (!locationHistory || locationHistory.length === 0) {
      return [];
    }

    return locationHistory
      .filter(point => point.latitude && point.longitude)
      .map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // Calculate optimal map bounds for display
  calculateMapBounds(trackingData) {
    const coordinates = [];
    
    // Add pickup location
    if (trackingData.load.pickup) {
      coordinates.push({
        latitude: trackingData.load.pickup.latitude,
        longitude: trackingData.load.pickup.longitude
      });
    }
    
    // Add drop location
    if (trackingData.load.drop) {
      coordinates.push({
        latitude: trackingData.load.drop.latitude,
        longitude: trackingData.load.drop.longitude
      });
    }
    
    // Add current location
    if (trackingData.tracking.currentLocation) {
      coordinates.push({
        latitude: trackingData.tracking.currentLocation.latitude,
        longitude: trackingData.tracking.currentLocation.longitude
      });
    }
    
    // Add location history points
    if (trackingData.tracking.locationHistory) {
      trackingData.tracking.locationHistory.forEach(point => {
        coordinates.push({
          latitude: point.latitude,
          longitude: point.longitude
        });
      });
    }

    if (coordinates.length === 0) {
      return null;
    }

    // Calculate bounding box
    const latitudes = coordinates.map(coord => coord.latitude);
    const longitudes = coordinates.map(coord => coord.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    // Add padding
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;
    
    return {
      southwest: {
        latitude: minLat - latPadding,
        longitude: minLng - lngPadding
      },
      northeast: {
        latitude: maxLat + latPadding,
        longitude: maxLng + lngPadding
      }
    };
  }

  // Start continuous location tracking
  async startLocationTracking(loadId, intervalMs = 10000) {
    try {
      this.currentLoadId = loadId;
      this.isTracking = true;
      
      // Request location permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Start location updates
      this.locationUpdateInterval = setInterval(async () => {
        if (!this.isTracking) return;

        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            maximumAge: 5000
          });

          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            heading: location.coords.heading,
            altitude: location.coords.altitude
          };

          // Get address from coordinates
          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            });
            
            if (reverseGeocode.length > 0) {
              const addr = reverseGeocode[0];
              locationData.address = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
            }
          } catch (geocodeError) {
            console.warn('Geocoding failed:', geocodeError.message);
          }

          // Update location via normalized API
          await this.updateDriverLocation(locationData, loadId);
          
        } catch (error) {
          console.error('Location update failed:', error);
        }
      }, intervalMs);

      console.log(`Started location tracking for load ${loadId}`);
      
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  // Stop location tracking
  stopLocationTracking() {
    this.isTracking = false;
    this.currentLoadId = null;
    
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    console.log('Location tracking stopped');
  }

  // Get nearby drivers for vendors
  async getNearbyDrivers(latitude, longitude, radius = 50, vehicleType = null) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams({
        lat: latitude.toString(),
        lng: longitude.toString(),
        radius: radius.toString()
      });
      
      if (vehicleType) {
        params.append('vehicleType', vehicleType);
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/location/nearby-drivers?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get nearby drivers');
      }

      return result.data;

    } catch (error) {
      console.error('Error getting nearby drivers:', error);
      throw error;
    }
  }

  // Get current location of specific driver
  async getDriverCurrentLocation(driverId) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/drivers/${driverId}/current-location`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get driver location');
      }

      return result.data;

    } catch (error) {
      console.error('Error getting driver location:', error);
      throw error;
    }
  }
}

export default new LiveTrackingService();