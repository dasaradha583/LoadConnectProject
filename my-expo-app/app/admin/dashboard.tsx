import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/services/api';
import AuthService from '@/services/auth';

interface Stats {
  pendingUsers: number;
  pendingDocuments: number;
  activeDrivers: number;
  activeVendors: number;
  totalUsers: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const authService = AuthService.getInstance();
      const token = await authService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Manage Users & Documents</Text>
      </View>

      <View style={styles.statsGrid}>
        {/* Pending Users Card */}
        <TouchableOpacity
          style={[styles.statCard, styles.pendingCard]}
          onPress={() => router.push('/admin/pending-users')}
        >
          <View style={styles.statIcon}>
            <Text style={styles.iconText}>👥</Text>
          </View>
          <Text style={styles.statValue}>{stats?.pendingUsers || 0}</Text>
          <Text style={styles.statLabel}>Pending Users</Text>
          <Text style={styles.statAction}>Tap to Review →</Text>
        </TouchableOpacity>

        {/* Pending Documents Card */}
        <TouchableOpacity
          style={[styles.statCard, styles.documentsCard]}
          onPress={() => router.push('/admin/pending-documents')}
        >
          <View style={styles.statIcon}>
            <Text style={styles.iconText}>📄</Text>
          </View>
          <Text style={styles.statValue}>{stats?.pendingDocuments || 0}</Text>
          <Text style={styles.statLabel}>Pending Docs</Text>
          <Text style={styles.statAction}>Tap to Verify →</Text>
        </TouchableOpacity>

        {/* Active Drivers Card */}
        <TouchableOpacity style={[styles.statCard, styles.driversCard]}>
          <View style={styles.statIcon}>
            <Text style={styles.iconText}>🚛</Text>
          </View>
          <Text style={styles.statValue}>{stats?.activeDrivers || 0}</Text>
          <Text style={styles.statLabel}>Active Drivers</Text>
        </TouchableOpacity>

        {/* Active Vendors Card */}
        <TouchableOpacity style={[styles.statCard, styles.vendorsCard]}>
          <View style={styles.statIcon}>
            <Text style={styles.iconText}>🏢</Text>
          </View>
          <Text style={styles.statValue}>{stats?.activeVendors || 0}</Text>
          <Text style={styles.statLabel}>Active Vendors</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/pending-users')}
        >
          <Text style={styles.actionIcon}>✅</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Approve Users</Text>
            <Text style={styles.actionDesc}>Review and approve pending registrations</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/pending-documents')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Verify Documents</Text>
            <Text style={styles.actionDesc}>Check and verify uploaded documents</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/approval-logs')}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>View Logs</Text>
            <Text style={styles.actionDesc}>Check approval history and audit trail</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  documentsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  driversCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  vendorsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  statIcon: {
    marginBottom: 12,
  },
  iconText: {
    fontSize: 32,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statAction: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 8,
    fontWeight: '600',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionArrow: {
    fontSize: 20,
    color: '#9CA3AF',
  },
});
