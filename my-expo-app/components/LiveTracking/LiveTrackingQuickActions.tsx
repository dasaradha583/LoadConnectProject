// Live Tracking Quick Actions Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LiveTrackingQuickActionsProps {
  userType: 'driver' | 'vendor';
  loadId: string;
  loadStatus: string;
  isTracking?: boolean;
  onDriverTrackingPress: () => void;
  onVendorDashboardPress: () => void;
}

export default function LiveTrackingQuickActions({
  userType,
  loadId,
  loadStatus,
  isTracking = false,
  onDriverTrackingPress,
  onVendorDashboardPress
}: LiveTrackingQuickActionsProps) {
  
  const canTrack = ['assigned', 'picked_up', 'in_transit'].includes(loadStatus);
  
  if (userType === 'driver') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            isTracking ? styles.trackingActiveButton : styles.trackingInactiveButton,
            !canTrack && styles.disabledButton
          ]}
          onPress={onDriverTrackingPress}
          disabled={!canTrack}
        >
          <View style={styles.buttonContent}>
            <View style={styles.buttonLeft}>
              <Ionicons 
                name={isTracking ? 'radio-button-on' : 'radio-button-off'} 
                size={20} 
                color={!canTrack ? '#9CA3AF' : (isTracking ? '#10B981' : '#6B7280')} 
              />
              <View style={styles.buttonText}>
                <Text style={[
                  styles.buttonTitle,
                  !canTrack && styles.disabledText,
                  isTracking && styles.activeText
                ]}>
                  Live Tracking
                </Text>
                <Text style={[
                  styles.buttonSubtitle,
                  !canTrack && styles.disabledText
                ]}>
                  {!canTrack 
                    ? 'Available for assigned loads'
                    : (isTracking ? 'Sharing location with vendor' : 'Tap to start sharing location')
                  }
                </Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={!canTrack ? '#9CA3AF' : '#6B7280'} 
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Vendor view
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.actionButton, styles.vendorButton]}
        onPress={onVendorDashboardPress}
      >
        <View style={styles.buttonContent}>
          <View style={styles.buttonLeft}>
            <Ionicons name="location" size={20} color="#4A90E2" />
            <View style={styles.buttonText}>
              <Text style={[styles.buttonTitle, styles.vendorButtonText]}>
                Live Tracking Dashboard
              </Text>
              <Text style={styles.buttonSubtitle}>
                View real-time driver location
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trackingActiveButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    backgroundColor: '#f0fdf4',
  },
  trackingInactiveButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  vendorButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  disabledButton: {
    backgroundColor: '#f9fafb',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    marginLeft: 12,
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  activeText: {
    color: '#059669',
  },
  vendorButtonText: {
    color: '#4A90E2',
  },
  disabledText: {
    color: '#9CA3AF',
  },
});
