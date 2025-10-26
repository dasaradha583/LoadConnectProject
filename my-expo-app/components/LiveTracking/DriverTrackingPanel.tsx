// Driver Live Tracking Panel Component
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import LiveTrackingService, { TrackingData } from '@/services/liveTracking';
import { Ionicons } from '@expo/vector-icons';

interface DriverTrackingPanelProps {
  loadId: string;
  loadStatus: string;
  isVisible: boolean;
  onClose: () => void;
  onTrackingStateChange?: (isTracking: boolean) => void;
}

export default function DriverTrackingPanel({
  loadId,
  loadStatus,
  isVisible,
  onClose,
  onTrackingStateChange
}: DriverTrackingPanelProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const trackingService = LiveTrackingService.getInstance();

  useEffect(() => {
    // Check if already tracking this load
    const currentLoadId = trackingService.currentLoad;
    const isActivelyTracking = trackingService.isActivelyTracking;
    
    if (currentLoadId === loadId && isActivelyTracking) {
      setIsTracking(true);
      setLastUpdate(trackingService.lastUpdate);
    }

    // Subscribe to tracking updates
    const unsubscribe = trackingService.onTrackingUpdate((data: TrackingData) => {
      if (data.loadId === loadId) {
        setTrackingData(data);
        setLastUpdate(new Date());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadId, trackingService]);

  const handleStartTracking = useCallback(async () => {
    setLoading(true);
    try {
      console.log(`🚀 Starting tracking for load ${loadId}`);
      
      const success = await trackingService.startDriverTracking(loadId);
      
      if (success) {
        setIsTracking(true);
        setLastUpdate(new Date());
        onTrackingStateChange?.(true);
        Alert.alert(
          'Live Tracking Started',
          'Your location is now being shared with the vendor. Keep the app running for continuous tracking.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Tracking Failed',
          'Unable to start live tracking. Please check location permissions and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Error starting tracking:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to start tracking. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [loadId, onTrackingStateChange, trackingService]);

  const handleStopTracking = useCallback(async () => {
    Alert.alert(
      'Stop Live Tracking',
      'Are you sure you want to stop sharing your location? The vendor will no longer see your real-time location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Tracking',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await trackingService.stopDriverTracking();
              setIsTracking(false);
              setTrackingData(null);
              setLastUpdate(null);
              onTrackingStateChange?.(false);
            } catch (error) {
              console.error('❌ Error stopping tracking:', error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [onTrackingStateChange, trackingService]);

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
      return lastUpdate.toLocaleTimeString();
    }
  };

  const canStartTracking = ['assigned', 'picked_up', 'in_transit'].includes(loadStatus);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Tracking</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Tracking Status */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: isTracking ? '#10B981' : '#EF4444' }
              ]} />
              <Text style={styles.statusTitle}>
                {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
              </Text>
            </View>
            
            {isTracking && (
              <View style={styles.statusDetails}>
                <Text style={styles.statusText}>
                  📍 Location shared with vendor
                </Text>
                <Text style={styles.statusText}>
                  🕐 Last update: {formatLastUpdate()}
                </Text>
                {trackingData?.eta && (
                  <Text style={styles.statusText}>
                    🚛 ETA: {trackingData.eta.etaText}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ETA Information */}
          {trackingData?.eta && (
            <View style={styles.etaCard}>
              <Text style={styles.cardTitle}>Estimated Time of Arrival</Text>
              <View style={styles.etaDetails}>
                <View style={styles.etaItem}>
                  <Text style={styles.etaLabel}>Distance</Text>
                  <Text style={styles.etaValue}>
                    {trackingData.eta.distance.toFixed(1)} km
                  </Text>
                </View>
                <View style={styles.etaItem}>
                  <Text style={styles.etaLabel}>ETA</Text>
                  <Text style={styles.etaValue}>
                    {trackingData.eta.etaText}
                  </Text>
                </View>
                <View style={styles.etaItem}>
                  <Text style={styles.etaLabel}>Speed</Text>
                  <Text style={styles.etaValue}>
                    {trackingData.eta.estimatedSpeed.toFixed(0)} km/h
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Geofence Alerts */}
          {trackingData?.geofenceAlerts && trackingData.geofenceAlerts.length > 0 && (
            <View style={styles.alertsCard}>
              <Text style={styles.cardTitle}>Location Alerts</Text>
              {trackingData.geofenceAlerts.map((alert, index) => (
                <View key={index} style={styles.alertItem}>
                  <Ionicons 
                    name={alert.type === 'entered' ? 'checkmark-circle' : 'location'} 
                    size={20} 
                    color={alert.type === 'entered' ? '#10B981' : '#F59E0B'} 
                  />
                  <View style={styles.alertText}>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <Text style={styles.alertLocation}>
                      {alert.location} • {alert.distance.toFixed(0)}m away
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.cardTitle}>Live Tracking Instructions</Text>
            <Text style={styles.instruction}>
              • Keep the app running in the background for continuous tracking
            </Text>
            <Text style={styles.instruction}>
              • Your location is updated every 10 seconds or 10 meters
            </Text>
            <Text style={styles.instruction}>
              • Vendor receives real-time updates and ETA calculations
            </Text>
            <Text style={styles.instruction}>
              • You&apos;ll get alerts when approaching pickup/drop locations
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {!canStartTracking && (
            <View style={styles.warningCard}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                Live tracking is only available for assigned, picked up, or in-transit loads
              </Text>
            </View>
          )}
          
          {canStartTracking && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                isTracking ? styles.stopButton : styles.startButton,
                loading && styles.disabledButton
              ]}
              onPress={isTracking ? handleStopTracking : handleStartTracking}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons 
                    name={isTracking ? 'stop' : 'play'} 
                    size={20} 
                    color="white" 
                  />
                  <Text style={styles.actionButtonText}>
                    {isTracking ? 'Stop Tracking' : 'Start Live Tracking'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
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
  statusDetails: {
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  etaCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  etaDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  etaItem: {
    alignItems: 'center',
    flex: 1,
  },
  etaLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  etaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  alertsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertText: {
    marginLeft: 12,
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  alertLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  instructionsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instruction: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  actions: {
    padding: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
