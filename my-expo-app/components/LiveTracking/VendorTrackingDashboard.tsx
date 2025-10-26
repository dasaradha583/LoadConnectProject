// Vendor Live Tracking Dashboard Component
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Modal,
  Platform,
} from 'react-native';
import LiveTrackingService, { LiveTrackingResponse, LocationData } from '@/services/liveTracking';
import { Ionicons } from '@expo/vector-icons';
import DriverLocationMap from './DriverLocationMap';

interface VendorTrackingDashboardProps {
  loadId: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function VendorTrackingDashboard({
  loadId,
  isVisible,
  onClose
}: VendorTrackingDashboardProps) {
  const [trackingData, setTrackingData] = useState<LiveTrackingResponse | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDriverMap, setShowDriverMap] = useState(false);

  const trackingService = LiveTrackingService.getInstance();

  const fetchTrackingData = useCallback(async () => {
    try {
      console.log(`🔍 Fetching live tracking data for load ${loadId}`);
      
      const data = await trackingService.getLiveTrackingData(loadId);
      
      if (data) {
        console.log('✅ Live tracking data received:', data);
        setTrackingData(data);
        
        // Also fetch location history
        const history = await trackingService.getLocationHistory(loadId, { limit: 50 });
        setLocationHistory(history);
      } else {
        console.log('❌ No tracking data available');
      }
    } catch (error) {
      console.error('❌ Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadId, trackingService]);

  useEffect(() => {
    if (isVisible) {
      fetchTrackingData();
      
      // Set up auto-refresh if tracking is live
      let interval: ReturnType<typeof setInterval> | null = null;
      
      if (autoRefresh) {
        interval = setInterval(() => {
          fetchTrackingData();
        }, 15000); // Refresh every 15 seconds
      }
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [isVisible, autoRefresh, fetchTrackingData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrackingData();
    setRefreshing(false);
  };

  const handleCallDriver = () => {
    if (trackingData?.driver?.phone) {
      const phoneUrl = `tel:${trackingData.driver.phone}`;
      Linking.openURL(phoneUrl).catch(() => {
        Alert.alert('Error', 'Unable to make phone call');
      });
    }
  };

  const handleOpenMaps = () => {
    if (trackingData?.tracking?.currentLocation) {
      const { lat, lng } = trackingData.tracking.currentLocation;
      const url = Platform.OS === 'ios' 
        ? `maps:0,0?q=${lat},${lng}`
        : `geo:0,0?q=${lat},${lng}`;
      
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open maps');
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#F59E0B';
      case 'picked_up': return '#FF7F00';
      case 'in_transit': return '#4A90E2';
      case 'delivered': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'Assigned';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.loadingContainer}>
          <Text>Loading tracking data...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Tracking Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setAutoRefresh(!autoRefresh)}
              style={[styles.refreshToggle, autoRefresh && styles.refreshToggleActive]}
            >
              <Ionicons 
                name={autoRefresh ? 'refresh' : 'refresh-outline'} 
                size={20} 
                color={autoRefresh ? 'white' : '#6B7280'} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {trackingData ? (
            <>
              {/* Load Status */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(trackingData.load.status) }
                  ]} />
                  <Text style={styles.statusTitle}>
                    {getStatusLabel(trackingData.load.status)}
                  </Text>
                </View>
                
                <View style={styles.progressIndicators}>
                  <View style={[
                    styles.progressStep,
                    trackingData.load.isPickedUp && styles.progressStepComplete
                  ]}>
                    <Ionicons 
                      name={trackingData.load.isPickedUp ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={20} 
                      color={trackingData.load.isPickedUp ? '#10B981' : '#D1D5DB'} 
                    />
                    <Text style={styles.progressLabel}>Picked Up</Text>
                  </View>
                  
                  <View style={styles.progressLine} />
                  
                  <View style={[
                    styles.progressStep,
                    trackingData.load.isDropped && styles.progressStepComplete
                  ]}>
                    <Ionicons 
                      name={trackingData.load.isDropped ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={20} 
                      color={trackingData.load.isDropped ? '#10B981' : '#D1D5DB'} 
                    />
                    <Text style={styles.progressLabel}>Delivered</Text>
                  </View>
                </View>
              </View>

              {/* Driver Information */}
              {trackingData.driver && (
                <View style={styles.driverCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Driver Information</Text>
                    <TouchableOpacity onPress={handleCallDriver} style={styles.callButton}>
                      <Ionicons name="call" size={16} color="white" />
                      <Text style={styles.callButtonText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{trackingData.driver.name}</Text>
                    <Text style={styles.driverDetails}>
                      {trackingData.driver.vehicleType} • {trackingData.driver.vehicleNumber}
                    </Text>
                    <Text style={styles.driverPhone}>{trackingData.driver.phone}</Text>
                  </View>
                </View>
              )}

              {/* Live Location */}
              {trackingData.tracking.isLive && trackingData.tracking.currentLocation ? (
                <View style={styles.locationCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowDriverMap(true)} style={styles.mapButton}>
                      <Ionicons name="map" size={16} color="#4A90E2" />
                      <Text style={styles.mapButtonText}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.locationDetails}>
                    <View style={styles.coordinatesRow}>
                      <Ionicons name="location" size={16} color="#6B7280" />
                      <Text style={styles.coordinates}>
                        {trackingData.tracking.currentLocation.lat.toFixed(6)}, {trackingData.tracking.currentLocation.lng.toFixed(6)}
                      </Text>
                    </View>
                    
                    {trackingData.tracking.currentLocation.speed !== undefined && (
                      <View style={styles.speedRow}>
                        <Ionicons name="speedometer" size={16} color="#6B7280" />
                        <Text style={styles.speedText}>
                          {Math.round((trackingData.tracking.currentLocation.speed || 0) * 3.6)} km/h
                        </Text>
                      </View>
                    )}
                    
                    <Text style={styles.lastUpdateText}>
                      Last update: {formatTimestamp(trackingData.tracking.currentLocation.timestamp)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noLocationCard}>
                  <Ionicons name="location-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.noLocationTitle}>No Live Location</Text>
                  <Text style={styles.noLocationText}>
                    Driver hasn&apos;t started live tracking yet
                  </Text>
                </View>
              )}

              {/* ETA Information */}
              {trackingData.tracking.eta && (
                <View style={styles.etaCard}>
                  <Text style={styles.cardTitle}>Estimated Arrival</Text>
                  <View style={styles.etaRow}>
                    <View style={styles.etaItem}>
                      <Text style={styles.etaLabel}>Distance</Text>
                      <Text style={styles.etaValue}>
                        {trackingData.tracking.eta.distance?.toFixed(1)} km
                      </Text>
                    </View>
                    <View style={styles.etaItem}>
                      <Text style={styles.etaLabel}>ETA</Text>
                      <Text style={styles.etaValue}>
                        {trackingData.tracking.eta.etaText}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Route Information */}
              <View style={styles.routeCard}>
                <Text style={styles.cardTitle}>Route Information</Text>
                
                <View style={styles.routePoint}>
                  <View style={styles.routeIcon}>
                    <Ionicons name="radio-button-on" size={16} color="#10B981" />
                  </View>
                  <View style={styles.routeDetails}>
                    <Text style={styles.routeLabel}>Pickup</Text>
                    <Text style={styles.routeAddress}>{trackingData.load.pickup.address}</Text>
                    {trackingData.load.pickup.contactName && (
                      <Text style={styles.routeContact}>
                        {trackingData.load.pickup.contactName} • {trackingData.load.pickup.contactPhone}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.routeLine} />
                
                <View style={styles.routePoint}>
                  <View style={styles.routeIcon}>
                    <Ionicons name="location" size={16} color="#EF4444" />
                  </View>
                  <View style={styles.routeDetails}>
                    <Text style={styles.routeLabel}>Drop</Text>
                    <Text style={styles.routeAddress}>{trackingData.load.drop.address}</Text>
                    {trackingData.load.drop.contactName && (
                      <Text style={styles.routeContact}>
                        {trackingData.load.drop.contactName} • {trackingData.load.drop.contactPhone}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Location History */}
              {locationHistory.length > 0 && (
                <View style={styles.historyCard}>
                  <Text style={styles.cardTitle}>Recent Location Updates</Text>
                  {locationHistory.slice(0, 5).map((location, index) => (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyTime}>
                        <Text style={styles.historyTimeText}>
                          {formatTimestamp(location.timestamp)}
                        </Text>
                      </View>
                      <View style={styles.historyLocation}>
                        <Text style={styles.historyCoords}>
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </Text>
                        {location.speed !== undefined && (
                          <Text style={styles.historySpeed}>
                            {Math.round(location.speed * 3.6)} km/h
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noDataCard}>
              <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
              <Text style={styles.noDataTitle}>No Tracking Data</Text>                <Text style={styles.noDataText}>
                Unable to load tracking information for this load
              </Text>
              <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Driver Location Map Modal */}
      <DriverLocationMap
        visible={showDriverMap}
        loadId={loadId}
        onClose={() => setShowDriverMap(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  refreshToggleActive: {
    backgroundColor: '#4A90E2',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressStepComplete: {
    // Add any specific styling for completed steps
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  progressLine: {
    height: 2,
    flex: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  driverCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  callButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  driverInfo: {
    gap: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  driverDetails: {
    fontSize: 14,
    color: '#4A90E2',
  },
  driverPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  locationCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapButtonText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
  },
  locationDetails: {
    gap: 8,
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coordinates: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  noLocationCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  noLocationText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  etaCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  etaItem: {
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  etaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  routeCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  routeDetails: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  routeAddress: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  routeContact: {
    fontSize: 12,
    color: '#6B7280',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 7,
    marginVertical: 8,
  },
  historyCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyTime: {
    width: 80,
  },
  historyTimeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyLocation: {
    flex: 1,
  },
  historyCoords: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
  },
  historySpeed: {
    fontSize: 10,
    color: '#6B7280',
  },
  noDataCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
