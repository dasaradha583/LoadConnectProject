import { router } from 'expo-router';
import AuthService from '@/services/auth';
import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SignInScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const isPhoneValid = phoneNumber.length === 10 && /^[0-9]{10}$/.test(phoneNumber);

  const handlePhoneChange = (text: string) => {
    // Only allow digits and limit to 10 characters
    const cleanedText = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneNumber(cleanedText);
  };

  const handleSignIn = async () => {
    if (!isPhoneValid) {
      Alert.alert('Error', 'Please enter exactly 10 digits for your phone number');
      return;
    }

    setLoading(true);
    
    try {
      // Get AuthService instance
      const authService = AuthService.getInstance();
      
      // Send OTP and check if user exists
      const result = await authService.sendOTP(phoneNumber);
      
      // Check if user exists for sign-in
      if (!result.userExists) {
        // User doesn't exist, show message and redirect to register
        Alert.alert(
          'Account Not Found',
          'No account found with this phone number. Please create an account first.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Create Account',
              onPress: () => router.push('/auth/register')
            }
          ]
        );
        return;
      }
      
      // User exists, proceed with sign-in
      router.push({
        pathname: '/auth/verify',
        params: { phone: phoneNumber, mode: 'signin', userExists: result.userExists.toString() }
      });
      
      // Show development notice about test OTP (non-blocking)
      setTimeout(() => {
        Alert.alert(
          'OTP Sent (Development Mode)', 
          'For testing, use OTP: 123456\n\nIn production, you would receive an SMS.',
          [{ text: 'OK' }]
        );
      }, 100);
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your LoadConnect account</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[
              styles.input,
              phoneNumber.length > 0 && !isPhoneValid && styles.inputError,
              phoneNumber.length === 10 && isPhoneValid && styles.inputSuccess
            ]}
            placeholder="Enter 10 digit phone number"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            keyboardType="numeric"
            maxLength={10}
          />
          {phoneNumber.length > 0 && !isPhoneValid && (
            <Text style={styles.errorText}>Please enter exactly 10 digits</Text>
          )}
          {phoneNumber.length === 10 && isPhoneValid && (
            <Text style={styles.successText}>✓ Valid phone number</Text>
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              !isPhoneValid && styles.continueButtonDisabled
            ]}
            onPress={handleSignIn}
            disabled={!isPhoneValid || loading}
          >
            <Text style={[
              styles.continueButtonText,
              !isPhoneValid && styles.continueButtonTextDisabled
            ]}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.switchText}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.switchButton}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E5D8A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  inputSuccess: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  successText: {
    color: '#34C759',
    fontSize: 14,
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 30,
  },
  continueButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  switchText: {
    fontSize: 16,
    color: '#666',
  },
  switchButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 5,
  },
  devButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
