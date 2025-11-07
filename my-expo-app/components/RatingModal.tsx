import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review: string, ratingAspects: any) => Promise<void>;
  driverName?: string;
  vendorName?: string;
  userType?: 'driver' | 'vendor';
}

export default function RatingModal({ 
  visible, 
  onClose, 
  onSubmit, 
  driverName,
  vendorName,
  userType = 'vendor' // Default to vendor rating driver
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Individual aspect ratings
  const [punctuality, setPunctuality] = useState(0);
  const [behavior, setBehavior] = useState(0);
  const [vehicleCondition, setVehicleCondition] = useState(0);
  const [careOfGoods, setCareOfGoods] = useState(0);

  // Determine who is being rated
  const ratingTarget = userType === 'driver' ? 'Vendor' : 'Driver';
  const targetName = userType === 'driver' ? vendorName : driverName;

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const ratingAspects = {
        punctuality: punctuality || undefined,
        behavior: behavior || undefined,
        vehicleCondition: vehicleCondition || undefined,
        careOfGoods: careOfGoods || undefined,
      };

      await onSubmit(rating, review, ratingAspects);
      
      // Reset form
      setRating(0);
      setReview('');
      setPunctuality(0);
      setBehavior(0);
      setVehicleCondition(0);
      setCareOfGoods(0);
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, onChange: (val: number) => void, size: number = 40) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            activeOpacity={0.7}
          >
            <Text style={[styles.starIcon, { fontSize: size }]}>
              {star <= value ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <Text style={styles.modalTitle}>Rate {ratingTarget}</Text>
            {targetName && (
              <Text style={styles.driverName}>{targetName}</Text>
            )}
            <Text style={styles.subtitle}>
              How was your experience with this {ratingTarget.toLowerCase()}?
            </Text>

            {/* Overall Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overall Rating *</Text>
              {renderStars(rating, setRating, 50)}
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : 'Very Poor'}
                </Text>
              )}
            </View>

            {/* Detailed Ratings */}
            <Text style={styles.detailedTitle}>Rate Specific Aspects (Optional)</Text>

            {/* Show detailed ratings only when vendor is rating driver */}
            {userType === 'vendor' && (
              <>
                <View style={styles.aspectSection}>
                  <Text style={styles.aspectLabel}>Punctuality</Text>
                  {renderStars(punctuality, setPunctuality, 32)}
                </View>

                <View style={styles.aspectSection}>
                  <Text style={styles.aspectLabel}>Behavior & Professionalism</Text>
                  {renderStars(behavior, setBehavior, 32)}
                </View>

                <View style={styles.aspectSection}>
                  <Text style={styles.aspectLabel}>Vehicle Condition</Text>
                  {renderStars(vehicleCondition, setVehicleCondition, 32)}
                </View>

                <View style={styles.aspectSection}>
                  <Text style={styles.aspectLabel}>Care of Goods</Text>
                  {renderStars(careOfGoods, setCareOfGoods, 32)}
                </View>
              </>
            )}

            {/* Review Text */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Write a Review (Optional)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={review}
                onChangeText={setReview}
                maxLength={500}
              />
              <Text style={styles.charCount}>{review.length}/500</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (rating === 0 || submitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </Text>
              </TouchableOpacity>
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
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 18,
    color: '#4A90E2',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  starIcon: {
    fontSize: 40,
    color: '#FFA500',
  },
  ratingText: {
    fontSize: 16,
    color: '#4A90E2',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  detailedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
  aspectSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  aspectLabel: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '500',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
