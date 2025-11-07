import AuthService from '@/services/auth';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VendorSetupScreen() {
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    gstNumber: '',
  });
  const [loading, setLoading] = useState(false);
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

  // GST number validation (15 characters: 2 digits + 10 alphanumeric + 1 digit + 2 alphanumeric)
  const validateGSTNumber = (gstNumber: string): boolean => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber.toUpperCase()) && gstNumber.length === 15;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'gstNumber') {
      // Auto-format GST number
      const cleanedValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      setFormData(prev => ({ ...prev, [field]: cleanedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Form validation state
  const isFormValid = () => {
    const { name, businessName, gstNumber } = formData;
    return (
      name.trim().length > 0 &&
      businessName.trim().length > 0 &&
      validateGSTNumber(gstNumber)
    );
  };

  const validateForm = () => {
    const { name, businessName, gstNumber } = formData;
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    
    if (!businessName.trim()) {
      Alert.alert('Error', 'Please enter your business name');
      return false;
    }
    
    if (!gstNumber.trim()) {
      Alert.alert('Error', 'Please enter your GST number');
      return false;
    }
    
    if (!validateGSTNumber(gstNumber)) {
      Alert.alert('Invalid GST Number', 'Please enter a valid 15-character GST number (e.g., 27AABCU9603R1ZW)');
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
        businessName: formData.businessName,
        gstNumber: formData.gstNumber.toUpperCase(),
      };

      console.log('🏢 Vendor Setup - Form data:', formData);
      console.log('🏢 Vendor Setup - Additional data:', additionalData);
      console.log('🏢 Vendor Setup - Registration data:', registrationData);

      await authService.registerWithOTP(
        registrationData.phone,
        registrationData.otp,
        'vendor',
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
      console.error('Vendor registration error:', error);
      Alert.alert('Error', 'Failed to complete registration. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Vendor Setup</Text>
        <Text style={styles.subtitle}>Complete your business profile</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
          />

          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your business name"
            value={formData.businessName}
            onChangeText={(value) => handleInputChange('businessName', value)}
          />

          <Text style={styles.label}>GST Number *</Text>
          <TextInput
            style={[
              styles.input,
              formData.gstNumber.length > 0 && !validateGSTNumber(formData.gstNumber) && styles.inputError,
              formData.gstNumber.length > 0 && validateGSTNumber(formData.gstNumber) && styles.inputSuccess
            ]}
            placeholder="e.g., 27AABCU9603R1ZW"
            value={formData.gstNumber}
            onChangeText={(value) => handleInputChange('gstNumber', value)}
            autoCapitalize="characters"
            maxLength={15}
          />
          <Text style={styles.helperText}>15-character GST identification number</Text>
          {formData.gstNumber.length > 0 && !validateGSTNumber(formData.gstNumber) && (
            <Text style={styles.errorText}>Invalid GST number format</Text>
          )}
          {formData.gstNumber.length > 0 && validateGSTNumber(formData.gstNumber) && (
            <Text style={styles.successText}>✓ Valid GST number</Text>
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
          <Text style={styles.infoTitle}>🚀 Whats Next?</Text>
          <Text style={styles.infoText}>
            • Upload business documents for verification{'\n'}
            • Create your first load posting{'\n'}
            • Find reliable drivers in your area{'\n'}
            • Track shipments in real-time
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>✨ Vendor Benefits</Text>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>AI-powered driver matching</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>Real-time shipment tracking</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>💳</Text>
            <Text style={styles.featureText}>Secure payment processing</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>⭐</Text>
            <Text style={styles.featureText}>Driver ratings & reviews</Text>
          </View>
        </View>
      </View>
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
    marginBottom: 20,
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
  featuresContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});
