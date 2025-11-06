import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number | string;
  loadId: string;
  onPaymentComplete?: () => void;
}

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

export default function PaymentModal({
  visible,
  onClose,
  amount,
  loadId,
  onPaymentComplete,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);

  // Safely convert amount to number
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount?.toString() || '0') || 0;

  // UPI state
  const [upiId, setUpiId] = useState('');

  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    // Validation
    if (selectedMethod === 'upi' && !upiId) {
      Alert.alert('Error', 'Please enter UPI ID');
      return;
    }

    if (selectedMethod === 'card') {
      if (!cardNumber || !cardName || !expiryDate || !cvv) {
        Alert.alert('Error', 'Please fill all card details');
        return;
      }
    }

    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      Alert.alert(
        'Payment Successful! 🎉',
        `₹${numericAmount.toFixed(2)} has been paid successfully.\n\n⚠️ Note: This is a demo payment. Real payment integration will be added soon.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onPaymentComplete?.();
              onClose();
            },
          },
        ]
      );
    }, 2000);
  };

  const renderPaymentMethod = (method: PaymentMethod, icon: string, label: string) => {
    const isSelected = selectedMethod === method;
    return (
      <TouchableOpacity
        style={[styles.methodCard, isSelected && styles.methodCardSelected]}
        onPress={() => setSelectedMethod(method)}
      >
        <Text style={styles.methodIcon}>{icon}</Text>
        <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>
          {label}
        </Text>
        {isSelected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
      </TouchableOpacity>
    );
  };

  const renderPaymentForm = () => {
    switch (selectedMethod) {
      case 'upi':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Enter UPI ID</Text>
            <TextInput
              style={styles.input}
              placeholder="example@upi"
              placeholderTextColor="#999"
              value={upiId}
              onChangeText={setUpiId}
              keyboardType="default"
              autoCapitalize="none"
            />
            <View style={styles.popularUpiContainer}>
              <Text style={styles.popularUpiTitle}>Popular UPI Apps:</Text>
              <View style={styles.upiApps}>
                <TouchableOpacity style={styles.upiAppButton}>
                  <Text style={styles.upiAppText}>📱 Google Pay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.upiAppButton}>
                  <Text style={styles.upiAppText}>💳 PhonePe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.upiAppButton}>
                  <Text style={styles.upiAppText}>🏦 Paytm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 'card':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Card Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Card Number (4111 1111 1111 1111)"
              placeholderTextColor="#999"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="number-pad"
              maxLength={19}
            />
            <TextInput
              style={styles.input}
              placeholder="Cardholder Name"
              placeholderTextColor="#999"
              value={cardName}
              onChangeText={setCardName}
              autoCapitalize="words"
            />
            <View style={styles.cardRow}>
              <TextInput
                style={[styles.input, styles.cardRowInput]}
                placeholder="MM/YY"
                placeholderTextColor="#999"
                value={expiryDate}
                onChangeText={setExpiryDate}
                keyboardType="number-pad"
                maxLength={5}
              />
              <TextInput
                style={[styles.input, styles.cardRowInput]}
                placeholder="CVV"
                placeholderTextColor="#999"
                value={cvv}
                onChangeText={setCvv}
                keyboardType="number-pad"
                maxLength={3}
                secureTextEntry
              />
            </View>
            <View style={styles.cardLogos}>
              <Text style={styles.cardLogo}>💳 Visa</Text>
              <Text style={styles.cardLogo}>💳 Mastercard</Text>
              <Text style={styles.cardLogo}>💳 RuPay</Text>
            </View>
          </View>
        );

      case 'netbanking':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Select Bank</Text>
            <TouchableOpacity style={styles.bankOption}>
              <Text style={styles.bankText}>🏦 State Bank of India</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bankOption}>
              <Text style={styles.bankText}>🏦 HDFC Bank</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bankOption}>
              <Text style={styles.bankText}>🏦 ICICI Bank</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bankOption}>
              <Text style={styles.bankText}>🏦 Axis Bank</Text>
            </TouchableOpacity>
          </View>
        );

      case 'wallet':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Select Wallet</Text>
            <TouchableOpacity style={styles.bankOption}>
              <Text style={styles.bankText}>💰 Paytm Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bankOption}>
              <Text style={styles.bankText}>💰 PhonePe Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bankOption}>
              <Text style={styles.bankText}>💰 Amazon Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bankOption}>
              <Text style={styles.bankText}>💰 Mobikwik</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Payment</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Display */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amount}>₹{numericAmount.toFixed(2)}</Text>
              <Text style={styles.loadId}>Load ID: {loadId?.slice(0, 8) || 'N/A'}</Text>
            </View>

            {/* Demo Badge */}
            <View style={styles.demoBadge}>
              <Text style={styles.demoText}>⚠️ DEMO MODE - No real money will be charged</Text>
            </View>

            {/* Payment Methods */}
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            <View style={styles.methodsGrid}>
              {renderPaymentMethod('upi', '📱', 'UPI')}
              {renderPaymentMethod('card', '💳', 'Card')}
              {renderPaymentMethod('netbanking', '🏦', 'Net Banking')}
              {renderPaymentMethod('wallet', '💰', 'Wallet')}
            </View>

            {/* Payment Form */}
            {selectedMethod && renderPaymentForm()}

            {/* Pay Button */}
            {selectedMethod && (
              <TouchableOpacity
                style={[styles.payButton, processing && styles.payButtonDisabled]}
                onPress={handlePayment}
                disabled={processing}
              >
                <Text style={styles.payButtonText}>
                  {processing ? 'Processing...' : `Pay ₹${numericAmount.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Security Info */}
            <View style={styles.securityInfo}>
              <Text style={styles.securityText}>🔒 Your payment is secure and encrypted</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#6B7280',
  },
  amountContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  loadId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  demoBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  demoText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  methodCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4A90E2',
  },
  methodIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  methodLabelSelected: {
    color: '#4A90E2',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  formContainer: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardRowInput: {
    flex: 1,
  },
  cardLogos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  cardLogo: {
    fontSize: 12,
    color: '#6B7280',
  },
  popularUpiContainer: {
    marginTop: 8,
  },
  popularUpiTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  upiApps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  upiAppButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upiAppText: {
    fontSize: 13,
    color: '#4B5563',
  },
  bankOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  securityInfo: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
});
