import AuthService from '@/services/auth';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DriverSetupScreen() {
  const [formData, setFormData] = useState({
    name: '',
    licenseNumber: '',
    vehicleType: '',
    vehicleCapacity: '',
    vehicleNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [showVehicleTypePicker, setShowVehicleTypePicker] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Load registration data from storage on component mount
  useEffect(() => {
    const loadRegistrationData = async () => {
      try {
        const storedData = await AsyncStorage.getItem('registrationData');
        if (storedData) {
          const data = JSON.parse(storedData);
          setRegistrationData(data);
          // Pre-fill the name field from registration
          setFormData(prev => ({ ...prev, name: data.name || '' }));
        } else {
          // No registration data found, redirect to register
          Alert.alert('Error', 'Registration session expired. Please start over.');
          router.replace('/auth/register');
        }
      } catch (error) {
        console.error('Error loading registration data:', error);
        Alert.alert('Error', 'Registration session expired. Please start over.');
        router.replace('/auth/register');
      }
    };

    loadRegistrationData();
  }, []);

  // Form validation state
  const isFormValid = () => {
    const { name, licenseNumber, vehicleType, vehicleCapacity, vehicleNumber } = formData;
    return (
      name.trim().length > 0 &&
      licenseNumber.trim().length > 0 &&
      vehicleType.length > 0 &&
      vehicleCapacity.trim().length > 0 &&
      !isNaN(Number(vehicleCapacity)) &&
      Number(vehicleCapacity) > 0 &&
      validateVehicleNumber(vehicleNumber)
    );
  };

  const vehicleTypes = [
    { label: 'Select Vehicle Type', value: '' },
    { label: 'Mini Truck (1-2 Tons)', value: 'mini' },
    { label: 'Small Truck (3-5 Tons)', value: 'small' },
    { label: 'Medium Truck (6-10 Tons)', value: 'medium' },
    { label: 'Large Truck (10+ Tons)', value: 'large' },
    { label: 'Container Truck', value: 'container' },
    { label: 'Tanker', value: 'tanker' },
  ];

  // Vehicle registration validation (e.g., MH01AB1234)
  const validateVehicleNumber = (vehicleNumber: string): boolean => {
    const vehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{2}[0-9]{4}$/;
    return vehicleRegex.test(vehicleNumber.toUpperCase());
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'vehicleNumber') {
      // Auto-format and validate vehicle number
      const cleanedValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      setFormData(prev => ({ ...prev, [field]: cleanedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    const { name, licenseNumber, vehicleType, vehicleCapacity, vehicleNumber } = formData;
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    
    if (!licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter your license number');
      return false;
    }
    
    if (!vehicleType) {
      Alert.alert('Error', 'Please select your vehicle type');
      return false;
    }
    
    if (!vehicleCapacity.trim() || isNaN(Number(vehicleCapacity))) {
      Alert.alert('Error', 'Please enter a valid vehicle capacity');
      return false;
    }
    
    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter your vehicle number');
      return false;
    }
    
    if (!validateVehicleNumber(vehicleNumber)) {
      Alert.alert(
        'Invalid Vehicle Number', 
        'Please enter a valid Indian vehicle registration number (e.g., MH01AB1234)\nFormat: 2 letters + 1-2 numbers + 2 letters + 4 numbers'
      );
      return false;
    }
    
    return true;
  };

  const handleComplete = async () => {
    if (!validateForm()) return;
    
    if (!registrationData) {
      Alert.alert('Error', 'Registration session expired. Please start over.');
      router.replace('/auth/register');
      return;
    }
    
    setLoading(true);
    
    try {
      const authService = AuthService.getInstance();
      
      // Register with backend using all required fields
      const additionalData = {
        name: formData.name,
        username: registrationData.username,
        licenseNumber: formData.licenseNumber,
        vehicleType: formData.vehicleType,
        vehicleCapacity: Number(formData.vehicleCapacity),
        vehicleNumber: formData.vehicleNumber.toUpperCase(),
      };

      console.log('🚗 Driver Setup - Form data:', formData);
      console.log('🚗 Driver Setup - Additional data:', additionalData);
      console.log('🚗 Driver Setup - Registration data:', registrationData);

      await authService.registerWithOTP(
        registrationData.phone,
        registrationData.otp,
        'driver',
        additionalData
      );
      
      // Clear registration data from storage
      try {
        await AsyncStorage.removeItem('registrationData');
      } catch (error) {
        console.error('Error clearing registration data:', error);
      }
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Driver registration error:', error);
      Alert.alert('Error', 'Failed to complete registration. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Driver Setup</Text>
        <Text style={styles.subtitle}>Complete your profile to start earning</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
          />

          <Text style={styles.label}>License Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your license number"
            value={formData.licenseNumber}
            onChangeText={(value) => handleInputChange('licenseNumber', value)}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Vehicle Type *</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.vehicleType}
                onValueChange={(value) => handleInputChange('vehicleType', value)}
                style={styles.picker}
              >
                {vehicleTypes.map((type) => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} />
                ))}
              </Picker>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.input,
                styles.dropdownInput
              ]}
              onPress={() => setShowVehicleTypePicker(true)}
            >
              <Text style={[
                styles.dropdownText,
                !formData.vehicleType && styles.placeholderText
              ]}>
                {formData.vehicleType 
                  ? vehicleTypes.find(type => type.value === formData.vehicleType)?.label 
                  : 'Select Vehicle Type'
                }
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Vehicle Capacity (Tons) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5"
            value={formData.vehicleCapacity}
            onChangeText={(value) => handleInputChange('vehicleCapacity', value)}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Vehicle Number *</Text>
          <TextInput
            style={[
              styles.input,
              formData.vehicleNumber.length > 0 && !validateVehicleNumber(formData.vehicleNumber) && styles.inputError,
              formData.vehicleNumber.length > 0 && validateVehicleNumber(formData.vehicleNumber) && styles.inputSuccess
            ]}
            placeholder="e.g., MH01AB1234"
            value={formData.vehicleNumber}
            onChangeText={(value) => handleInputChange('vehicleNumber', value)}
            autoCapitalize="characters"
            maxLength={10}
          />
          <Text style={styles.helperText}>Format: 2 letters + 1-2 numbers + 2 letters + 4 numbers</Text>
          {formData.vehicleNumber.length > 0 && !validateVehicleNumber(formData.vehicleNumber) && (
            <Text style={styles.errorText}>Invalid vehicle registration format</Text>
          )}
          {formData.vehicleNumber.length > 0 && validateVehicleNumber(formData.vehicleNumber) && (
            <Text style={styles.successText}>✓ Valid registration number</Text>
          )}

          <TouchableOpacity
            style={[
              styles.completeButton, 
              (!isFormValid() || loading) && styles.disabledButton
            ]}
            onPress={handleComplete}
            disabled={!isFormValid() || loading}
          >
            <Text style={styles.completeButtonText}>
              {loading ? 'Setting up...' : 'Complete Setup'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>📋 What&apos;s Next?</Text>
          <Text style={styles.infoText}>
            • Upload your license photo for verification{'\n'}
            • Enable location services for better matches{'\n'}
            • Start browsing available loads nearby
          </Text>
        </View>
      </View>

      {/* Vehicle Type Picker Modal for Mobile */}
      <Modal
        visible={showVehicleTypePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVehicleTypePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVehicleTypePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle Type</Text>
              <TouchableOpacity onPress={() => setShowVehicleTypePicker(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {vehicleTypes.filter(type => type.value !== '').map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.modalOption,
                    formData.vehicleType === type.value && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    handleInputChange('vehicleType', type.value);
                    setShowVehicleTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.vehicleType === type.value && styles.modalOptionTextSelected
                  ]}>
                    {type.label}
                  </Text>
                  {formData.vehicleType === type.value && (
                    <Text style={styles.modalCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E5D8A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  inputSuccess: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff9',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginBottom: 12,
    marginLeft: 4,
  },
  successText: {
    fontSize: 12,
    color: '#28a745',
    marginBottom: 12,
    marginLeft: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  completeButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#f0f7ff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1ecf7',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E5D8A',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Mobile dropdown styles
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    fontSize: 20,
    color: '#666',
    width: 30,
    height: 30,
    textAlign: 'center',
    lineHeight: 30,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalOptionTextSelected: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  modalCheckmark: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
});
