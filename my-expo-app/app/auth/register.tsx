import { UserType } from '@/types/user';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function RegisterScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);

  const isPhoneValid = phoneNumber.length === 10 && /^[0-9]{10}$/.test(phoneNumber);
  const isUsernameValid = username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
  const isNameValid = name.trim().length >= 2;
  const isFormValid = isPhoneValid && isUsernameValid && isNameValid && userType !== null;

  const handlePhoneChange = (text: string) => {
    // Only allow digits and limit to 10 characters
    const cleanedText = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneNumber(cleanedText);
  };

  const handleUsernameChange = (text: string) => {
    // Only allow alphanumeric and underscore, limit to 20 characters
    const cleanedText = text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setUsername(cleanedText);
  };

  const handleRegister = async () => {
    if (!isPhoneValid) {
      Alert.alert('Error', 'Please enter exactly 10 digits for your phone number');
      return;
    }

    if (!isUsernameValid) {
      Alert.alert('Error', 'Username must be at least 3 characters and contain only letters, numbers, and underscores');
      return;
    }

    if (!isNameValid) {
      Alert.alert('Error', 'Please enter your full name (at least 2 characters)');
      return;
    }

    if (!userType) {
      Alert.alert('Error', 'Please select your user type');
      return;
    }

    setLoading(true);
    
    try {
      // Import AuthService dynamically to avoid circular imports
      const AuthService = (await import('@/services/auth')).default.getInstance();
      
      // Send OTP and check if user already exists
      const result = await AuthService.sendOTP(phoneNumber);
      
      // Check if user already exists for registration
      if (result.userExists) {
        // User already exists, show message and redirect to sign-in
        Alert.alert(
          'Account Already Exists',
          'An account with this phone number already exists. Please sign in instead.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Sign In',
              onPress: () => router.push('/auth/signin')
            }
          ]
        );
        return;
      }
      
      // User doesn't exist, proceed with registration
      router.push({
        pathname: '/auth/verify',
        params: { 
          phone: phoneNumber, 
          username: username,
          name: name,
          userType,
          mode: 'register', // Set mode to register
          userExists: result.userExists.toString()
        }
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join LoadConnect to start your journey</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[
              styles.input,
              name.length > 0 && !isNameValid && styles.inputError,
              name.length >= 2 && isNameValid && styles.inputSuccess
            ]}
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          {name.length > 0 && !isNameValid && (
            <Text style={styles.errorText}>Name must be at least 2 characters</Text>
          )}

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[
              styles.input,
              username.length > 0 && !isUsernameValid && styles.inputError,
              username.length >= 3 && isUsernameValid && styles.inputSuccess
            ]}
            placeholder="Choose a unique username"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            maxLength={20}
          />
          {username.length > 0 && !isUsernameValid && (
            <Text style={styles.errorText}>Username must be 3+ characters, letters, numbers, and _ only</Text>
          )}
          {username.length >= 3 && isUsernameValid && (
            <Text style={styles.successText}>✓ Valid username format</Text>
          )}

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

          <Text style={styles.label}>I am a:</Text>
          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'driver' && styles.userTypeButtonActive
              ]}
              onPress={() => setUserType('driver')}
            >
              <Text style={styles.userTypeIcon}>🚛</Text>
              <Text style={[
                styles.userTypeText,
                userType === 'driver' && styles.userTypeTextActive
              ]}>
                Driver
              </Text>
              <Text style={styles.userTypeDescription}>
                Transport goods and earn money
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'vendor' && styles.userTypeButtonActive
              ]}
              onPress={() => setUserType('vendor')}
            >
              <Text style={styles.userTypeIcon}>🏢</Text>
              <Text style={[
                styles.userTypeText,
                userType === 'vendor' && styles.userTypeTextActive
              ]}>
                Vendor
              </Text>
              <Text style={styles.userTypeDescription}>
                Ship goods efficiently
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.registerButton,
              (!isFormValid || loading) && styles.disabledButton
            ]}
            onPress={handleRegister}
            disabled={!isFormValid || loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Please wait...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
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
    paddingTop: 40,
    paddingBottom: 24,
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
    marginBottom: 40,
  },
  form: {
    marginBottom: 30,
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
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginBottom: 16,
    marginLeft: 4,
  },
  successText: {
    fontSize: 12,
    color: '#28a745',
    marginBottom: 16,
    marginLeft: 4,
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  userTypeButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  userTypeButtonActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#f0f7ff',
  },
  userTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userTypeTextActive: {
    color: '#4A90E2',
  },
  userTypeDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
