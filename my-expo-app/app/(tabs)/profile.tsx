import AuthService from '@/services/auth';
import LocationService from '@/services/location';
import { Driver, Vendor } from '@/types/user';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
  const [user, setUser] = useState<Driver | Vendor | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const authService = AuthService.getInstance();
      
      // First try to load fresh profile data from backend
      let currentUser = await authService.loadFullProfile();
      
      // If backend call fails, fall back to local storage
      if (!currentUser) {
        currentUser = await authService.getCurrentUser();
      }
      
      if (currentUser) {
        // Type cast the user based on their type
        if (currentUser.type === 'driver') {
          const driverUser = currentUser as Driver;
          setUser(driverUser);
          setIsAvailable(driverUser.isAvailable || false);
        } else if (currentUser.type === 'vendor') {
          setUser(currentUser as Vendor);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // On error, try to load from local storage as fallback
      try {
        const authService = AuthService.getInstance();
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          if (currentUser.type === 'driver') {
            const driverUser = currentUser as Driver;
            setUser(driverUser);
            setIsAvailable(driverUser.isAvailable || false);
          } else if (currentUser.type === 'vendor') {
            setUser(currentUser as Vendor);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback profile loading also failed:', fallbackError);
      }
    }
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    if (user?.type === 'driver') {
      const previousValue = isAvailable;
      setIsAvailable(value);
      
      try {
        // Update backend first
        const authService = AuthService.getInstance();
        const success = await authService.updateDriverProfile({ 
          isAvailable: value 
        });
        
        if (success) {
          // Update local user data
          const updatedUser = { ...user, isAvailable: value } as Driver;
          await authService.setCurrentUser(updatedUser);
          setUser(updatedUser);
          
          // Start or stop location tracking based on availability
          const locationService = LocationService.getInstance();
          if (value) {
            locationService.startLocationTracking((location) => {
              console.log('Location updated:', location);
            });
          } else {
            locationService.stopLocationTracking();
          }
        } else {
          // Revert UI state if backend update failed
          setIsAvailable(previousValue);
          Alert.alert('Error', 'Failed to update availability status. Please try again.');
        }
      } catch (error) {
        // Revert UI state on error
        setIsAvailable(previousValue);
        console.error('Error updating availability:', error);
        Alert.alert('Error', 'Failed to update availability status. Please check your connection.');
      }
    }
  };

  const showNotificationSettings = () => {
    Alert.alert(
      'Notification Settings',
      'Choose your notification preferences:',
      [
        {
          text: 'Push Notifications',
          onPress: () => Alert.alert('Push Notifications', 'Push notifications are enabled. You will receive real-time updates about loads, earnings, and important announcements.')
        },
        {
          text: 'SMS Notifications', 
          onPress: () => Alert.alert('SMS Notifications', 'SMS notifications are enabled for critical updates like load assignments and payment confirmations.')
        },
        {
          text: 'Email Updates',
          onPress: () => Alert.alert('Email Updates', 'Weekly email summaries of your earnings and performance are enabled.')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showPrivacySettings = () => {
    Alert.alert(
      'Privacy & Terms',
      'Review our policies and your privacy settings:',
      [
        {
          text: 'Privacy Policy',
          onPress: () => Alert.alert('Privacy Policy', 'We protect your personal data and location information. Your data is encrypted and only used to provide load matching services. We never share your information with third parties without consent.')
        },
        {
          text: 'Terms of Service',
          onPress: () => Alert.alert('Terms of Service', 'By using this app, you agree to our terms including: Fair usage, Professional conduct, Timely load delivery, Accurate information sharing, and Compliance with transportation regulations.')
        },
        {
          text: 'Data Usage',
          onPress: () => Alert.alert('Data Usage', 'We collect location data for load matching, trip tracking, and safety. Communication data for customer service, and performance data for earnings calculation.')
        },
        { text: 'Back', style: 'cancel' }
      ]
    );
  };

  const showSupportOptions = () => {
    Alert.alert(
      'Support & Help',
      'Get help when you need it:',
      [
        {
          text: '📞 Call Support',
          onPress: () => {
            Alert.alert(
              'Call Support',
              '24/7 Support Helpline:\n\n📞 +91-98765-43210\n📞 +91-98765-43211\n\nFor emergencies, technical issues, payment queries, and general assistance.',
              [
                {
                  text: 'Call Now',
                  onPress: () => Linking.openURL('tel:+919876543210')
                },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        },
        {
          text: '💬 WhatsApp Support',
          onPress: () => {
            Alert.alert(
              'WhatsApp Support',
              'Chat with our support team on WhatsApp:\n\n📱 +91-98765-43212\n\nAvailable 24/7 for instant assistance',
              [
                {
                  text: 'Open WhatsApp',
                  onPress: () => Linking.openURL('https://wa.me/919876543212?text=Hi,%20I%20need%20help%20with%20the%20Load%20Management%20app')
                },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        },
        {
          text: '❓ FAQ & Help',
          onPress: () => Alert.alert('Frequently Asked Questions', 'Common Questions:\n\n• How to accept loads?\n• Payment and earnings\n• Trip tracking issues\n• Account verification\n• Safety guidelines\n• App troubleshooting\n\nVisit our help center in the app for detailed guides.')
        },
        { text: 'Back', style: 'cancel' }
      ]
    );
  };

  const showEditProfile = () => {
    if (user?.type === 'driver') {
      const driverUser = user as Driver;
      Alert.alert(
        'Edit Driver Profile',
        'Update your driver information:',
        [
          {
            text: 'Vehicle Details',
            onPress: () => Alert.alert('Vehicle Details', `Current Info:\n\nVehicle Type: ${driverUser.vehicleType || 'Not set'}\nCapacity: ${driverUser.vehicleCapacity || 'Not set'} tons\nVehicle Number: ${driverUser.vehicleNumber || 'Not set'}\nLicense Number: ${driverUser.licenseNumber || 'Not set'}\n\nTo update these details, please contact support.`)
          },
          {
            text: 'Contact Info',
            onPress: () => Alert.alert('Contact Information', `Current Info:\n\nName: ${user.name}\nPhone: ${user.phone}\nUsername: ${user.username}\n\nTo update contact details, please contact support for verification.`)
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else if (user?.type === 'vendor') {
      const vendorUser = user as Vendor;
      Alert.alert(
        'Edit Vendor Profile',
        'Update your business information:',
        [
          {
            text: 'Business Details',
            onPress: () => Alert.alert('Business Details', `Current Info:\n\nBusiness Name: ${vendorUser.businessName || 'Not set'}\nGST Number: ${vendorUser.gstNumber || 'Not set'}\n\nTo update business details, please contact support with proper documentation.`)
          },
          {
            text: 'Contact Info', 
            onPress: () => Alert.alert('Contact Information', `Current Info:\n\nName: ${user.name}\nPhone: ${user.phone}\nUsername: ${user.username}\n\nTo update contact details, please contact support for verification.`)
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleLogout = () => {
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
              console.log('Starting logout process...');
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
                // Navigate to welcome screen
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

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
          <Text style={styles.userType}>
            {user.type === 'driver' ? '🚛 Driver' : '🏢 Vendor'}
          </Text>
        </View>

        {user.type === 'driver' ? (
          <DriverProfileDetails user={user as Driver} isAvailable={isAvailable} onAvailabilityToggle={handleAvailabilityToggle} />
        ) : (
          <VendorProfileDetails user={user as Vendor} />
        )}

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={showNotificationSettings}
          >
            <Text style={styles.settingText}>🔔 Notifications</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={showPrivacySettings}
          >
            <Text style={styles.settingText}>🛡️ Privacy & Terms</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={showSupportOptions}
          >
            <Text style={styles.settingText}>📞 Support & Help</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={showEditProfile}
          >
            <Text style={styles.settingText}>✏️ Edit Profile</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function DriverProfileDetails({ 
  user, 
  isAvailable, 
  onAvailabilityToggle 
}: { 
  user: Driver; 
  isAvailable: boolean;
  onAvailabilityToggle: (value: boolean) => void;
}) {
  return (
    <>
      <View style={styles.availabilityCard}>
        <View style={styles.availabilityHeader}>
          <Text style={styles.availabilityTitle}>Availability Status</Text>
          <Switch
            value={isAvailable}
            onValueChange={onAvailabilityToggle}
            trackColor={{ false: '#e1e5e9', true: '#28a745' }}
            thumbColor={isAvailable ? '#fff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.availabilityText}>
          {isAvailable ? 'You are available for new loads' : 'You are currently unavailable'}
        </Text>
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle Type</Text>
          <Text style={styles.detailValue}>{user.vehicleType || 'Not specified'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Capacity</Text>
          <Text style={styles.detailValue}>{user.vehicleCapacity ? `${user.vehicleCapacity} tons` : 'Not specified'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle Number</Text>
          <Text style={styles.detailValue}>{user.vehicleNumber || 'Not specified'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>License Number</Text>
          <Text style={styles.detailValue}>{user.licenseNumber || 'Not specified'}</Text>
        </View>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Performance Stats</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.totalTrips || 0}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>⭐ {typeof user.rating === 'number' ? user.rating.toFixed(1) : '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{(user.totalEarnings || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>
      </View>
    </>
  );
}

function VendorProfileDetails({ user }: { user: Vendor }) {
  return (
    <>
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Business Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Business Name</Text>
          <Text style={styles.detailValue}>{user.businessName || 'Not specified'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>GST Number</Text>
          <View style={styles.valueWithBadge}>
            <Text style={styles.detailValue}>{user.gstNumber || 'Not specified'}</Text>
            {user.gstNumber && (
              <View style={[
                styles.verificationBadge,
                (user as any).gstVerified === true ? styles.verifiedBadge :
                (user as any).businessVerificationStatus === 'rejected' ? styles.rejectedBadge :
                styles.pendingBadge
              ]}>
                <Text style={styles.badgeText}>
                  {(user as any).gstVerified === true ? '✓ Verified' :
                   (user as any).businessVerificationStatus === 'rejected' ? '✗ Rejected' :
                   '⏳ Pending'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Business Stats</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>⭐ {typeof user.rating === 'number' ? user.rating.toFixed(1) : '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🏢</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
        </View>
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
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  userType: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  availabilityCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  availabilityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  availabilityText: {
    fontSize: 14,
    color: '#666',
  },
  detailsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  settingArrow: {
    fontSize: 18,
    color: '#ccc',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Verification Badge Styles
  valueWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E9',
  },
  rejectedBadge: {
    backgroundColor: '#FFEBEE',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
