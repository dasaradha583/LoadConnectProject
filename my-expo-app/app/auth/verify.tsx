import AuthService from '@/services/auth';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VerifyScreen() {
  const { phone, username, name, userType, mode } = useLocalSearchParams();
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  // Determine if this is sign-in or registration mode
  const isSignIn = mode === 'signin';
  
  // Create refs for each input
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    // Only allow single digit
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    
    const newOtpValues = [...otpValues];
    newOtpValues[index] = digit;
    setOtpValues(newOtpValues);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // Auto-submit when all 6 digits are entered
    if (digit && index === 5) {
      const completeCode = [...newOtpValues];
      completeCode[index] = digit;
      const verificationCode = completeCode.join('');
      
      if (verificationCode.length === 6) {
        setTimeout(() => {
          handleVerifyWithCode(verificationCode);
        }, 300);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpValues[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const handleVerifyWithCode = async (code: string) => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);
    
    try {
      const authService = AuthService.getInstance();
      
      if (isSignIn) {
        // Handle sign-in flow
        await authService.signInWithOTP(phone as string, code);
        
        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        // Handle registration flow - verify OTP and navigate to setup
        if (!username || !name || !userType) {
          throw new Error('Missing registration data');
        }

        // For registration, we just need to verify the OTP is correct
        // The actual registration will happen in the setup screens
        if (code !== '123456') {
          throw new Error('Invalid OTP');
        }
        
        // Store registration data temporarily for use in setup screens
        const registrationData = {
          phone: phone as string,
          otp: code,
          username: username as string,
          name: name as string,
          userType: userType as string,
          verified: true
        };
        
        // Store in AsyncStorage for setup screens to use
        try {
          await AsyncStorage.setItem('registrationData', JSON.stringify(registrationData));
        } catch (error) {
          console.error('Error storing registration data:', error);
        }
        
        // Navigate to appropriate setup screen
        if (userType === 'driver') {
          router.replace('/auth/driver-setup');
        } else {
          router.replace('/auth/vendor-setup');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
      // Clear OTP on invalid code
      setOtpValues(['', '', '', '', '', '']);
      setFocusedIndex(0);
      inputRefs.current[0]?.focus();
    }
    
    setLoading(false);
  };

  const handleVerify = async () => {
    const verificationCode = otpValues.join('');
    await handleVerifyWithCode(verificationCode);
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    try {
      const authService = AuthService.getInstance();
      await authService.sendOTP(phone as string);
      
      // Clear current OTP and reset focus
      setOtpValues(['', '', '', '', '', '']);
      setFocusedIndex(0);
      inputRefs.current[0]?.focus();
      
      // Reset countdown
      setCountdown(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your phone\n\nFor testing, use OTP: 123456');
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };



  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Phone</Text>
        <Text style={styles.subtitle}>
          We&apos;ve sent a 6-digit code to{'\n'}
          <Text style={styles.phoneNumber}>{phone}</Text>
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Verification Code</Text>
          
          <View style={styles.otpContainer}>
            {otpValues.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  focusedIndex === index && styles.otpInputFocused,
                  digit.length > 0 && styles.otpInputFilled,
                  loading && styles.otpInputDisabled
                ]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                blurOnSubmit={false}
                editable={!loading}
              />
            ))}
          </View>
          
          {loading && (
            <Text style={styles.verifyingText}>🔐 Verifying your code...</Text>
          )}

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.disabledButton]}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, countdown > 0 && styles.disabledButton]}
            onPress={handleResendCode}
            disabled={countdown > 0}
          >
            <Text style={[styles.resendButtonText, countdown > 0 && styles.disabledText]}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Didn&apos;t receive the code? Check your spam folder or try resending.
          </Text>
          <Text style={styles.demoText}>
            💡 Demo: Use code &quot;123456&quot; to continue
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: 'space-between',
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
    lineHeight: 24,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#4A90E2',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    marginBottom: 32,
    fontWeight: '600',
  },
  // OTP Input Styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    backgroundColor: 'white',
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  otpInputFocused: {
    borderColor: '#4A90E2',
    borderWidth: 2,
    shadowColor: '#4A90E2',
    shadowOpacity: 0.3,
  },
  otpInputFilled: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff9',
  },
  otpInputDisabled: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  verifyingText: {
    fontSize: 16,
    color: '#4A90E2',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledText: {
    color: '#999',
  },
  helpContainer: {
    paddingBottom: 40,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  demoText: {
    fontSize: 14,
    color: '#4A90E2',
    textAlign: 'center',
    fontWeight: '500',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1ecf7',
  },
});
