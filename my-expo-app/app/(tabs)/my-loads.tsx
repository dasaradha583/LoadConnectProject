import AuthService from '@/services/auth';
import LoadService from '@/services/load';
import LocationService from '@/services/location';
import { Load } from '@/types/user';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import LiveTrackingService from '@/services/liveTracking';
import StatusNotificationBanner from '@/components/LiveTracking/StatusNotificationBanner';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const statusColors = {
  posted: '#4A90E2',
  assigned: '#f39c12',
  picked_up: '#FF7F00',
  in_transit: '#e67e22',
  delivered: '#28a745',
  cancelled: '#dc3545',
};

const statusLabels = {
  posted: 'Posted',
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function MyLoadsScreen() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingLoadId, setTrackingLoadId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [driverCounts, setDriverCounts] = useState<Map<string, { within100km: number; within150km: number }>>(new Map());

  // Fetch driver counts for vendor's loads
  const fetchDriverCountsForLoads = async (loadsList: Load[]) => {
    const locationService = LocationService.getInstance();
    const newCounts = new Map();

    // Only fetch for posted loads (not yet accepted)
    const postedLoads = loadsList.filter(load => load.status === 'posted');

    for (const load of postedLoads) {
      if (load.pickupLocation?.latitude && load.pickupLocation?.longitude) {
        const count = await locationService.getDriverCountFromServer({
          latitude: load.pickupLocation.latitude,
          longitude: load.pickupLocation.longitude,
        });
        
        if (count) {
          newCounts.set(load.id, count);
          console.log(`📊 Load ${load.id.slice(-6)}: ${count.within100km} drivers within 100km, ${count.within150km} within 150km`);
        }
      }
    }

    setDriverCounts(newCounts);
  };

  const loadMyLoads = useCallback(async () => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser();
      
      if (user) {
        console.log(`📱 Loading loads for ${user.type}: ${user.id}`);
        setCurrentUser(user);
        
        const loadService = LoadService.getInstance();
        let myLoads: Load[] = [];
        
        // Get loads based on user type
        if (user.type === 'driver') {
          console.log('🚛 Fetching driver loads...');
          myLoads = await loadService.getLoadsByDriver(user.id);
        } else if (user.type === 'vendor') {
          console.log('🏢 Fetching vendor loads...');
          myLoads = await loadService.getLoadsByVendor(user.id);
        }
        
        console.log(`📦 Found ${myLoads.length} loads`);
        
        // Sort by most recent first
        myLoads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLoads(myLoads);

        // Fetch driver counts for vendor's posted loads
        if (user.type === 'vendor') {
          await fetchDriverCountsForLoads(myLoads);
        }
      } else {
        console.log('❌ No user found');
        Alert.alert('Error', 'Please login again');
      }
    } catch (error: any) {
      console.error('❌ Error loading my loads:', error);
      
      // Show detailed error to user
      const errorMessage = error?.message || 'Unknown error occurred';
      Alert.alert(
        'Connection Error', 
        `Failed to load loads:\n\n${errorMessage}\n\nPlease check:\n• WiFi connection\n• Backend server is running\n• Same network as computer`,
        [
          { text: 'Retry', onPress: () => loadMyLoads() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyLoads();
    
    // Check for active tracking
    const trackingService = LiveTrackingService.getInstance();
    const currentLoadId = trackingService.currentLoad;
    if (currentLoadId && trackingService.isActivelyTracking) {
      setTrackingLoadId(currentLoadId);
    }

    // Phase 3: WebSocket listener for real-time driver availability updates
    let ws: WebSocket | null = null;
    
    if (currentUser?.type === 'vendor' && loads.some(load => load.status === 'posted')) {
      const wsUrl = 'ws://192.168.1.14:3001/ws'; // Use same IP as API
      
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('📡 WebSocket connected for driver count updates');
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Listen for driver availability changes
            if (message.type === 'driver_availability_change') {
              console.log('🔔 Driver availability changed, refreshing counts...');
              
              // Re-fetch driver counts for all posted loads
              if (loads.length > 0) {
                fetchDriverCountsForLoads(loads);
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.log('⚠️ WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('📡 WebSocket disconnected');
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    }

    // Cleanup
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [loadMyLoads, currentUser, loads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMyLoads();
    setRefreshing(false);
  };

  const handleCancelLoad = async (loadId: string) => {
    Alert.alert(
      'Cancel Load',
      'Are you sure you want to cancel this load? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const authService = AuthService.getInstance();
              const user = await authService.getCurrentUser();
              const loadService = LoadService.getInstance();
              const success = await loadService.updateLoadStatus(loadId, 'cancelled', user?.id || '');
              
              if (success) {
                Alert.alert('Success', 'Load cancelled successfully');
                await loadMyLoads(); // Refresh the list
              } else {
                Alert.alert('Error', 'Failed to cancel load');
              }
            } catch (error) {
              console.error('Error cancelling load:', error);
              Alert.alert('Error', 'Something went wrong');
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: Load['status']) => {
    switch (status) {
      case 'posted': return '📋';
      case 'assigned': return '👤';
      case 'in_transit': return '🚛';
      case 'delivered': return '✅';
      case 'cancelled': return '❌';
      default: return '📦';
    }
  };

  const renderLoadItem = ({ item }: { item: Load }) => (
    <View style={styles.loadCard}>
      <View style={styles.loadHeader}>
        <View style={styles.loadIdContainer}>
          <Text style={styles.loadId}>#{item.id.slice(-6).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
            <Text style={styles.statusText}>
              {getStatusIcon(item.status)} {statusLabels[item.status]}
            </Text>
          </View>
          {trackingLoadId === item.id && (
            <View style={styles.liveTrackingBadge}>
              <Text style={styles.liveTrackingText}>🔴 LIVE</Text>
            </View>
          )}
          {/* Enhanced status indicators for location sharing */}
          {(item.status === 'picked_up' || item.status === 'in_transit') && (
            <View style={styles.locationSharingBadge}>
              <Text style={styles.locationSharingText}>📍 Location Shared</Text>
            </View>
          )}
        </View>
        <Text style={styles.loadBudget}>₹{item.budget.toLocaleString()}</Text>
      </View>
      
      <Text style={styles.loadDescription}>{item.description}</Text>
      <Text style={styles.loadWeight}>
        Weight: {item.weight >= 1000 
          ? `${(item.weight / 1000).toFixed(1)} tons`
          : `${item.weight} kg`
        }
      </Text>
      
      {/* Driver Count Display for Posted Loads (Vendor Only) */}
      {currentUser?.type === 'vendor' && item.status === 'posted' && driverCounts.has(item.id) && (
        <View style={styles.driverCountContainer}>
          <Text style={styles.driverCountTitle}>🚛 Available Drivers</Text>
          <View style={styles.driverCountRow}>
            <View style={styles.driverCountBadge}>
              <Text style={styles.driverCountLabel}>Within 100km</Text>
              <Text style={styles.driverCountNumber}>{driverCounts.get(item.id)?.within100km || 0}</Text>
            </View>
            <View style={styles.driverCountBadge}>
              <Text style={styles.driverCountLabel}>Within 150km</Text>
              <Text style={styles.driverCountNumber}>{driverCounts.get(item.id)?.within150km || 0}</Text>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.locationContainer}>
        {/* Enhanced Pickup Location Display */}
        <View style={styles.enhancedLocationRow}>
          <View style={styles.locationIconContainer}>
            <View style={[styles.locationIcon, styles.pickupIcon]}>
              <Text style={styles.locationIconText}>📍</Text>
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationText}>{item.pickupLocation.address}</Text>
              <Text style={styles.locationDate}>
                📅 {new Date(item.pickupDate).toLocaleDateString()} at {new Date(item.pickupDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          {/* Status indicator for pickup */}
          {(item.status === 'picked_up' || item.status === 'in_transit' || item.status === 'delivered') && (
            <View style={styles.locationStatusBadge}>
              <Text style={styles.locationStatusText}>✅</Text>
            </View>
          )}
        </View>

        {/* Route Connector */}
        <View style={styles.routeConnectorSmall}>
          <View style={styles.routeLineSmall}>
            <View style={[styles.routeProgressSmall, { 
              height: (item.status === 'picked_up' || item.status === 'in_transit' || item.status === 'delivered') ? '100%' : '0%' 
            }]} />
          </View>
          <View style={styles.routeIconSmall}>
            <Text style={styles.routeIconTextSmall}>🚛</Text>
          </View>
        </View>

        {/* Enhanced Drop Location Display */}
        <View style={styles.enhancedLocationRow}>
          <View style={styles.locationIconContainer}>
            <View style={[styles.locationIcon, styles.dropIcon]}>
              <Text style={styles.locationIconText}>🎯</Text>
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Drop</Text>
              <Text style={styles.locationText}>{item.dropLocation.address}</Text>
            </View>
          </View>
          {/* Status indicator for delivery */}
          {item.status === 'delivered' && (
            <View style={styles.locationStatusBadge}>
              <Text style={styles.locationStatusText}>✅</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.detailsRow}>
        <Text style={styles.detailItem}>📏 {item.estimatedDistance.toFixed(1)} km</Text>
        <Text style={styles.detailItem}>📅 {new Date(item.pickupDate).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => {
            console.log(`🔍 Navigation Debug: item.id = "${item.id}", item:`, item);
            if (!item.id) {
              Alert.alert('Error', 'Load ID is missing. Cannot view details.');
              return;
            }
            router.push(`/(tabs)/load-details?id=${item.id}`);
          }}
        >
          <Text style={styles.viewDetailsButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {item.status === 'posted' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelLoad(item.id)}
          >
            <Text style={styles.cancelButtonText}>Cancel Load</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'delivered' && (
          <TouchableOpacity style={styles.reviewButton}>
            <Text style={styles.reviewButtonText}>Rate Driver</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.createdDate}>
        Posted: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your loads...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Notification Banner for Vendors */}
      {currentUser?.type === 'vendor' && (
        <StatusNotificationBanner
          vendorId={currentUser.id}
          onNotificationPress={(notification) => {
            if (notification.loadId) {
              router.push(`/(tabs)/load-details?id=${notification.loadId}`);
            }
          }}
        />
      )}
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Loads</Text>
        <Text style={styles.headerSubtitle}>{loads.length} total loads</Text>
      </View>
      
      <FlatList
        data={loads}
        keyExtractor={(item) => item.id}
        renderItem={renderLoadItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Loads Posted</Text>
            <Text style={styles.emptyText}>
              You haven&apos;t posted any loads yet. Tap the &quot;Post Load&quot; tab to create your first load.
            </Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: '#6f42c1',
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
  listContainer: {
    padding: 20,
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
  loadIdContainer: {
    flex: 1,
  },
  loadId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadBudget: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  loadDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  loadWeight: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
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
  debugButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  liveTrackingBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  liveTrackingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  locationSharingBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  locationSharingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  // Enhanced location display styles
  enhancedLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  locationIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
  },
  pickupIcon: {
    backgroundColor: '#dcfce7',
    borderColor: '#10B981',
  },
  dropIcon: {
    backgroundColor: '#dbeafe',
    borderColor: '#4A90E2',
  },
  locationIconText: {
    fontSize: 16,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  locationDate: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  locationStatusBadge: {
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  routeConnectorSmall: {
    alignItems: 'center',
    height: 30,
    width: 4,
    marginVertical: 4,
    marginLeft: 16,
    position: 'relative',
  },
  routeLineSmall: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 1,
    left: 1,
  },
  routeProgressSmall: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 1,
    position: 'absolute',
    top: 0,
  },
  routeIconSmall: {
    backgroundColor: 'white',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 1,
  },
  routeIconTextSmall: {
    fontSize: 12,
  },
  // Driver count styles
  driverCountContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  driverCountTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  driverCountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  driverCountBadge: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  driverCountLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  driverCountNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
});

