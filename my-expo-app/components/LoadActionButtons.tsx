import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => Promise<void>;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  disabled?: boolean;
  loading?: boolean;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  sublabel,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = async () => {
    if (disabled || loading) return;
    
    setIsPressed(true);
    try {
      await onPress();
    } finally {
      setIsPressed(false);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = {
      ...styles.button,
    };
    
    if (disabled) {
      return { ...baseStyle, ...styles.buttonDisabled };
    }
    
    let variantStyle = {};
    switch (variant) {
      case 'primary':
        variantStyle = styles.buttonPrimary;
        break;
      case 'secondary':
        variantStyle = styles.buttonSecondary;
        break;
      case 'success':
        variantStyle = styles.buttonSuccess;
        break;
      case 'warning':
        variantStyle = styles.buttonWarning;
        break;
    }
    
    const combinedStyle = { ...baseStyle, ...variantStyle };
    
    if (isPressed) {
      return { ...combinedStyle, ...styles.buttonPressed };
    }
    
    return combinedStyle;
  };

  const getTextStyle = () => {
    const baseStyle = { ...styles.buttonText };
    
    if (disabled) {
      return { ...baseStyle, ...styles.buttonTextDisabled };
    } else {
      return { ...baseStyle, ...styles.buttonTextActive };
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonIcon}>{icon}</Text>
        )}
        
        <View style={styles.buttonTextContainer}>
          <Text style={getTextStyle()}>{label}</Text>
          {sublabel && (
            <Text style={[styles.buttonSublabel, disabled && styles.buttonSublabelDisabled]}>
              {sublabel}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface LoadActionButtonsProps {
  loadStatus: string;
  userType: 'driver' | 'vendor';
  onPickupPress: () => Promise<void>;
  onDeliveryPress: () => Promise<void>;
  isTracking?: boolean;
}

const LoadActionButtons: React.FC<LoadActionButtonsProps> = ({
  loadStatus,
  userType,
  onPickupPress,
  onDeliveryPress,
  isTracking = false,
}) => {
  if (userType !== 'driver') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      
      <View style={styles.buttonsContainer}>
        {/* Pickup Action */}
        {loadStatus === 'assigned' && (
          <QuickActionButton
            icon="📦"
            label="Mark as Picked Up"
            sublabel="Start location sharing"
            onPress={onPickupPress}
            variant="success"
          />
        )}
        
        {/* In Transit Status */}
        {loadStatus === 'picked_up' && (
          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusIcon}>🚛</Text>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>Load Picked Up</Text>
                <Text style={styles.statusSubtitle}>
                  {isTracking ? '📍 Location sharing active' : '⚠️ Location sharing disabled'}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Delivery Action */}
        {(loadStatus === 'picked_up' || loadStatus === 'in_transit') && (
          <QuickActionButton
            icon="✅"
            label="Mark as Delivered"
            sublabel="Complete delivery"
            onPress={onDeliveryPress}
            variant="primary"
          />
        )}
        
        {/* Completed Status */}
        {loadStatus === 'delivered' && (
          <View style={styles.completedContainer}>
            <View style={styles.completedBadge}>
              <Text style={styles.completedIcon}>🎉</Text>
              <View style={styles.completedTextContainer}>
                <Text style={styles.completedTitle}>Delivery Completed!</Text>
                <Text style={styles.completedSubtitle}>
                  Thank you for completing this delivery successfully.
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* No Actions Available */}
        {!['assigned', 'picked_up', 'in_transit', 'delivered'].includes(loadStatus) && (
          <View style={styles.noActionsContainer}>
            <Text style={styles.noActionsIcon}>ℹ️</Text>
            <Text style={styles.noActionsText}>
              No actions available for this load status
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonPrimary: {
    backgroundColor: '#4A90E2',
  },
  buttonSecondary: {
    backgroundColor: '#6b7280',
  },
  buttonSuccess: {
    backgroundColor: '#10B981',
  },
  buttonWarning: {
    backgroundColor: '#f59e0b',
  },
  buttonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextActive: {
    color: 'white',
  },
  buttonTextDisabled: {
    color: '#9ca3af',
  },
  buttonSublabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  buttonSublabelDisabled: {
    color: '#d1d5db',
  },
  statusContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  completedContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  completedTextContainer: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  completedSubtitle: {
    fontSize: 12,
    color: '#1e40af',
    marginTop: 2,
    lineHeight: 16,
  },
  noActionsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noActionsIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  noActionsText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

export default LoadActionButtons;
