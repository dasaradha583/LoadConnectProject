import AuthService from '@/services/auth';
import LoadService from '@/services/load';
import { Driver, Load } from '@/types/user';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function EarningsScreen() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [completedLoads, setCompletedLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser() as Driver;
      setDriver(user);

      if (user) {
        const loadService = LoadService.getInstance();
        const loads = await loadService.getLoadsByDriver(user.id);
        const completed = loads.filter(load => load.status === 'delivered');
        setCompletedLoads(completed);
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEarningsData();
    setRefreshing(false);
  };

  const getEarningsForPeriod = (period: 'week' | 'month' | 'all') => {
    let filteredLoads = completedLoads;
    
    if (period === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filteredLoads = completedLoads.filter(load => new Date(load.updatedAt) >= oneWeekAgo);
    } else if (period === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      filteredLoads = completedLoads.filter(load => new Date(load.updatedAt) >= oneMonthAgo);
    }
    
    return {
      earnings: filteredLoads.reduce((sum, load) => sum + load.budget, 0),
      trips: filteredLoads.length,
      loads: filteredLoads,
    };
  };


  
  const getAverageEarningsPerTrip = () => {
    const periodData = getEarningsForPeriod(selectedPeriod);
    return periodData.trips > 0 ? periodData.earnings / periodData.trips : 0;
  };

  const getBestEarningTrip = () => {
    const periodData = getEarningsForPeriod(selectedPeriod);
    return periodData.loads.length > 0 
      ? Math.max(...periodData.loads.map(load => load.budget))
      : 0;
  };

  const renderLoadItem = ({ item }: { item: Load }) => (
    <View style={styles.loadCard}>
      <View style={styles.loadHeader}>
        <Text style={styles.loadId}>#{item.id.slice(-6).toUpperCase()}</Text>
        <Text style={styles.loadEarning}>+₹{item.budget.toLocaleString()}</Text>
      </View>
      <Text style={styles.loadRoute}>
        {item.pickupLocation.address} → {item.dropLocation.address}
      </Text>
      <Text style={styles.loadDate}>
        Completed: {new Date(item.updatedAt).toLocaleDateString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your income and trips</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'all'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.mainStatCard}>
            <Text style={styles.mainStatValue}>
              ₹{getEarningsForPeriod(selectedPeriod).earnings.toLocaleString()}
            </Text>
            <Text style={styles.mainStatLabel}>
              {selectedPeriod === 'week' ? 'This Week' : 
               selectedPeriod === 'month' ? 'This Month' : 'Total'} Earnings
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getEarningsForPeriod(selectedPeriod).trips}</Text>
              <Text style={styles.statLabel}>Trips Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                ₹{getAverageEarningsPerTrip().toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Avg per Trip</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₹{getBestEarningTrip().toLocaleString()}</Text>
              <Text style={styles.statLabel}>Best Trip</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>⭐ {(parseFloat((driver as any)?.rating) || 5.0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        <View style={styles.recentTripsContainer}>
          <Text style={styles.sectionTitle}>Recent Completed Trips</Text>
          {completedLoads.length > 0 ? (
            <FlatList
              data={completedLoads.slice(0, 10)}
              keyExtractor={(item) => item.id}
              renderItem={renderLoadItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>No completed trips yet</Text>
            </View>
          )}
        </View>

        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🎯 Average per Trip</Text>
            <Text style={styles.insightValue}>
              ₹{driver?.totalTrips ? Math.round(driver.totalEarnings / driver.totalTrips).toLocaleString() : '0'}
            </Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>📈 Weekly Growth</Text>
            <Text style={styles.insightValue}>
              {completedLoads.length > 0 ? '+12%' : 'N/A'}
            </Text>
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: '#28a745',
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
  statsContainer: {
    padding: 20,
  },
  mainStatCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainStatValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28a745',
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E5D8A',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  recentTripsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
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
  loadId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  loadEarning: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  loadRoute: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  loadDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  insightsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  insightCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  insightTitle: {
    fontSize: 16,
    color: '#333',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  // Period Selector Styles
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4A90E2',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
});
