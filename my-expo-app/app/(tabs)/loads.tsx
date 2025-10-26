import AuthService from '@/services/auth';
import LoadService from '@/services/load';
import LocationService from '@/services/location';
import { Driver, Load } from '@/types/user';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoadsScreen() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAvailableLoads = useCallback(async () => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser() as Driver;

      if (!user) {
        Alert.alert('Error', 'User not found. Please login again.');
        return;
      }

      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();
      
      if (!location) {
        Alert.alert(
          'Location Required', 
          'Please enable location services to view nearby loads.',
          [
            { text: 'OK' },
            { 
              text: 'Retry', 
              onPress: () => loadAvailableLoads() 
            }
          ]
        );
        return;
      }
      
      const loadService = LoadService.getInstance();
      
      // Get vehicle types from user profile
      const vehicleTypes = user.vehicleType ? [user.vehicleType] : [];
      
      const result = await loadService.getAvailableLoads(location, vehicleTypes);
      
      // Handle the result properly - it returns {loads, hasActiveLoad, activeLoad}
      if (result.hasActiveLoad) {
        console.log('⚠️ Driver has an active load, showing empty list');
        setLoads([]);
        Alert.alert(
          'Active Load',
          'You have an active load. Complete it before accepting new loads.',
          [{ text: 'OK' }]
        );
      } else {
        console.log(`✅ Setting ${result.loads.length} loads to display`);
        setLoads(result.loads);
      }
      
    } catch (error) {
      console.error('Error loading available loads:', error);
      Alert.alert('Error', 'Failed to load available loads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableLoads();
  }, [loadAvailableLoads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailableLoads();
    setRefreshing(false);
  };



  const handleAcceptLoad = async (loadId: string) => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser();
      
      if (!user) return;

      Alert.alert(
        'Accept Load',
        'Are you sure you want to accept this load?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            onPress: async () => {
              const loadService = LoadService.getInstance();
              const success = await loadService.assignLoadToDriver(loadId, user.id);
              
              if (success) {
                Alert.alert(
                  'Success', 
                  'Load accepted successfully! You now have access to complete load details and contact information.',
                  [
                    {
                      text: 'View Details',
                      onPress: () => router.push(`/(tabs)/load-details?id=${loadId}`)
                    }
                  ]
                );
                await loadAvailableLoads(); // Refresh the list
              } else {
                Alert.alert('Error', 'Failed to accept load. It may have been taken by another driver.');
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const renderLoadItem = ({ item }: { item: Load }) => {
    return (
      <View style={styles.loadCard}>
        <View style={styles.loadHeader}>
          <Text style={styles.loadWeight}>{item.weight} tons</Text>
          <Text style={styles.loadBudget}>₹{item.budget.toLocaleString()}</Text>
        </View>
        
        <Text style={styles.loadDescription}>{item.description}</Text>
        
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>📍 Pickup:</Text>
          <Text style={styles.locationText}>{item.pickupLocation.address}</Text>
        </View>
        
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>🎯 Drop:</Text>
          <Text style={styles.locationText}>{item.dropLocation.address}</Text>
        </View>
        
        <View style={styles.detailsRow}>
          <Text style={styles.detailItem}>📏 {item.estimatedDistance.toFixed(1)} km</Text>
          <Text style={styles.detailItem}>📅 {new Date(item.pickupDate).toLocaleDateString()}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptLoad(item.id)}
        >
          <Text style={styles.acceptButtonText}>Accept Load</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading available loads...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Loads</Text>
        <Text style={styles.headerSubtitle}>{loads.length} loads near you</Text>
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
            <Text style={styles.emptyTitle}>No Loads Available</Text>
            <Text style={styles.emptyText}>
              There are no loads available in your area right now. Pull down to refresh.
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
    alignItems: 'center',
    marginBottom: 12,
  },
  loadWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E5D8A',
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
  locationContainer: {
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    paddingLeft: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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
  acceptButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
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
