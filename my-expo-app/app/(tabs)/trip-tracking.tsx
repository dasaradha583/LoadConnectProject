import AuthService from '@/services/auth';
import CameraService from '@/services/camera';
import LoadService from '@/services/load';
import LocationService from '@/services/location';
import NotificationService from '@/services/notification';
import { Driver, Load } from '@/types/user';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TripTrackingScreen() {
  const [activeLoads, setActiveLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);

  useEffect(() => {
    initializeScreen();
    return () => {
      // Clean up location tracking when component unmounts
      const locationService = LocationService.getInstance();
      locationService.stopLocationTracking();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeScreen = async () => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser() as Driver;
      setCurrentDriver(user);

      if (user) {
        await loadActiveTrips(user.id);
      }
    } catch (error) {
      console.error('Error initializing trip tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTrips = async (driverId: string) => {
    try {
      const loadService = LoadService.getInstance();
      const driverLoads = await loadService.getLoadsByDriver(driverId);
      
      // Filter for active loads (assigned, picked up, in transit)
      const active = driverLoads.filter(load => 
        ['assigned', 'picked_up', 'in_transit'].includes(load.status)
      );
      
      setActiveLoads(active);
    } catch (error) {
      console.error('Error loading active trips:', error);
    }
  };

  const handleRefresh = async () => {
    if (!currentDriver) return;
    
    setRefreshing(true);
    await loadActiveTrips(currentDriver.id);
    setRefreshing(false);
  };

  const startLocationTracking = async () => {
    try {
      const locationService = LocationService.getInstance();
      const notificationService = NotificationService.getInstance();
      
      const success = await locationService.startLocationTracking((location) => {
        console.log('Location updated:', location);
        // Here you could send location updates to your backend
      });

      if (success) {
        setLocationTracking(true);
        locationService.startRouteTracking();
        
        await notificationService.sendImmediateNotification({
          title: '📍 GPS Tracking Started',
          body: 'Your location is now being tracked for delivery updates',
        });
      } else {
        Alert.alert('Error', 'Could not start location tracking. Please check your permissions.');
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopLocationTracking = async () => {
    try {
      const locationService = LocationService.getInstance();
      const notificationService = NotificationService.getInstance();
      
      locationService.stopLocationTracking();
      const routePoints = locationService.stopRouteTracking();
      
      setLocationTracking(false);
      
      console.log(`Route completed with ${routePoints.length} points`);
      
      await notificationService.sendImmediateNotification({
        title: '🛑 GPS Tracking Stopped',
        body: 'Location tracking has been stopped',
      });
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };

  const updateLoadStatus = async (loadId: string, newStatus: Load['status']) => {
    try {
      const loadService = LoadService.getInstance();
      const notificationService = NotificationService.getInstance();
      
      const success = await loadService.updateLoadStatus(loadId, newStatus, currentDriver?.id || '');
      
      if (success) {
        // Refresh active loads
        if (currentDriver) {
          await loadActiveTrips(currentDriver.id);
        }
        
        // Send notification based on status (requires loadId and status)
        await notificationService.notifyDeliveryUpdate(loadId, newStatus);
        
        // Show success message
        const statusMessages = {
          'picked_up': 'Load marked as picked up!',
          'in_transit': 'Load is now in transit!',
          'delivered': 'Load marked as delivered!',
        };
        
        Alert.alert('Status Updated', statusMessages[newStatus as keyof typeof statusMessages]);
      } else {
        Alert.alert('Error', 'Failed to update load status');
      }
    } catch (error) {
      console.error('Error updating load status:', error);
      Alert.alert('Error', 'Failed to update load status');
    }
  };

  const takeProofOfDelivery = async (loadId: string) => {
    try {
      const cameraService = CameraService.getInstance();
      const result = await cameraService.takeProofOfDelivery(); // No arguments needed
      
      if (result) {
        // Update load with proof of delivery
        const loadService = LoadService.getInstance();
        // result is a string (URI), not an object with savedPath
        await loadService.updateLoadStatus(loadId, 'delivered', result);
        
        Alert.alert(
          'Proof Captured',
          'Delivery proof has been captured and saved!',
          [
            {
              text: 'Mark as Delivered',
              onPress: () => updateLoadStatus(loadId, 'delivered'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Error taking proof of delivery:', error);
      Alert.alert('Error', 'Failed to capture proof of delivery');
    }
  };

  const checkProximityToLocation = async (load: Load, locationType: 'pickup' | 'drop') => {
    try {
      const locationService = LocationService.getInstance();
      const currentLocation = await locationService.getCurrentLocation();
      
      if (!currentLocation) return;
      
      const targetLocation = locationType === 'pickup' ? load.pickupLocation : load.dropLocation;
      
      const isNear = locationService.isLocationNearDestination(
        currentLocation,
        targetLocation,
        0.2 // 200 meters threshold
      );
      
      if (isNear) {
        const notificationService = NotificationService.getInstance();
        // notifyLocationReached only needs 1 argument (locationType)
        await notificationService.notifyLocationReached(locationType);
        
        const actionText = locationType === 'pickup' ? 'Mark as Picked Up' : 'Take Proof & Deliver';
        const nextStatus = locationType === 'pickup' ? 'picked_up' : 'delivered';
        
        Alert.alert(
          `${locationType === 'pickup' ? 'Pickup' : 'Delivery'} Location Reached`,
          `You've arrived at the ${locationType} location. Ready to proceed?`,
          [
            { text: 'Not Yet', style: 'cancel' },
            {
              text: actionText,
              onPress: () => {
                if (locationType === 'drop') {
                  takeProofOfDelivery(load.id);
                } else {
                  updateLoadStatus(load.id, nextStatus);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking proximity:', error);
    }
  };

  const renderActiveLoad = (load: Load) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'assigned': return '#ffc107';
        case 'picked_up': return '#17a2b8';
        case 'in_transit': return '#28a745';
        default: return '#6c757d';
      }
    };

    const getNextAction = (status: string) => {
      switch (status) {
        case 'assigned': return { text: 'Mark Picked Up', action: () => updateLoadStatus(load.id, 'picked_up') };
        case 'picked_up': return { text: 'Start Transit', action: () => updateLoadStatus(load.id, 'in_transit') };
        case 'in_transit': return { text: 'Capture Proof', action: () => takeProofOfDelivery(load.id) };
        default: return null;
      }
    };

    const nextAction = getNextAction(load.status);

    return (
      <View key={load.id} style={styles.loadCard}>
        <View style={styles.loadHeader}>
          <View>
            <Text style={styles.loadWeight}>{load.weight} tons</Text>
            <Text style={[styles.loadStatus, { color: getStatusColor(load.status) }]}>
              {load.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.loadBudget}>₹{load.budget.toLocaleString()}</Text>
        </View>

        <Text style={styles.loadDescription}>{load.description}</Text>

        <View style={styles.locationRow}>
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>📍 Pickup</Text>
            <Text style={styles.locationText}>{load.pickupLocation.address}</Text>
            <TouchableOpacity
              style={styles.proximityButton}
              onPress={() => checkProximityToLocation(load, 'pickup')}
            >
              <Text style={styles.proximityButtonText}>Check Location</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>🎯 Drop</Text>
            <Text style={styles.locationText}>{load.dropLocation.address}</Text>
            <TouchableOpacity  
              style={styles.proximityButton}
              onPress={() => checkProximityToLocation(load, 'drop')}
            >
              <Text style={styles.proximityButtonText}>Check Location</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionRow}>
          {nextAction && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: getStatusColor(load.status) }]}
              onPress={nextAction.action}
            >
              <Text style={styles.actionButtonText}>{nextAction.text}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your active trips...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip Tracking</Text>
        <Text style={styles.headerSubtitle}>
          {activeLoads.length} active {activeLoads.length === 1 ? 'trip' : 'trips'}
        </Text>
      </View>

      <View style={styles.trackingSection}>
        <View style={styles.trackingHeader}>
          <Text style={styles.trackingTitle}>GPS Tracking</Text>
          <View style={[styles.trackingStatus, { backgroundColor: locationTracking ? '#28a745' : '#dc3545' }]}>
            <Text style={styles.trackingStatusText}>
              {locationTracking ? '● ACTIVE' : '○ INACTIVE'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.trackingButton,
            { backgroundColor: locationTracking ? '#dc3545' : '#28a745' }
          ]}
          onPress={locationTracking ? stopLocationTracking : startLocationTracking}
        >
          <Text style={styles.trackingButtonText}>
            {locationTracking ? '🛑 Stop Tracking' : '▶️ Start Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.loadsSection}>
        {activeLoads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={styles.emptyTitle}>No Active Trips</Text>
            <Text style={styles.emptyText}>
              You don&apos;t have any active trips at the moment. Check the Loads tab to find new opportunities!
            </Text>
          </View>
        ) : (
          activeLoads.map(renderActiveLoad)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  trackingSection: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  trackingStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trackingStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trackingButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadsSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  loadWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E5D8A',
  },
  loadStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  loadBudget: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  loadDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  locationItem: {
    flex: 0.48,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  proximityButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  proximityButtonText: {
    fontSize: 10,
    color: '#495057',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
});
