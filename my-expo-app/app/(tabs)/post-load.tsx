import AuthService from '@/services/auth';
import LoadService from '@/services/load';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    Dimensions,
    Platform,
} from 'react-native';
import * as Location from 'expo-location';

// Conditionally import MapView only for native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

export default function PostLoadScreen() {
  // Get tomorrow's date as the minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Reset to start of day
  
  const [formData, setFormData] = useState({
    weight: '',
    description: '',
    pickupAddress: '',
    dropAddress: '',
    budget: '',
    vehicleTypeRequired: 'truck',
    pickupContactName: '',
    pickupContactPhone: '',
    dropContactName: '',
    dropContactPhone: '',
  });
  const [pickupDate, setPickupDate] = useState(tomorrow);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Map picker states
  const [showPickupMapPicker, setShowPickupMapPicker] = useState(false);
  const [showDropMapPicker, setShowDropMapPicker] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<{lat: number; lng: number; address: string} | null>(null);
  const [dropLocation, setDropLocation] = useState<{lat: number; lng: number; address: string} | null>(null);
  
  // Location selection modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationModalType, setLocationModalType] = useState<'pickup' | 'drop'>('pickup');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  
  // Map state
  const [mapRegion, setMapRegion] = useState({
    latitude: 12.9716, // Default to Bangalore
    longitude: 77.5946,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [selectedMapLocation, setSelectedMapLocation] = useState<{lat: number; lng: number} | null>(null);
  const mapRef = useRef<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { weight, description, budget, pickupContactName, pickupContactPhone, dropContactName, dropContactPhone } = formData;
    
    if (!weight.trim() || isNaN(Number(weight)) || Number(weight) <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return false;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }
    
    if (!pickupLocation) {
      Alert.alert('Error', 'Please select pickup location on map');
      return false;
    }
    
    if (!dropLocation) {
      Alert.alert('Error', 'Please select drop location on map');
      return false;
    }
    
    if (!budget.trim() || isNaN(Number(budget)) || Number(budget) <= 0) {
      Alert.alert('Error', 'Please enter a valid budget');
      return false;
    }
    
    if (!pickupContactName.trim()) {
      Alert.alert('Error', 'Please enter pickup contact name');
      return false;
    }
    
    if (!pickupContactPhone.trim() || !/^\d{10}$/.test(pickupContactPhone.trim())) {
      Alert.alert('Error', 'Please enter a valid 10-digit pickup contact phone');
      return false;
    }
    
    if (!dropContactName.trim()) {
      Alert.alert('Error', 'Please enter drop contact name');
      return false;
    }
    
    if (!dropContactPhone.trim() || !/^\d{10}$/.test(dropContactPhone.trim())) {
      Alert.alert('Error', 'Please enter a valid 10-digit drop contact phone');
      return false;
    }
    
    if (pickupDate < new Date()) {
      Alert.alert('Error', 'Pickup date cannot be in the past');
      return false;
    }
    
    return true;
  };

  const handleOpenMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        
        setSelectedMapLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Could not get current location, using default');
    }
    
    setShowLocationModal(true);
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedMapLocation({ lat: latitude, lng: longitude });
  };

  const handleConfirmMapLocation = () => {
    if (!selectedMapLocation) {
      Alert.alert('Error', 'Please tap on the map to select a location');
      return;
    }
    
    const coords = {
      lat: selectedMapLocation.lat,
      lng: selectedMapLocation.lng,
      address: `${selectedMapLocation.lat.toFixed(6)}, ${selectedMapLocation.lng.toFixed(6)}`
    };
    
    if (locationModalType === 'pickup') {
      setPickupLocation(coords);
    } else {
      setDropLocation(coords);
    }
    
    setShowLocationModal(false);
    setSelectedMapLocation(null);
    Alert.alert('Success', `${locationModalType === 'pickup' ? 'Pickup' : 'Drop'} location selected`);
  };

  const handleUseCurrentLocationOnMap = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        setLoading(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setMapRegion(newRegion);
      setSelectedMapLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
      
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Input', 'Please enter valid latitude and longitude');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid Coordinates', 'Latitude must be between -90 and 90, Longitude must be between -180 and 180');
      return;
    }
    
    const coords = {
      lat,
      lng,
      address: manualAddress.trim() || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    };
    
    if (locationModalType === 'pickup') {
      setPickupLocation(coords);
    } else {
      setDropLocation(coords);
    }
    
    setShowLocationModal(false);
    setManualLat('');
    setManualLng('');
    setManualAddress('');
    Alert.alert('Success', `${locationModalType === 'pickup' ? 'Pickup' : 'Drop'} location set successfully`);
  };

  const commonLocations = [
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  ];

  const handleSelectCommonLocation = (location: any) => {
    const coords = {
      lat: location.lat,
      lng: location.lng,
      address: location.name
    };
    
    if (locationModalType === 'pickup') {
      setPickupLocation(coords);
    } else {
      setDropLocation(coords);
    }
    
    setShowLocationModal(false);
    Alert.alert('Success', `${locationModalType === 'pickup' ? 'Pickup' : 'Drop'} location set to ${location.name}`);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser();
      
      if (!user) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // Create load data with map-selected coordinates
      const loadData = {
        vendorId: user.id,
        weight: Number(formData.weight),
        description: formData.description,
        vehicleTypeRequired: formData.vehicleTypeRequired,
        // Send coordinates from map selection (required)
        pickupLat: pickupLocation!.lat,
        pickupLng: pickupLocation!.lng,
        pickupAddress: pickupLocation!.address,
        dropLat: dropLocation!.lat,
        dropLng: dropLocation!.lng,
        dropAddress: dropLocation!.address,
        pickupContactName: formData.pickupContactName,
        pickupContactPhone: formData.pickupContactPhone,
        dropContactName: formData.dropContactName,
        dropContactPhone: formData.dropContactPhone,
        pickupDate,
        budget: Number(formData.budget),
      };

      const loadService = LoadService.getInstance();
      await loadService.createLoad(loadData);
      
      Alert.alert(
        'Success',
        'Load posted successfully! Drivers will be able to see and bid on your load.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                weight: '',
                description: '',
                pickupAddress: '',
                dropAddress: '',
                budget: '',
                vehicleTypeRequired: 'truck',
                pickupContactName: '',
                pickupContactPhone: '',
                dropContactName: '',
                dropContactPhone: '',
              });
              setPickupDate(tomorrow);
              setPickupLocation(null);
              setDropLocation(null);
              
              // Navigate to my loads screen
              router.push('/(tabs)/my-loads');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error posting load:', error);
      Alert.alert('Error', error.message || 'Failed to post load. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPickupDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Post New Load</Text>
        <Text style={styles.headerSubtitle}>Find reliable drivers for your shipment</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Load Weight (Tons) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5"
            value={formData.weight}
            onChangeText={(value) => handleInputChange('weight', value)}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your load (e.g., Electronics, Furniture, Raw materials)"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Pickup Location *</Text>
          <TouchableOpacity
            style={styles.mapPickerButton}
            onPress={() => {
              setLocationModalType('pickup');
              handleOpenMap();
            }}
          >
            <Text style={styles.mapPickerButtonText}>
              📍 {pickupLocation ? 'Change Pickup Location' : 'Select on Map'}
            </Text>
          </TouchableOpacity>
          {pickupLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                ✓ {pickupLocation.address}
              </Text>
              <Text style={styles.locationText}>
                ({pickupLocation.lat.toFixed(6)}, {pickupLocation.lng.toFixed(6)})
              </Text>
            </View>
          )}

          <Text style={styles.label}>Drop Location *</Text>
          <TouchableOpacity
            style={styles.mapPickerButton}
            onPress={() => {
              setLocationModalType('drop');
              handleOpenMap();
            }}
          >
            <Text style={styles.mapPickerButtonText}>
              📍 {dropLocation ? 'Change Drop Location' : 'Select on Map'}
            </Text>
          </TouchableOpacity>
          {dropLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                ✓ {dropLocation.address}
              </Text>
              <Text style={styles.locationText}>
                ({dropLocation.lat.toFixed(6)}, {dropLocation.lng.toFixed(6)})
              </Text>
            </View>
          )}

          <Text style={styles.label}>Pickup Date *</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              📅 {pickupDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={pickupDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={tomorrow}
            />
          )}

          <Text style={styles.label}>Budget (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 15000"
            value={formData.budget}
            onChangeText={(value) => handleInputChange('budget', value)}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Vehicle Type Required *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                'Select Vehicle Type',
                'Choose the type of vehicle required',
                [
                  { text: 'Truck', onPress: () => handleInputChange('vehicleTypeRequired', 'truck') },
                  { text: 'Mini Truck', onPress: () => handleInputChange('vehicleTypeRequired', 'mini-truck') },
                  { text: 'Medium Truck', onPress: () => handleInputChange('vehicleTypeRequired', 'medium') },
                  { text: 'Large Truck', onPress: () => handleInputChange('vehicleTypeRequired', 'large') },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            <Text style={styles.pickerText}>
              {formData.vehicleTypeRequired === 'truck' && '🚛 Truck'}
              {formData.vehicleTypeRequired === 'mini-truck' && '🚐 Mini Truck'}
              {formData.vehicleTypeRequired === 'medium' && '🚚 Medium Truck'}
              {formData.vehicleTypeRequired === 'large' && '🚛 Large Truck'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Pickup Contact Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter pickup contact person name"
            value={formData.pickupContactName}
            onChangeText={(value) => handleInputChange('pickupContactName', value)}
          />

          <Text style={styles.label}>Pickup Contact Phone *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit phone number"
            value={formData.pickupContactPhone}
            onChangeText={(value) => handleInputChange('pickupContactPhone', value)}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Drop Contact Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter drop contact person name"
            value={formData.dropContactName}
            onChangeText={(value) => handleInputChange('dropContactName', value)}
          />

          <Text style={styles.label}>Drop Contact Phone *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit phone number"
            value={formData.dropContactPhone}
            onChangeText={(value) => handleInputChange('dropContactPhone', value)}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Posting Load...' : 'Post Load'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>💡 Tips for Better Results</Text>
          <Text style={styles.tipText}>
            • Provide detailed and accurate descriptions{'\n'}
            • Set competitive but fair pricing{'\n'}
            • Use GPS to capture your current location{'\n'}
            • Plan your pickup dates in advance
          </Text>
        </View>
      </ScrollView>

      {/* Interactive Map Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        onRequestClose={() => {
          setShowLocationModal(false);
          setSelectedMapLocation(null);
        }}
      >
        <View style={styles.mapModalContainer}>
          {/* Map Header */}
          <View style={styles.mapHeader}>
            <Text style={styles.mapHeaderTitle}>
              Select {locationModalType === 'pickup' ? 'Pickup' : 'Drop'} Location
            </Text>
            <Text style={styles.mapHeaderSubtitle}>
              Tap on the map to select a location
            </Text>
          </View>

          {/* Interactive Map */}
          {Platform.OS !== 'web' && MapView ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              region={mapRegion}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              {selectedMapLocation && (
                <Marker
                  coordinate={{
                    latitude: selectedMapLocation.lat,
                    longitude: selectedMapLocation.lng,
                  }}
                  title={locationModalType === 'pickup' ? 'Pickup Location' : 'Drop Location'}
                  pinColor={locationModalType === 'pickup' ? '#4CAF50' : '#FF5722'}
                />
              )}
            </MapView>
          ) : (
            <View style={[styles.map, styles.webMapFallback]}>
              <Text style={styles.webMapText}>
                📍 Map view not available on web
              </Text>
              <Text style={styles.webMapSubtext}>
                Please use the address text input instead
              </Text>
              {selectedMapLocation && (
                <Text style={styles.webMapCoords}>
                  Selected: {selectedMapLocation.lat.toFixed(4)}, {selectedMapLocation.lng.toFixed(4)}
                </Text>
              )}
            </View>
          )}

          {/* Map Controls */}
          <View style={styles.mapControls}>
            {/* Current Location Button */}
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocationOnMap}
              disabled={loading}
            >
              <Text style={styles.currentLocationButtonText}>
                📍 {loading ? 'Getting location...' : 'My Location'}
              </Text>
            </TouchableOpacity>

            {/* Selected Coordinates Display */}
            {selectedMapLocation && (
              <View style={styles.coordinatesDisplay}>
                <Text style={styles.coordinatesText}>
                  📌 {selectedMapLocation.lat.toFixed(6)}, {selectedMapLocation.lng.toFixed(6)}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.mapActionButtons}>
              <TouchableOpacity
                style={styles.mapCancelButton}
                onPress={() => {
                  setShowLocationModal(false);
                  setSelectedMapLocation(null);
                }}
              >
                <Text style={styles.mapCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mapConfirmButton,
                  !selectedMapLocation && styles.mapConfirmButtonDisabled
                ]}
                onPress={handleConfirmMapLocation}
                disabled={!selectedMapLocation}
              >
                <Text style={styles.mapConfirmButtonText}>
                  Confirm Location
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tipContainer: {
    margin: 20,
    backgroundColor: '#f0f7ff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1ecf7',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E5D8A',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  mapPickerButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  mapPickerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  locationText: {
    fontSize: 14,
    color: '#2e7d32',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modalSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  commonLocationsContainer: {
    maxHeight: 200,
  },
  commonLocationItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commonLocationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  commonLocationCoords: {
    fontSize: 13,
    color: '#666',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  modalButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  modalCloseButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  // Map modal styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapHeader: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  mapHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  mapHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  currentLocationButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  currentLocationButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  coordinatesDisplay: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  mapActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mapCancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  mapConfirmButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapConfirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  mapConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  webMapFallback: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webMapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  webMapSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  webMapCoords: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 12,
    fontFamily: 'monospace',
  },
});
