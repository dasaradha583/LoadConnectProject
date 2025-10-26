import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';

// Conditionally import MapView only for native platforms
let MapView: any = null;
let Marker: any = null;
let Region: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Region = Maps.Region;
}

interface MapPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
  initialLocation?: { lat: number; lng: number };
  title: string;
}

export default function MapPicker({
  visible,
  onClose,
  onSelectLocation,
  initialLocation,
  title,
}: MapPickerProps) {
  const [region, setRegion] = useState<any>({
    latitude: initialLocation?.lat || 12.9716, // Default to Bangalore
    longitude: initialLocation?.lng || 77.5946,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [markerPosition, setMarkerPosition] = useState({
    latitude: initialLocation?.lat || 12.9716,
    longitude: initialLocation?.lng || 77.5946,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    if (initialLocation) {
      setRegion({
        latitude: initialLocation.lat,
        longitude: initialLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setMarkerPosition({
        latitude: initialLocation.lat,
        longitude: initialLocation.lng,
      });
    }
  }, [initialLocation]);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setMarkerPosition(newPosition);
      setRegion({
        ...newPosition,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      
      setIsLoadingLocation(false);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Unable to get current location. Please try again.');
      setIsLoadingLocation(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setMarkerPosition(coordinate);
  };

  const handleConfirm = () => {
    // Generate a simple address string from coordinates
    const address = `${markerPosition.latitude.toFixed(6)}, ${markerPosition.longitude.toFixed(6)}`;
    
    onSelectLocation({
      lat: markerPosition.latitude,
      lng: markerPosition.longitude,
      address,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Map */}
        {Platform.OS !== 'web' && MapView ? (
          <>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={setRegion}
              onPress={handleMapPress}
            >
              <Marker
                coordinate={markerPosition}
                draggable
                onDragEnd={(e: any) => setMarkerPosition(e.nativeEvent.coordinate)}
              />
            </MapView>

            {/* Location Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                📍 {markerPosition.latitude.toFixed(6)}, {markerPosition.longitude.toFixed(6)}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.map, styles.webMapFallback]}>
            <Text style={styles.webMapText}>📍 Map not available on web</Text>
            <Text style={styles.webMapSubtext}>
              Please enter address manually in the form
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.currentLocationButtonText}>📍 Current Location</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>✓ Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  currentLocationButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  currentLocationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
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
});
