import AuthService from '@/services/auth';
import LoadService from '@/services/load';
import LocationService from '@/services/location';
import { Driver, Load, Vendor } from '@/types/user';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HomeScreen() {
  const [user, setUser] = useState<Driver | Vendor | any>(null);
  const [nearbyLoads, setNearbyLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadsLoading, setLoadsLoading] = useState(false);

  const initializeScreen = useCallback(async () => {
    try {
      // Get current user first (this should be fast from local storage)
      const authService = AuthService.getInstance();
      const currentUser = await authService.getCurrentUser();
      
      // Redirect admin users to admin dashboard
      if (currentUser && 'type' in currentUser && currentUser.type === 'admin') {
        router.replace('/admin/dashboard');
        return;
      }
      
      setUser(currentUser as Driver | Vendor);
      
      // Stop loading immediately after getting user - don't wait for loads
      setLoading(false);

      // Load nearby loads in background for drivers (non-blocking)
      if (currentUser?.type === 'driver') {
        // Don't await this - let it load in background
        requestLocationAndLoadNearbyLoads().catch(error => {
          console.log('Background load of nearby loads failed:', error);
        });
      }
    } catch (error) {
      console.error('Error initializing screen:', error);
      // Even on error, stop loading so user can see something
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeScreen();
  }, [initializeScreen]);

  const requestLocationAndLoadNearbyLoads = async () => {
    try {
      setLoadsLoading(true);
      const locationService = LocationService.getInstance();
      
      // Set a timeout for location request (5 seconds max)
      const locationPromise = locationService.getCurrentLocation();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Location timeout')), 5000)
      );
      
      const location = await Promise.race([locationPromise, timeoutPromise]) as { latitude: number; longitude: number } | null;
      
      if (location && location.latitude && location.longitude) {
        const loadService = LoadService.getInstance();
        const result = await loadService.getNearbyLoads(location, undefined, 50); // 50km radius
        // Handle both array and object response formats
        if (Array.isArray(result)) {
          setNearbyLoads(result);
        } else if (result && 'loads' in result) {
          setNearbyLoads(result.loads);
        }
      }
    } catch (error) {
      console.log('Error loading nearby loads:', error);
      // Don't throw error - just log it and continue
    } finally {
      setLoadsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initializeScreen();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Starting logout process from Home...');
              const authService = AuthService.getInstance();
              
              // Stop location tracking first
              const locationService = LocationService.getInstance();
              locationService.stopLocationTracking();
              console.log('Location tracking stopped');
              
              // Perform logout
              await authService.logout();
              console.log('AuthService logout completed');
              
              // Small delay to ensure state is cleared
              setTimeout(() => {
                console.log('Navigating to welcome screen...');
                router.replace('/auth/welcome');
              }, 100);
              
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Logout Error', 'There was an issue logging out. You will be redirected to the welcome screen.');
              // Force navigation even if logout fails
              setTimeout(() => {
                router.replace('/auth/welcome');
              }, 100);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>User not found</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => router.replace('/auth/welcome')}
        >
          <Text style={styles.retryText}>Return to Welcome</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {user?.type === 'driver' ? 'Hello Driver!' : 'Hello Vendor!'}
          </Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {user?.type === 'driver' ? (
        <DriverDashboard user={user as Driver} nearbyLoads={nearbyLoads} loadsLoading={loadsLoading} />
      ) : (
        <VendorDashboard user={user as Vendor} />
      )}
    </ScrollView>
  );
}

function DriverDashboard({ user, nearbyLoads, loadsLoading }: { user: Driver; nearbyLoads: Load[]; loadsLoading?: boolean }) {
  const rating = typeof user.rating === 'number' ? user.rating : 5.0;
  
  return (
    <>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user.totalTrips || 0}</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{(user.totalEarnings || 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>⭐ {rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Driver Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, user.isAvailable ? styles.available : styles.unavailable]} />
          <Text style={styles.statusText}>
            {user.isAvailable ? 'Available for loads' : 'Currently busy'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nearby Loads ({nearbyLoads.length})</Text>
        {loadsLoading ? (
          <Text style={styles.noLoadsText}>Loading nearby loads...</Text>
        ) : nearbyLoads.length > 0 ? (
          nearbyLoads.slice(0, 3).map((load) => (
            <View key={load.id} style={styles.loadCard}>
              <View style={styles.loadHeader}>
                <Text style={styles.loadWeight}>{load.weight} tons</Text>
                <Text style={styles.loadBudget}>₹{(load.budget || 0).toLocaleString()}</Text>
              </View>
              <Text style={styles.loadRoute}>
                📍 {load.pickupLocation.address} → {load.dropLocation.address}
              </Text>
              <Text style={styles.loadDistance}>
                📏 {(load.estimatedDistance || 0).toFixed(1)} km • 📅 {new Date(load.pickupDate).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noLoadsText}>No loads available nearby</Text>
        )}
      </View>
    </>
  );
}



function VendorDashboard({ user }: { user: Vendor }) {
  const rating = typeof user.rating === 'number' ? user.rating : 5.0;
  
  return (
    <>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user.totalOrders || 0}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>⭐ {rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🏢</Text>
          <Text style={styles.statLabel}>Business</Text>
        </View>
      </View>

      <View style={styles.businessCard}>
        <Text style={styles.businessName}>{user.businessName}</Text>
        <Text style={styles.gstNumber}>GST: {user.gstNumber}</Text>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/post-load')}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionText}>Post New Load</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/my-loads')}
        >
          <Text style={styles.actionIcon}>🚛</Text>
          <Text style={styles.actionText}>My Active Loads</Text>
        </TouchableOpacity>
      </View>
    </>
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
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#4A90E2',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E5D8A',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusCard: {
    margin: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  available: {
    backgroundColor: '#28a745',
  },
  unavailable: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  businessCard: {
    margin: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E5D8A',
    marginBottom: 4,
  },
  gstNumber: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  loadWeight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E5D8A',
  },
  loadBudget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  loadRoute: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  loadDistance: {
    fontSize: 12,
    color: '#666',
  },
  noLoadsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  quickActions: {
    margin: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
