import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface StatusProgressStep {
  id: string;
  label: string;
  icon: string;
  completed: boolean;
  active: boolean;
}

interface StatusUpdateProgressProps {
  steps: StatusProgressStep[];
  currentStatus: string;
}

const StatusUpdateProgress: React.FC<StatusUpdateProgressProps> = ({ steps, currentStatus }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delivery Progress</Text>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepContainer}>
            {/* Step Circle */}
            <View style={[
              styles.stepCircle,
              step.completed && styles.stepCompleted,
              step.active && styles.stepActive,
            ]}>
              <Text style={[
                styles.stepIcon,
                (step.completed || step.active) && styles.stepIconActive,
              ]}>
                {step.icon}
              </Text>
            </View>
            
            {/* Step Content */}
            <View style={styles.stepContent}>
              <Text style={[
                styles.stepLabel,
                (step.completed || step.active) && styles.stepLabelActive,
              ]}>
                {step.label}
              </Text>
              
              {/* Status badges */}
              {step.completed && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✓ Completed</Text>
                </View>
              )}
              
              {step.active && !step.completed && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>⏳ In Progress</Text>
                </View>
              )}
            </View>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <View style={[
                styles.connector,
                step.completed && styles.connectorCompleted,
              ]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export const getDeliverySteps = (currentStatus: string): StatusProgressStep[] => {
  const allSteps = [
    { id: 'posted', label: 'Load Posted', icon: '📋' },
    { id: 'assigned', label: 'Driver Assigned', icon: '👤' },
    { id: 'picked_up', label: 'Load Picked Up', icon: '📦' },
    { id: 'in_transit', label: 'In Transit', icon: '🚛' },
    { id: 'delivered', label: 'Delivered', icon: '✅' },
  ];

  // Map status variations to standard status order
  const statusMapping: { [key: string]: string } = {
    'posted': 'posted',
    'accepted': 'assigned',  // Map accepted to assigned - driver already accepted, so this step is complete
    'assigned': 'assigned',
    'picked_up': 'picked_up',
    'in_transit': 'in_transit',
    'delivered': 'delivered',
    'completed': 'delivered'
  };

  const mappedStatus = statusMapping[currentStatus] || currentStatus;
  const statusOrder = ['posted', 'assigned', 'picked_up', 'in_transit', 'delivered'];
  const currentIndex = statusOrder.indexOf(mappedStatus);

  return allSteps.map((step, index) => ({
    ...step,
    // Current step and all previous steps are completed
    completed: index <= currentIndex,
    // Next step after current is "in progress" (active)
    active: index === currentIndex + 1,
  }));
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
  stepsContainer: {
    paddingLeft: 8,
  },
  stepContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 24,
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    zIndex: 1,
  },
  stepCompleted: {
    backgroundColor: '#dcfce7',
    borderColor: '#10B981',
  },
  stepActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#4A90E2',
  },
  stepIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  stepIconActive: {
    opacity: 1,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  stepLabelActive: {
    color: '#1f2937',
  },
  completedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  connector: {
    position: 'absolute',
    left: 23,
    top: 48,
    width: 2,
    height: 24,
    backgroundColor: '#e5e7eb',
  },
  connectorCompleted: {
    backgroundColor: '#10B981',
  },
});

export default StatusUpdateProgress;
