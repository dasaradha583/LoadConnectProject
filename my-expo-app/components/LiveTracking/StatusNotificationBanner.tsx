// Real-time Status Notification Component for Vendors
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';

interface StatusNotification {
  id: string;
  type: 'load_status_update' | 'driver_location' | 'delivery_alert';
  title: string;
  message: string;
  timestamp: string;
  loadId?: string;
  priority: 'low' | 'medium' | 'high';
}

interface StatusNotificationBannerProps {
  vendorId: string;
  onNotificationPress?: (notification: StatusNotification) => void;
}

export default function StatusNotificationBanner({
  vendorId,
  onNotificationPress
}: StatusNotificationBannerProps) {
  const [notification, setNotification] = useState<StatusNotification | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Simulate real-time notifications (in production, this would be WebSocket or SSE)
    const checkForNotifications = async () => {
      try {
        const response = await api.get(`/notifications/vendor/${vendorId}/latest`);
        
        if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Backend returns an array of notifications, take the first one
          const newNotification = response.data[0] as StatusNotification;
          
          // Only show if it's a new notification
          if (!notification || notification.id !== newNotification.id) {
            showNotification(newNotification);
          }
        }
      } catch (error) {
        console.log('No new notifications');
      }
    };

    const interval = setInterval(checkForNotifications, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [vendorId, notification]);

  const showNotification = (newNotification: StatusNotification) => {
    setNotification(newNotification);
    
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 8 seconds
    setTimeout(() => {
      hideNotification();
    }, 8000);
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  };

  const handleNotificationPress = () => {
    if (notification) {
      onNotificationPress?.(notification);
      hideNotification();
    }
  };

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#4A90E2';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'load_status_update': return 'checkmark-circle';
      case 'driver_location': return 'location';
      case 'delivery_alert': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  if (!notification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderLeftColor: getNotificationColor(notification.priority)
        }
      ]}
    >
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={handleNotificationPress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={getNotificationIcon(notification.type)}
            size={24}
            color={getNotificationColor(notification.priority)}
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(notification.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={hideNotification}
        >
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  closeButton: {
    padding: 4,
    marginTop: 2,
  },
});

// Mock notification service for demo
export const createMockNotification = (type: string, loadId: string): StatusNotification => {
  const notifications = {
    picked_up: {
      title: 'Load Picked Up',
      message: 'Driver has picked up your load and started live tracking',
      priority: 'medium' as const
    },
    in_transit: {
      title: 'Load In Transit',
      message: 'Your load is now in transit with live location sharing',
      priority: 'low' as const
    },
    delivered: {
      title: 'Load Delivered',
      message: 'Your load has been delivered successfully',
      priority: 'high' as const
    }
  };

  const notification = notifications[type as keyof typeof notifications] || {
    title: 'Status Update',
    message: 'Load status has been updated',
    priority: 'low' as const
  };

  return {
    id: `${Date.now()}-${type}`,
    type: 'load_status_update',
    title: notification.title,
    message: notification.message,
    timestamp: new Date().toISOString(),
    loadId,
    priority: notification.priority
  };
};
