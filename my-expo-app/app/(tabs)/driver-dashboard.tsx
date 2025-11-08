import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Switch,
    Linking,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/services/auth';
import LoadService from '@/services/load';
import LocationService from '@/services/location';
import { Driver, Load } from '@/types/user';

export default function DriverDashboardScreen() {
    const [user, setUser] = useState<Driver | null>(null);
    const [availableLoads, setAvailableLoads] = useState<Load[]>([]);
    const [assignedLoads, setAssignedLoads] = useState<Load[]>([]);
    const [hasActiveLoadBlock, setHasActiveLoadBlock] = useState(false);
    const [earnings, setEarnings] = useState({
        totalEarnings: 0,
        completedTrips: 0,
        thisMonthEarnings: 0,
        thisWeekEarnings: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);

    useEffect(() => {
        initializeDriver();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const initializeDriver = async () => {
        try {
            const authService = AuthService.getInstance();
            const currentUser = await authService.getCurrentUser() as Driver;
            
            if (currentUser && currentUser.type === 'driver') {
                setUser(currentUser);
                await setupLocationTracking(currentUser.id);
                await loadDriverData(currentUser.id);
            } else {
                Alert.alert('Error', 'Please login as a driver to access this feature');
            }
        } catch (error) {
            console.error('Error initializing driver:', error);
            Alert.alert('Error', 'Failed to initialize driver dashboard');
        } finally {
            setLoading(false);
        }
    };

    const setupLocationTracking = async (driverId: string) => {
        try {
            const locationService = LocationService.getInstance();
            const hasPermissions = await locationService.requestPermissions();
            
            if (hasPermissions) {
                setLocationEnabled(true);
                
                // Get current location
                const location = await locationService.getCurrentLocation();
                if (location) {
                    setCurrentLocation(location);
                    
                    // Start real-time tracking
                    await locationService.startDriverTracking(driverId, 30000); // Update every 30 seconds
                    
                    // Set initial availability on server
                    await locationService.setDriverAvailabilityOnServer(driverId, isAvailable);
                }
            } else {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location permissions to receive nearby load offers.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error setting up location tracking:', error);
        }
    };

    const loadDriverData = async (driverId: string) => {
        try {
            const loadService = LoadService.getInstance();
            
            // Get available loads if location is available
            if (currentLocation) {
                const vehicleTypes = user?.vehicleType ? [user.vehicleType] : [];
                const result = await loadService.getAvailableLoads(currentLocation, vehicleTypes);
                
                if (result.hasActiveLoad) {
                    console.log('🚫 Driver has active load, blocking new loads');
                    setHasActiveLoadBlock(true);
                    setAvailableLoads([]);
                } else {
                    console.log(`✅ Setting ${result.loads.length} available loads to state`);
                    console.log('📦 Available loads:', JSON.stringify(result.loads.map(l => ({ id: l.id, pickup: l.pickupLocation?.address })), null, 2));
                    setHasActiveLoadBlock(false);
                    setAvailableLoads(result.loads);
                }
            }
            
            // Get assigned/active loads
            const assigned = await loadService.getDriverLoads(driverId, ['assigned', 'in_transit']);
            setAssignedLoads(assigned);
            
            // Get earnings data
            const earningsData = await loadService.getDriverEarnings(driverId);
            setEarnings(earningsData);
        } catch (error) {
            console.error('Error loading driver data:', error);
        }
    };

    const handleRefresh = useCallback(async () => {
        if (!user) return;
        
        setRefreshing(true);
        await loadDriverData(user.id);
        setRefreshing(false);
    }, [user, currentLocation]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAcceptLoad = async (loadId: string) => {
        if (!user) return;

        Alert.alert(
            'Accept Load',
            'Are you sure you want to accept this load offer?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    style: 'default',
                    onPress: async () => {
                        try {
                            const loadService = LoadService.getInstance();
                            await loadService.acceptLoad(loadId, user.id);
                            
                            Alert.alert('Success', 'Load accepted successfully!');
                            await handleRefresh();
                        } catch (error: any) {
                            // Display the specific error message from the backend
                            Alert.alert(
                                'Cannot Accept Load', 
                                error.message || 'Failed to accept load. Please try again.'
                            );
                        }
                    },
                },
            ]
        );
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

    const openLocationInMaps = (latitude: number, longitude: number, address: string) => {
        const scheme = Platform.select({
            ios: `maps:?q=${encodeURIComponent(address)}&ll=${latitude},${longitude}`,
            android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(address)})`
        });
        
        if (scheme) {
            Linking.openURL(scheme).catch((err) => {
                Alert.alert('Error', 'Unable to open maps');
                console.error('Error opening maps:', err);
            });
        }
    };

    const renderLoadCard = ({ item: load }: { item: Load }) => {
        const distance = currentLocation ? 
            LocationService.getInstance().calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                load.pickupLocation.latitude,
                load.pickupLocation.longitude
            ).toFixed(1) : 'N/A';

        return (
            <View style={styles.loadCard}>
                <View style={styles.loadHeader}>
                    <Text style={styles.loadTitle}>{load.description}</Text>
                    <Text style={styles.loadPrice}>₹{load.budget}</Text>
                </View>
                
                <View style={styles.loadDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="cube-outline" size={16} color="#666" />
                        <Text style={styles.detailText}>{(load.weight / 1000).toFixed(2)} tons • {load.vehicleTypeRequired}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {load.pickupLocation.address}
                        </Text>
                        <TouchableOpacity 
                            style={styles.mapButton}
                            onPress={() => openLocationInMaps(
                                load.pickupLocation.latitude,
                                load.pickupLocation.longitude,
                                load.pickupLocation.address
                            )}
                        >
                            <Ionicons name="navigate" size={18} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Ionicons name="flag-outline" size={16} color="#666" />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {load.dropLocation.address}
                        </Text>
                        <TouchableOpacity 
                            style={styles.mapButton}
                            onPress={() => openLocationInMaps(
                                load.dropLocation.latitude,
                                load.dropLocation.longitude,
                                load.dropLocation.address
                            )}
                        >
                            <Ionicons name="navigate" size={18} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.detailText}>
                            {new Date(load.pickupDate).toLocaleDateString()} • {distance}km away
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptLoad(load.id)}
                >
                    <Text style={styles.acceptButtonText}>Accept Load</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderAssignedLoadCard = ({ item: load }: { item: Load }) => {
        const statusColors = {
            assigned: '#FF9500',
            picked_up: '#FF7F00',
            in_transit: '#007AFF',
            delivered: '#34C759',
            cancelled: '#FF3B30',
            posted: '#8E8E93',
        };

        return (
            <View style={[styles.loadCard, { borderLeftColor: statusColors[load.status], borderLeftWidth: 4 }]}>
                <View style={styles.loadHeader}>
                    <Text style={styles.loadTitle}>{load.description}</Text>
                    <Text style={[styles.statusBadge, { backgroundColor: statusColors[load.status] }]}>
                        {load.status.toUpperCase()}
                    </Text>
                </View>
                
                <View style={styles.loadDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {load.pickupLocation.address}
                        </Text>
                        <TouchableOpacity 
                            style={styles.mapButton}
                            onPress={() => openLocationInMaps(
                                load.pickupLocation.latitude,
                                load.pickupLocation.longitude,
                                load.pickupLocation.address
                            )}
                        >
                            <Ionicons name="navigate" size={18} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Ionicons name="flag-outline" size={16} color="#666" />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {load.dropLocation.address}
                        </Text>
                        <TouchableOpacity 
                            style={styles.mapButton}
                            onPress={() => openLocationInMaps(
                                load.dropLocation.latitude,
                                load.dropLocation.longitude,
                                load.dropLocation.address
                            )}
                        >
                            <Ionicons name="navigate" size={18} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {load.status === 'assigned' && (
                    <TouchableOpacity
                        style={[styles.acceptButton, { backgroundColor: '#007AFF' }]}
                        onPress={() => {/* Navigate to trip tracking */}}
                    >
                        <Text style={styles.acceptButtonText}>Start Trip</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
                <Text style={styles.errorText}>Please login as a driver to access this feature</Text>
            </View>
        );
    }

    // Debug logging for FlatList data
    console.log(`🎨 RENDERING FlatList - Assigned: ${assignedLoads.length}, Available: ${availableLoads.length}`);
    console.log(`🎨 FlatList will render: ${assignedLoads.length > 0 ? 'ASSIGNED' : 'AVAILABLE'} loads`);

    return (
        <FlatList
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListHeaderComponent={
                <View>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.greeting}>Welcome back, {user.name}!</Text>
                        <View style={styles.availabilityContainer}>
                            <Text style={styles.availabilityLabel}>Available for loads</Text>
                            <Switch
                                value={isAvailable}
                                onValueChange={handleAvailabilityToggle}
                                disabled={!locationEnabled}
                            />
                        </View>
                    </View>

                    {/* Earnings Summary */}
                    <View style={styles.earningsContainer}>
                        <Text style={styles.sectionTitle}>Earnings Summary</Text>
                        <View style={styles.earningsGrid}>
                            <View style={styles.earningCard}>
                                <Text style={styles.earningValue}>₹{earnings.totalEarnings.toFixed(0)}</Text>
                                <Text style={styles.earningLabel}>Total Earnings</Text>
                            </View>
                            <View style={styles.earningCard}>
                                <Text style={styles.earningValue}>{earnings.completedTrips}</Text>
                                <Text style={styles.earningLabel}>Completed Trips</Text>
                            </View>
                            <View style={styles.earningCard}>
                                <Text style={styles.earningValue}>₹{earnings.thisMonthEarnings.toFixed(0)}</Text>
                                <Text style={styles.earningLabel}>This Month</Text>
                            </View>
                            <View style={styles.earningCard}>
                                <Text style={styles.earningValue}>₹{earnings.thisWeekEarnings.toFixed(0)}</Text>
                                <Text style={styles.earningLabel}>This Week</Text>
                            </View>
                        </View>
                    </View>

                    {/* Active Loads */}
                    {assignedLoads.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Active Loads</Text>
                        </View>
                    )}

                    {/* Available Loads Header */}
                    {assignedLoads.length === 0 && availableLoads.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Available Loads Nearby</Text>
                            <Text style={styles.sectionSubtitle}>
                                Showing {availableLoads.length} loads for {user.vehicleType} vehicles within 50km
                            </Text>
                        </View>
                    )}
                </View>
            }
            data={assignedLoads.length > 0 ? assignedLoads : availableLoads}
            keyExtractor={(item) => item.id}
            renderItem={assignedLoads.length > 0 ? renderAssignedLoadCard : renderLoadCard}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Ionicons 
                        name={hasActiveLoadBlock ? "checkmark-done-circle-outline" : (assignedLoads.length > 0 ? "checkmark-circle-outline" : "cube-outline")} 
                        size={48} 
                        color={hasActiveLoadBlock ? "#FF9500" : "#8E8E93"} 
                    />
                    <Text style={styles.emptyText}>
                        {hasActiveLoadBlock 
                            ? 'You have an active load' 
                            : (assignedLoads.length > 0 ? 'No active loads' : 'No available loads nearby')
                        }
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {hasActiveLoadBlock
                            ? 'Complete or cancel your current load to see new opportunities'
                            : (assignedLoads.length > 0 
                                ? 'Complete current loads to see new opportunities' 
                                : 'Make sure your location is enabled and you\'re available'
                            )
                        }
                    </Text>
                </View>
            }
        />
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
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 16,
    },
    availabilityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    availabilityLabel: {
        fontSize: 16,
        color: '#000000',
    },
    earningsContainer: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 16,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 16,
    },
    earningsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    earningCard: {
        width: '48%',
        backgroundColor: '#F2F2F7',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    earningValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 4,
    },
    earningLabel: {
        fontSize: 12,
        color: '#8E8E93',
        textAlign: 'center',
    },
    section: {
        margin: 16,
    },
    loadCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    loadTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
        marginRight: 12,
    },
    loadPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34C759',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    loadDetails: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666666',
        flex: 1,
    },
    mapButton: {
        padding: 4,
        marginLeft: 8,
        borderRadius: 6,
        backgroundColor: '#F0F8FF',
    },
    acceptButton: {
        backgroundColor: '#34C759',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
});
