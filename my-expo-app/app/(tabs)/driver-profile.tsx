import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AuthService from '@/services/auth';
import LocationService from '@/services/location';
import { Driver } from '@/types/user';

const VEHICLE_TYPES = [
    { value: 'mini', label: 'Mini Truck (1-2 Tons)', capacity: '1-2' },
    { value: 'small', label: 'Small Truck (3-5 Tons)', capacity: '3-5' },
    { value: 'medium', label: 'Medium Truck (6-10 Tons)', capacity: '6-10' },
    { value: 'large', label: 'Large Truck (10+ Tons)', capacity: '10+' },
    { value: 'container', label: 'Container Truck', capacity: '20+' },
    { value: 'tanker', label: 'Tanker', capacity: '15+' },
];

export default function DriverProfileScreen() {
    const [user, setUser] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        vehicleType: '',
        vehicleCapacity: '',
        vehicleNumber: '',
        licenseNumber: '',
    });

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const authService = AuthService.getInstance();
            const currentUser = await authService.getCurrentUser() as Driver;
            
            if (currentUser && currentUser.type === 'driver') {
                setUser(currentUser);
                setFormData({
                    name: currentUser.name,
                    vehicleType: currentUser.vehicleType || '',
                    vehicleCapacity: currentUser.vehicleCapacity?.toString() || '',
                    vehicleNumber: currentUser.vehicleNumber || '',
                    licenseNumber: currentUser.licenseNumber || '',
                });
                setIsAvailable(currentUser.isAvailable !== false);
                
                // Check location permissions
                const locationService = LocationService.getInstance();
                const hasPermissions = await locationService.requestPermissions();
                setLocationEnabled(hasPermissions);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!user) return;

            // Validate required fields
            if (!formData.name || !formData.vehicleType || !formData.vehicleNumber || !formData.licenseNumber) {
                Alert.alert('Error', 'Please fill in all required fields');
                return;
            }

            setLoading(true);

            // Update user profile via API
            const authService = AuthService.getInstance();
            const success = await authService.updateProfile({
                name: formData.name,
                vehicleType: formData.vehicleType,
                vehicleCapacity: parseFloat(formData.vehicleCapacity) || 0,
                vehicleNumber: formData.vehicleNumber,
                licenseNumber: formData.licenseNumber,
            });

            if (success) {
                Alert.alert('Success', 'Profile updated successfully');
                setEditing(false);
                await loadUserProfile(); // Reload to get updated data
            } else {
                Alert.alert('Error', 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleAvailabilityToggle = async (value: boolean) => {
        if (!user) return;

        setIsAvailable(value);
        
        if (locationEnabled) {
            const locationService = LocationService.getInstance();
            const success = await locationService.setDriverAvailabilityOnServer(user.id, value);
            
            if (!success) {
                setIsAvailable(!value); // Revert on failure
                Alert.alert('Error', 'Failed to update availability status');
            }
        }
    };

    const handleLocationPermissions = async () => {
        const locationService = LocationService.getInstance();
        const granted = await locationService.requestPermissions();
        
        if (granted) {
            setLocationEnabled(true);
            Alert.alert('Success', 'Location permissions granted. You can now receive nearby load offers.');
        } else {
            Alert.alert(
                'Permission Required',
                'Location permission is required to receive nearby load offers and track deliveries.',
                [{ text: 'OK' }]
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
                            console.log('Starting logout process from Driver Profile...');
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

    const getVehicleTypeLabel = (value: string) => {
        const type = VEHICLE_TYPES.find(t => t.value === value);
        return type ? type.label : value;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
                <Text style={styles.errorText}>Failed to load profile</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.profileInfo}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={32} color="#007AFF" />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userType}>Driver • @{user.username}</Text>
                        <Text style={styles.userPhone}>{user.phone}</Text>
                    </View>
                </View>
                
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setEditing(!editing)}
                >
                    <Ionicons 
                        name={editing ? "checkmark" : "pencil"} 
                        size={20} 
                        color="#007AFF" 
                    />
                </TouchableOpacity>
            </View>

            {/* Availability Status */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="location" size={20} color="#34C759" />
                    <Text style={styles.sectionTitle}>Availability</Text>
                </View>
                
                <View style={styles.availabilityCard}>
                    <View style={styles.availabilityRow}>
                        <Text style={styles.availabilityLabel}>Available for loads</Text>
                        <Switch
                            value={isAvailable}
                            onValueChange={handleAvailabilityToggle}
                            disabled={!locationEnabled}
                        />
                    </View>
                    
                    {!locationEnabled && (
                        <TouchableOpacity
                            style={styles.locationPermissionButton}
                            onPress={handleLocationPermissions}
                        >
                            <Ionicons name="location-outline" size={16} color="#FF9500" />
                            <Text style={styles.locationPermissionText}>
                                Enable location permissions to receive load offers
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Vehicle Information */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="car" size={20} color="#007AFF" />
                    <Text style={styles.sectionTitle}>Vehicle Information</Text>
                </View>
                
                <View style={styles.card}>
                    {editing ? (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Vehicle Type *</Text>
                                <View style={styles.inputContainer}>
                                    {VEHICLE_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type.value}
                                            style={[
                                                styles.vehicleTypeOption,
                                                formData.vehicleType === type.value && styles.vehicleTypeSelected
                                            ]}
                                            onPress={() => setFormData({ ...formData, vehicleType: type.value })}
                                        >
                                            <Text style={[
                                                styles.vehicleTypeText,
                                                formData.vehicleType === type.value && styles.vehicleTypeTextSelected
                                            ]}>
                                                {type.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Vehicle Number *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.vehicleNumber}
                                    onChangeText={(text) => setFormData({ ...formData, vehicleNumber: text.toUpperCase() })}
                                    placeholder="MH12AB1234"
                                    autoCapitalize="characters"
                                />
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>License Number *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={formData.licenseNumber}
                                    onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
                                    placeholder="DL-1234567890123"
                                />
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Vehicle Type</Text>
                                <Text style={styles.infoValue}>
                                    {getVehicleTypeLabel(user.vehicleType || '')}
                                </Text>
                            </View>
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Vehicle Number</Text>
                                <Text style={styles.infoValue}>{user.vehicleNumber || 'Not set'}</Text>
                            </View>
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>License Number</Text>
                                <View style={styles.valueWithBadge}>
                                    <Text style={styles.infoValue}>{user.licenseNumber || 'Not set'}</Text>
                                    {user.licenseNumber && (
                                        <View style={[
                                            styles.verificationBadge,
                                            (user as any).licenseVerificationStatus === 'verified' ? styles.verifiedBadge :
                                            (user as any).licenseVerificationStatus === 'rejected' ? styles.rejectedBadge :
                                            styles.pendingBadge
                                        ]}>
                                            <Text style={styles.badgeText}>
                                                {(user as any).licenseVerificationStatus === 'verified' ? '✓ Verified' :
                                                 (user as any).licenseVerificationStatus === 'rejected' ? '✗ Rejected' :
                                                 '⏳ Pending'}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Capacity</Text>
                                <Text style={styles.infoValue}>
                                    {user.vehicleCapacity ? `${user.vehicleCapacity} tons` : 'Not set'}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* Stats */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="bar-chart" size={20} color="#34C759" />
                    <Text style={styles.sectionTitle}>Statistics</Text>
                </View>
                
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{(parseFloat((user as any)?.rating) || 5.0).toFixed(1)}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                        <View style={styles.stars}>
                            {[1,2,3,4,5].map(i => (
                                <Ionicons 
                                    key={i} 
                                    name={i <= Math.floor(parseFloat((user as any)?.rating) || 5) ? "star" : "star-outline"} 
                                    size={12} 
                                    color="#FF9500" 
                                />
                            ))}
                        </View>
                    </View>
                    
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{user.totalTrips || 0}</Text>
                        <Text style={styles.statLabel}>Total Trips</Text>
                    </View>
                    
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>₹{(user.totalEarnings || 0).toFixed(0)}</Text>
                        <Text style={styles.statLabel}>Total Earnings</Text>
                    </View>
                    
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {user.totalTrips > 0 ? Math.round(((user.completedTrips || 0) / user.totalTrips) * 100) : 0}%
                        </Text>
                        <Text style={styles.statLabel}>Success Rate</Text>
                    </View>
                </View>
            </View>

            {/* Save/Cancel Buttons */}
            {editing && (
                <View style={styles.section}>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => {
                                setEditing(false);
                                // Reset form data
                                setFormData({
                                    name: user.name,
                                    vehicleType: user.vehicleType || '',
                                    vehicleCapacity: user.vehicleCapacity?.toString() || '',
                                    vehicleNumber: user.vehicleNumber || '',
                                    licenseNumber: user.licenseNumber || '',
                                });
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Logout */}
            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8E8E93',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        padding: 20,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: '#FF3B30',
        textAlign: 'center',
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 4,
    },
    userType: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 2,
    },
    userPhone: {
        fontSize: 14,
        color: '#8E8E93',
    },
    editButton: {
        padding: 8,
    },
    section: {
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginLeft: 8,
    },
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    availabilityCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    availabilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    availabilityLabel: {
        fontSize: 16,
        color: '#000000',
    },
    locationPermissionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFF8E1',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    locationPermissionText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#F57C00',
        flex: 1,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    infoLabel: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 16,
        color: '#8E8E93',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000000',
        marginBottom: 8,
    },
    inputContainer: {
        gap: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
    },
    vehicleTypeOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        backgroundColor: '#FFFFFF',
    },
    vehicleTypeSelected: {
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD',
    },
    vehicleTypeText: {
        fontSize: 14,
        color: '#000000',
        textAlign: 'center',
    },
    vehicleTypeTextSelected: {
        color: '#007AFF',
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#8E8E93',
        textAlign: 'center',
    },
    stars: {
        flexDirection: 'row',
        marginTop: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F2F2F7',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    cancelButtonText: {
        color: '#8E8E93',
        fontSize: 16,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#007AFF',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logoutText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#FF3B30',
        fontWeight: '500',
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
