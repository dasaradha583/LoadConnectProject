import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AuthService from '@/services/auth';
import LiveTrackingQuickActions from '@/components/LiveTracking/LiveTrackingQuickActions';
import DriverTrackingPanel from '@/components/LiveTracking/DriverTrackingPanel';
import VendorTrackingDashboard from '@/components/LiveTracking/VendorTrackingDashboard';
import DriverLocationMap from '@/components/LiveTracking/DriverLocationMap';
import StatusUpdateProgress, { getDeliverySteps } from '@/components/StatusUpdateProgress';
import LiveTrackingService from '@/services/liveTracking';
import RatingModal from '@/components/RatingModal';
import PaymentModal from '@/components/PaymentModal';
import * as Location from 'expo-location';

interface LoadDetails {
  load: any;
  vendor?: any;
  driver?: any;
  contactDetails?: any;
  trackingInfo?: any;
  instructions: string[];
  progress: {
    step: number;
    total: number;
    description: string;
  };
}

export default function LoadDetailsScreen() {
  const { id } = useLocalSearchParams();
  console.log(`🔍 LoadDetailsScreen - Received ID: "${id}", type: ${typeof id}`);
  
  const [loadDetails, setLoadDetails] = useState<LoadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Live tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [showDriverTrackingPanel, setShowDriverTrackingPanel] = useState(false);
  const [showVendorDashboard, setShowVendorDashboard] = useState(false);
  const [showDriverLocationMap, setShowDriverLocationMap] = useState(false);

  // Rating states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    // Check if load ID is provided (handle both undefined and string "undefined")
    if (!id || id === 'undefined' || id === '' || id === 'null') {
      console.log('⚠️ No valid load ID provided, showing empty state');
      setLoading(false);
      Alert.alert(
        'Invalid Load',
        'No load ID provided. Please select a valid load.',
        [{ text: 'Go Back', onPress: () => router.back() }]
      );
      return;
    }
    
    initializeScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const testNetworkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🌐 Testing network connectivity...');
      const { api } = await import('@/services/api');
      const response = await api.get('/health');
      
      if (response.success) {
        console.log('✅ Network connectivity OK');
        return true;
      } else {
        console.log(`❌ Server health check failed`);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Network connectivity failed:', error.message);
      return false;
    }
  }, []);

  const fetchLoadDetails = useCallback(async () => {
    try {
      console.log(`🔍 Fetching load details for ID: ${id}`);
      
      const authService = AuthService.getInstance();
      const token = await authService.getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Use the API service which has retry logic
      const { api } = await import('@/services/api');
      const response = await api.get(`/loads/${id}/details`);
      
      if (response.success && response.data) {
        console.log(`✅ Load details fetched successfully:`, response.data);
        setLoadDetails(response.data as LoadDetails);
      } else {
        throw new Error(response.message || 'Failed to fetch load details');
      }
    } catch (error: any) {
      console.error('❌ Error fetching load details:', error);
      
      let errorMessage = 'Failed to load details';
      if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check:\n• WiFi connection\n• Backend server is running\n• Same network as computer';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Server may be slow or unavailable.';
      } else if (error.message?.includes('token')) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Load Details Error', 
        errorMessage,
        [
          { text: 'Retry', onPress: () => fetchLoadDetails() },
          { text: 'Go Back', onPress: () => router.back() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  }, [id]);

  const initializeScreen = useCallback(async () => {
    try {
      console.log('🚀 Initializing load details screen...');
      
      const authService = AuthService.getInstance();
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Authentication Error', 'Please login again', [
          { text: 'Go to Login', onPress: () => router.replace('/(tabs)') }
        ]);
        return;
      }
      
      console.log(`👤 Current user: ${currentUser.name} (${currentUser.type})`);
      setUser(currentUser);
      
      // Test network connectivity first
      const isConnected = await testNetworkConnectivity();
      if (!isConnected) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please check your network connection.',
          [
            { text: 'Retry', onPress: () => initializeScreen() },
            { text: 'Go Back', onPress: () => router.back() }
          ]
        );
        return;
      }
      
      await fetchLoadDetails();
    } catch (error) {
      console.error('Error initializing load details:', error);
      Alert.alert('Error', 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [fetchLoadDetails, testNetworkConnectivity]);

  useEffect(() => {
    initializeScreen();
  }, [initializeScreen]);

  // Initialize live tracking state
  useEffect(() => {
    if (loadDetails && user) {
      const trackingService = LiveTrackingService.getInstance();
      const currentLoadId = trackingService.currentLoad;
      const isActivelyTracking = trackingService.isActivelyTracking;
      
      if (currentLoadId === id && isActivelyTracking) {
        setIsTracking(true);
      }
    }
  }, [loadDetails, user, id]);



  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLoadDetails();
    setRefreshing(false);
  };

  // Live tracking handlers
  const handleDriverTrackingPress = () => {
    setShowDriverTrackingPanel(true);
  };

  const handleVendorDashboardPress = () => {
    setShowVendorDashboard(true);
  };

  const handleTrackingStateChange = (trackingState: boolean) => {
    setIsTracking(trackingState);
  };

  // Driver action handlers
  const handleLoadPickedUp = async () => {
    Alert.alert(
      'Confirm Pickup',
      'Are you sure you have picked up this load? This will start location sharing with the vendor.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Pickup',
          onPress: async () => {
            try {
              // Get current location for enhanced status update
              let currentLocation = null;
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                  const location = await Location.getCurrentPositionAsync({});
                  currentLocation = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    timestamp: new Date().toISOString()
                  };
                }
              } catch (locationError) {
                console.warn('Could not get location:', locationError);
              }

              const { api } = await import('@/services/api');
              const response = await api.post(`/loads/${id}/driver-status-update`, {
                status: 'picked_up',
                location: currentLocation
              });

              if (response.success) {
                // Automatically start live tracking when load is picked up
                const trackingService = LiveTrackingService.getInstance();
                const trackingStarted = await trackingService.startDriverTracking(id as string);
                
                if (trackingStarted) {
                  setIsTracking(true);
                  Alert.alert(
                    'Load Picked Up Successfully',
                    'Your location is now being shared with the vendor for real-time tracking.',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Load Picked Up',
                    'Load status updated, but live tracking could not be started. You can enable it manually.',
                    [{ text: 'OK' }]
                  );
                }
                
                // Refresh load details
                await fetchLoadDetails();
              } else {
                Alert.alert('Error', response.message || 'Failed to update load status');
              }
            } catch (error: any) {
              console.error('❌ Error updating load status:', error);
              Alert.alert('Error', error.message || 'Failed to update load status');
            }
          }
        }
      ]
    );
  };

  const handleLoadDropped = async () => {
    Alert.alert(
      'Confirm Delivery',
      'Are you sure you have delivered this load successfully?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delivery',
          onPress: async () => {
            try {
              // Get current location for enhanced status update
              let currentLocation = null;
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                  const location = await Location.getCurrentPositionAsync({});
                  currentLocation = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    timestamp: new Date().toISOString()
                  };
                }
              } catch (locationError) {
                console.warn('Could not get location:', locationError);
              }

              const { api } = await import('@/services/api');
              const response = await api.post(`/loads/${id}/driver-status-update`, {
                status: 'delivered',
                location: currentLocation
              });

              if (response.success) {
                // Stop live tracking when load is delivered
                const trackingService = LiveTrackingService.getInstance();
                await trackingService.stopDriverTracking();
                setIsTracking(false);
                
                Alert.alert(
                  'Load Delivered Successfully',
                  'The load has been marked as delivered. The vendor will be notified.',
                  [{ text: 'OK' }]
                );
                
                // Refresh load details
                await fetchLoadDetails();
              } else {
                Alert.alert('Error', response.message || 'Failed to update load status');
              }
            } catch (error: any) {
              console.error('❌ Error updating load status:', error);
              Alert.alert('Error', error.message || 'Failed to update load status');
            }
          }
        }
      ]
    );
  };

  const makePhoneCall = (phoneNumber: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleRating = async (selectedRating: number, review: string, ratingAspects: any) => {
    try {
      const LoadService = (await import('@/services/load')).default;
      const loadService = LoadService.getInstance();

      if (user?.type === 'driver') {
        // Driver rates vendor
        const result = await loadService.rateVendor(id as string, selectedRating);
        
        if (result.success) {
          setHasRated(true);
          setShowRatingModal(false);
          
          const avgRating = result.newRating || 5.0;
          
          Alert.alert(
            'Rating Submitted',
            `Thank you for rating the vendor! New rating: ⭐ ${avgRating.toFixed(2)}`,
            [
              {
                text: 'OK',
                onPress: () => fetchLoadDetails()
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to submit rating. Please try again.');
        }
      } else {
        // Vendor rates driver
        const result = await loadService.rateDriver(id as string, selectedRating, review, ratingAspects);
        
        if (result.success) {
          setHasRated(true);
          setShowRatingModal(false);
          
          const avgRating = result.newAverageRating || 5.0;
          const totalRatings = result.totalRatings || 1;
          
          Alert.alert(
            'Rating Submitted',
            `Thank you for rating! Driver's average rating is now ⭐ ${avgRating.toFixed(2)} (${totalRatings} ${totalRatings === 1 ? 'rating' : 'ratings'})`,
            [
              {
                text: 'OK',
                onPress: () => fetchLoadDetails()
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to submit rating. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', error.message || 'Failed to submit rating');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return '#3B82F6';
      case 'accepted': return '#F59E0B';
      case 'picked_up': return '#8B5CF6';
      case 'in_transit': return '#06B6D4';
      case 'delivered': return '#10B981';
      case 'completed': return '#059669';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'posted': return '📋 Posted';
      case 'accepted': return '✅ Accepted';
      case 'picked_up': return '📦 Picked Up';
      case 'in_transit': return '🚛 In Transit';
      case 'delivered': return '✅ Delivered';
      case 'completed': return '🎉 Completed';
      case 'cancelled': return '❌ Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading load details...</Text>
      </View>
    );
  }

  // Show empty state when no load ID is provided (handle both undefined and string "undefined")
  if (!id || id === 'undefined' || id === '' || id === 'null') {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateContent}>
          <Text style={styles.emptyStateIcon}>📦</Text>
          <Text style={styles.emptyStateTitle}>No Load Selected</Text>
          <Text style={styles.emptyStateMessage}>
            Please click on a load from the list to view its details here.
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/(tabs)/my-loads')}
          >
            <Text style={styles.emptyStateButtonText}>Go to My Loads</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!loadDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load details</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeScreen}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { load, vendor, driver, contactDetails, trackingInfo, instructions } = loadDetails;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Load Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Status and Enhanced Progress */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(load.status) }]}>
            <Text style={styles.statusText}>{getStatusText(load.status)}</Text>
          </View>
          <Text style={styles.loadId}>#{load.id.slice(-6)}</Text>
        </View>
      </View>

      {/* Enhanced Delivery Progress */}
      <StatusUpdateProgress 
        steps={getDeliverySteps(load.status)}
        currentStatus={load.status}
      />

      {/* Load Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Load Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Weight</Text>
            <Text style={styles.infoValue}>
              {load.weight >= 1000 
                ? `${(load.weight / 1000).toFixed(1)} tons`
                : `${load.weight} kg`
              }
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{load.vehicleTypeRequired}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Budget</Text>
            <Text style={styles.infoValue}>₹{load.budget}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Priority</Text>
            <Text style={styles.infoValue}>{load.priority}</Text>
          </View>
        </View>
        <Text style={styles.description}>{load.description}</Text>
        {load.specialInstructions && (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>📝 Special Instructions:</Text>
            <Text style={styles.instructionsText}>{load.specialInstructions}</Text>
          </View>
        )}
      </View>

      {/* Route Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Route Details</Text>
        <View style={styles.routeContainer}>
          {/* Enhanced Pickup Location */}
          <View style={[styles.locationCard, styles.pickupLocationCard]}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIconContainer}>
                <View style={[styles.locationIcon, styles.pickupIcon]}>
                  <Text style={styles.locationIconText}>📍</Text>
                </View>
                <View style={styles.locationTitleContainer}>
                  <Text style={styles.locationTitle}>Pickup Location</Text>
                  {load.status === 'picked_up' && (
                    <View style={styles.statusChip}>
                      <Text style={styles.statusChipText}>✅ Picked Up</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Quick action button for drivers */}
              {user?.type === 'driver' && (load.status === 'assigned' || load.status === 'accepted') && (
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={handleLoadPickedUp}
                >
                  <Text style={styles.quickActionText}>Mark Picked</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.locationAddress}>{load.pickupAddress}</Text>
            
            {/* Navigate Button - Available for all users */}
            <TouchableOpacity
              style={styles.navigateButton}
              onPress={() => {
                const url = Platform.select({
                  ios: `maps:?q=${encodeURIComponent(load.pickupAddress)}&ll=${load.pickupLat},${load.pickupLng}`,
                  android: `geo:${load.pickupLat},${load.pickupLng}?q=${load.pickupLat},${load.pickupLng}(${encodeURIComponent(load.pickupAddress)})`
                });
                Linking.openURL(url as string).catch(err => {
                  Alert.alert('Error', 'Unable to open maps application');
                  console.error('Error opening maps:', err);
                });
              }}
            >
              <Text style={styles.navigateButtonText}>📍 Navigate to Pickup</Text>
            </TouchableOpacity>
            
            <View style={styles.locationMeta}>
              <Text style={styles.locationDate}>
                📅 {new Date(load.pickupDate).toLocaleDateString()} at {new Date(load.pickupDate).toLocaleTimeString()}
              </Text>
              
              {/* Distance and ETA (if available) */}
              {trackingInfo?.eta?.pickup && (
                <Text style={styles.etaText}>
                  🕒 ETA: {trackingInfo.eta.pickup} min
                </Text>
              )}
            </View>


          </View>

          {/* Route connector with progress indicator */}
          <View style={styles.routeConnector}>
            <View style={styles.routeLine}>
              <View style={[styles.routeProgress, { 
                height: load.status === 'picked_up' || load.status === 'in_transit' || load.status === 'delivered' ? '100%' : '0%' 
              }]} />
            </View>
            <View style={styles.routeIcon}>
              <Text style={styles.routeIconText}>🚛</Text>
            </View>
          </View>

          {/* Enhanced Drop Location */}
          <View style={[styles.locationCard, styles.dropLocationCard]}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIconContainer}>
                <View style={[styles.locationIcon, styles.dropIcon]}>
                  <Text style={styles.locationIconText}>🎯</Text>
                </View>
                <View style={styles.locationTitleContainer}>
                  <Text style={styles.locationTitle}>Drop Location</Text>
                  {load.status === 'delivered' && (
                    <View style={[styles.statusChip, styles.deliveredChip]}>
                      <Text style={styles.statusChipText}>✅ Delivered</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Quick action button for drivers */}
              {user?.type === 'driver' && (load.status === 'picked_up' || load.status === 'in_transit') && (
                <TouchableOpacity
                  style={[styles.quickActionButton, styles.deliverButton]}
                  onPress={handleLoadDropped}
                >
                  <Text style={styles.quickActionText}>Mark Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.locationAddress}>{load.dropAddress}</Text>
            
            {/* Navigate Button - Available for all users */}
            <TouchableOpacity
              style={styles.navigateButton}
              onPress={() => {
                const url = Platform.select({
                  ios: `maps:?q=${encodeURIComponent(load.dropAddress)}&ll=${load.dropLat},${load.dropLng}`,
                  android: `geo:${load.dropLat},${load.dropLng}?q=${load.dropLat},${load.dropLng}(${encodeURIComponent(load.dropAddress)})`
                });
                Linking.openURL(url as string).catch(err => {
                  Alert.alert('Error', 'Unable to open maps application');
                  console.error('Error opening maps:', err);
                });
              }}
            >
              <Text style={styles.navigateButtonText}>📍 Navigate to Drop Location</Text>
            </TouchableOpacity>
            
            <View style={styles.locationMeta}>
              {/* Distance and ETA (if available) */}
              {trackingInfo?.eta?.drop && (
                <Text style={styles.etaText}>
                  🕒 ETA: {trackingInfo.eta.drop} min
                </Text>
              )}
            </View>


          </View>
        </View>
      </View>

      {/* Contact Details (Driver View) */}
      {contactDetails && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Details</Text>
          
          {contactDetails.pickup && (
            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>📍 Pickup Contact</Text>
              {contactDetails.pickup.name && (
                <Text style={styles.contactName}>{contactDetails.pickup.name}</Text>
              )}
              {contactDetails.pickup.phone && (
                <TouchableOpacity
                  style={styles.phoneButton}
                  onPress={() => makePhoneCall(contactDetails.pickup.phone)}
                >
                  <Text style={styles.phoneButtonText}>📞 {contactDetails.pickup.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {contactDetails.drop && (
            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>🎯 Drop Contact</Text>
              {contactDetails.drop.name && (
                <Text style={styles.contactName}>{contactDetails.drop.name}</Text>
              )}
              {contactDetails.drop.phone && (
                <TouchableOpacity
                  style={styles.phoneButton}
                  onPress={() => makePhoneCall(contactDetails.drop.phone)}
                >
                  <Text style={styles.phoneButtonText}>📞 {contactDetails.drop.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Vendor Information (Driver View) */}
      {vendor && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vendor Information</Text>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName}>{vendor.name}</Text>
            <Text style={styles.businessName}>{vendor.businessName}</Text>
            <Text style={styles.rating}>
              ⭐ {vendor.rating ? Number(vendor.rating).toFixed(1) : '5.0'} • {vendor.totalOrders || 0} orders
            </Text>
            <Text style={styles.gstNumber}>GST: {vendor.gstNumber || 'N/A'}</Text>
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={() => makePhoneCall(vendor.phone)}
            >
              <Text style={styles.phoneButtonText}>📞 {vendor.phone}</Text>
            </TouchableOpacity>

            {/* Rating Button for Driver to Rate Vendor */}
            {load.status === 'delivered' && user?.type === 'driver' && !hasRated && (
              <TouchableOpacity
                style={styles.ratingButton}
                onPress={() => setShowRatingModal(true)}
              >
                <Text style={styles.ratingButtonText}>⭐ Rate This Vendor</Text>
              </TouchableOpacity>
            )}
            {hasRated && (
              <View style={styles.ratedBadge}>
                <Text style={styles.ratedText}>✅ You rated this vendor</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Driver Information (Vendor View) */}
      {driver && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver Information</Text>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.vehicleInfo}>{driver.vehicleType} - {driver.vehicleNumber}</Text>
            <Text style={styles.rating}>
              ⭐ {driver.rating ? Number(driver.rating).toFixed(1) : '5.0'} • {driver.totalTrips || 0} trips
            </Text>
            <Text style={styles.licenseInfo}>License: {driver.licenseNumber || 'N/A'}</Text>
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={() => makePhoneCall(driver.phone)}
            >
              <Text style={styles.phoneButtonText}>📞 {driver.phone}</Text>
            </TouchableOpacity>
            
            {/* View Driver Location Button for Vendors */}
            {user?.type === 'vendor' && (
              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={() => setShowDriverLocationMap(true)}
              >
                <Text style={styles.viewMapButtonText}>🗺️ View Driver Location</Text>
              </TouchableOpacity>
            )}

            {/* Payment Button for Vendor (After Delivery) */}
            {load.status === 'delivered' && user?.type === 'vendor' && (
              <TouchableOpacity
                style={styles.paymentButton}
                onPress={() => setShowPaymentModal(true)}
              >
                <Text style={styles.paymentButtonText}>💳 Make Payment</Text>
              </TouchableOpacity>
            )}

            {/* Rating Button for Vendor to Rate Driver */}
            {load.status === 'delivered' && user?.type === 'vendor' && !hasRated && (
              <TouchableOpacity
                style={styles.ratingButton}
                onPress={() => setShowRatingModal(true)}
              >
                <Text style={styles.ratingButtonText}>⭐ Rate This Driver</Text>
              </TouchableOpacity>
            )}
            {hasRated && (
              <View style={styles.ratedBadge}>
                <Text style={styles.ratedText}>✅ You rated this driver</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tracking Information (Vendor View) */}
      {trackingInfo && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Tracking</Text>
          <View style={styles.trackingContainer}>
            <View style={styles.trackingStatus}>
              <Text style={styles.trackingLabel}>Pickup Status:</Text>
              <Text style={[styles.trackingValue, { color: trackingInfo.pickupStatus === 'Confirmed' ? '#10B981' : '#F59E0B' }]}>
                {trackingInfo.pickupStatus}
              </Text>
            </View>
            <View style={styles.trackingStatus}>
              <Text style={styles.trackingLabel}>Delivery Status:</Text>
              <Text style={[styles.trackingValue, { color: trackingInfo.deliveryStatus === 'Confirmed' ? '#10B981' : '#F59E0B' }]}>
                {trackingInfo.deliveryStatus}
              </Text>
            </View>
            
            {trackingInfo.canTrackLive && trackingInfo.lastKnownLocation && (
              <View style={styles.liveLocationCard}>
                <Text style={styles.liveLocationTitle}>📍 Live Location</Text>
                <Text style={styles.liveLocationTime}>
                  Last updated: {new Date(trackingInfo.lastKnownLocation.lastUpdate).toLocaleString()}
                </Text>
                
                <TouchableOpacity
                  style={styles.viewMapButton}
                  onPress={() => setShowDriverLocationMap(true)}
                >
                  <Text style={styles.viewMapButtonText}>🗺️ View Driver on Map</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Enhanced Live Tracking */}
      {user && loadDetails && (
        <LiveTrackingQuickActions
          userType={user.type}
          loadId={id as string}
          loadStatus={load.status}
          isTracking={isTracking}
          onDriverTrackingPress={handleDriverTrackingPress}
          onVendorDashboardPress={handleVendorDashboardPress}
        />
      )}

      {/* Test Map Button (for development) - Vendors can test the map */}
      {user?.type === 'vendor' && __DEV__ && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧪 Test Live Location Map</Text>
          <TouchableOpacity
            style={styles.viewMapButton}
            onPress={() => setShowDriverLocationMap(true)}
          >
            <Text style={styles.viewMapButtonText}>🗺️ Test Driver Location Map</Text>
          </TouchableOpacity>
          <Text style={styles.instructionsText}>
            This shows a test location in Bangalore. The real driver location will be integrated later.
          </Text>
        </View>
      )}

      {/* Driver Action Buttons */}
      {user?.type === 'driver' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver Actions</Text>
          
          {/* Pickup Button */}
          {(load.status === 'assigned' || load.status === 'accepted') && (
            <TouchableOpacity
              style={styles.pickupButton}
              onPress={handleLoadPickedUp}
            >
              <Text style={styles.pickupButtonText}>📦 Mark as Picked Up</Text>
              <Text style={styles.buttonSubtext}>Start location sharing with vendor</Text>
            </TouchableOpacity>
          )}
          
          {/* In Transit Status Display */}
          {load.status === 'picked_up' && (
            <View style={styles.statusDisplayCard}>
              <Text style={styles.statusDisplayTitle}>🚛 Load Picked Up</Text>
              <Text style={styles.statusDisplaySubtitle}>
                {isTracking ? '📍 Location sharing is active' : '⚠️ Location sharing is disabled'}
              </Text>
            </View>
          )}
          
          {/* Delivery Button */}
          {(load.status === 'picked_up' || load.status === 'in_transit') && (
            <TouchableOpacity
              style={styles.deliveryButton}
              onPress={handleLoadDropped}
            >
              <Text style={styles.deliveryButtonText}>✅ Mark as Delivered</Text>
              <Text style={styles.buttonSubtext}>Complete delivery and stop tracking</Text>
            </TouchableOpacity>
          )}
          
          {/* Completed Status */}
          {load.status === 'delivered' && (
            <View style={styles.completedStatus}>
              <Text style={styles.completedStatusText}>🎉 Load Delivered Successfully!</Text>
              <Text style={styles.completedStatusSubtext}>
                Location sharing has been stopped. Thank you for completing this delivery.
              </Text>
            </View>
          )}
          
          {/* No Actions Available */}
          {!['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(load.status) && (
            <View style={styles.noActionsContainer}>
              <Text style={styles.noActionsText}>
                No actions available for load status: {load.status}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Instructions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Instructions</Text>
        {instructions.map((instruction, index) => (
          <Text key={index} style={styles.instruction}>
            {instruction}
          </Text>
        ))}
      </View>

      <View style={styles.bottomPadding} />

      {/* Live Tracking Modals */}
      {user?.type === 'driver' && (
        <DriverTrackingPanel
          loadId={id as string}
          loadStatus={load?.status || ''}
          isVisible={showDriverTrackingPanel}
          onClose={() => setShowDriverTrackingPanel(false)}
          onTrackingStateChange={handleTrackingStateChange}
        />
      )}

      {user?.type === 'vendor' && (
        <>
          <VendorTrackingDashboard
            loadId={id as string}
            isVisible={showVendorDashboard}
            onClose={() => setShowVendorDashboard(false)}
          />
          
          <DriverLocationMap
            visible={showDriverLocationMap}
            loadId={id as string}
            onClose={() => setShowDriverLocationMap(false)}
          />
        </>
      )}

      {/* Rating Modal - New Comprehensive Version */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRating}
        driverName={loadDetails?.driver?.name}
      />

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={loadDetails?.load?.budget ? parseFloat(loadDetails.load.budget.toString()) : 0}
        loadId={id as string}
        onPaymentComplete={() => {
          Alert.alert('Success', 'Payment completed successfully!');
        }}
      />
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#4A90E2',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 60,
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadId: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  instructionsBox: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  routeContainer: {
    alignItems: 'center',
  },
  locationCard: {
    width: '100%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickupLocationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    backgroundColor: '#f0fdf4',
  },
  dropLocationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    backgroundColor: '#eff6ff',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickupIcon: {
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  dropIcon: {
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  locationIconText: {
    fontSize: 20,
  },
  locationTitleContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  statusChip: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  deliveredChip: {
    backgroundColor: '#4A90E2',
  },
  statusChipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  quickActionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  deliverButton: {
    backgroundColor: '#4A90E2',
  },
  quickActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  locationMeta: {
    marginBottom: 12,
  },
  locationDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  etaText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  navigationButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  routeConnector: {
    position: 'relative',
    height: 60,
    width: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  routeLine: {
    position: 'absolute',
    width: 4,
    height: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  routeProgress: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
  },
  routeIcon: {
    backgroundColor: 'white',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    zIndex: 1,
  },
  routeIconText: {
    fontSize: 16,
  },
  routeArrow: {
    paddingVertical: 8,
  },
  arrowText: {
    fontSize: 20,
    color: '#4A90E2',
  },
  mapButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  contactCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  phoneButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  phoneButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  vendorInfo: {
    alignItems: 'flex-start',
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    color: '#4A90E2',
    marginBottom: 6,
  },
  rating: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  gstNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  driverInfo: {
    alignItems: 'flex-start',
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 16,
    color: '#4A90E2',
    marginBottom: 6,
  },
  licenseInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  trackingContainer: {
    gap: 12,
  },
  trackingStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  trackingLabel: {
    fontSize: 14,
    color: '#374151',
  },
  trackingValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveLocationCard: {
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  liveLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 6,
  },
  liveLocationTime: {
    fontSize: 12,
    color: '#065f46',
    marginBottom: 12,
  },
  trackButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  trackButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  instruction: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 20,
  },
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyStateContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Driver action button styles
  pickupButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pickupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deliveryButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deliveryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  statusDisplayCard: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    marginBottom: 12,
  },
  statusDisplayTitle: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDisplaySubtitle: {
    color: '#065f46',
    fontSize: 14,
  },
  completedStatus: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    alignItems: 'center',
  },
  completedStatusText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  completedStatusSubtext: {
    color: '#065f46',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  noActionsContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  noActionsText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  viewMapButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewMapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingButton: {
    backgroundColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratedBadge: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  ratedText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starIcon: {
    fontSize: 40,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  navigateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
