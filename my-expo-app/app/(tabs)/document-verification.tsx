import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AuthService from '@/services/auth';
import { API_BASE_URL } from '@/services/api';

interface Document {
  id: string;
  documentType: string;
  documentNumber?: string;
  fileUrl: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  uploadedAt: string;
  verifiedAt?: string;
}

interface DocumentType {
  key: string;
  label: string;
  required: boolean;
  icon: string;
  placeholder: string;
}

// Updated document types based on new requirements
const DRIVER_DOCUMENTS: DocumentType[] = [
  { 
    key: 'driver_license', 
    label: 'Driving License', 
    required: true, 
    icon: '🪪',
    placeholder: 'Enter License Number'
  },
  { 
    key: 'vehicle_rc', 
    label: 'Vehicle RC (C Book)', 
    required: true, 
    icon: '🚛',
    placeholder: 'Enter RC Number'
  },
];

const VENDOR_DOCUMENTS: DocumentType[] = [
  { 
    key: 'gst_certificate', 
    label: 'GST Certificate', 
    required: true, 
    icon: '📄',
    placeholder: 'Enter GSTIN'
  },
];

export default function DocumentVerification() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [userType, setUserType] = useState<'driver' | 'vendor'>('driver');
  const [documentNumbers, setDocumentNumbers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser();
      setUserType(user?.type || 'driver');
      
      const response = await fetch(`${API_BASE_URL}/api/documents/user/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${await authService.getToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (documentType: string) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(documentType, result.assets[0].uri, 'image/jpeg');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadDocument = async (documentType: string, uri: string, mimeType: string) => {
    try {
      // Validate document number if required
      const documentNumber = documentNumbers[documentType];
      if (!documentNumber || documentNumber.trim() === '') {
        Alert.alert('Required', 'Please enter the document number before uploading');
        return;
      }

      setUploading(documentType);
      
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser();
      
      const formData = new FormData();
      
      // Get file extension
      const uriParts = uri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      
      formData.append('document', {
        uri,
        type: mimeType,
        name: `${documentType}_${Date.now()}.${fileExtension}`,
      } as any);
      
      formData.append('userId', user?.id || '');
      formData.append('documentType', documentType);
      formData.append('documentNumber', documentNumber);

      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await authService.getToken()}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Document uploaded successfully! Awaiting admin verification.');
        await fetchDocuments();
        // Clear document number after successful upload
        setDocumentNumbers(prev => ({ ...prev, [documentType]: '' }));
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', error.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'Verified ✅';
      case 'rejected': return 'Rejected ❌';
      default: return 'Pending 🔍';
    }
  };

  const getDocumentStatus = (docType: string) => {
    return documents.find(doc => doc.documentType === docType);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  const documentTypes = userType === 'driver' ? DRIVER_DOCUMENTS : VENDOR_DOCUMENTS;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Document Verification</Text>
        <Text style={styles.subtitle}>
          {userType === 'driver' ? 'Driver Documents' : 'Vendor Documents'}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📋 Upload the following documents for verification. Admin will review and approve them.
        </Text>
      </View>

      <View style={styles.documentsContainer}>
        {documentTypes.map((docType) => {
          const uploadedDoc = getDocumentStatus(docType.key);
          const isUploading = uploading === docType.key;

          return (
            <View key={docType.key} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <Text style={styles.documentIcon}>{docType.icon}</Text>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentLabel}>{docType.label}</Text>
                  <Text style={[styles.documentRequired, { color: docType.required ? '#EF4444' : '#6B7280' }]}>
                    {docType.required ? 'Required *' : 'Optional'}
                  </Text>
                </View>
                {uploadedDoc && (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(uploadedDoc.verificationStatus) }]}>
                    <Text style={styles.statusBadgeText}>
                      {getStatusText(uploadedDoc.verificationStatus)}
                    </Text>
                  </View>
                )}
              </View>

              {uploadedDoc && uploadedDoc.rejectionReason && (
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                  <Text style={styles.rejectionText}>{uploadedDoc.rejectionReason}</Text>
                  <Text style={styles.rejectionHint}>Please re-upload a valid document</Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={docType.placeholder}
                  value={documentNumbers[docType.key] || uploadedDoc?.documentNumber || ''}
                  onChangeText={(text) => setDocumentNumbers(prev => ({ ...prev, [docType.key]: text }))}
                  editable={!uploadedDoc || uploadedDoc.verificationStatus === 'rejected'}
                />
              </View>

              {uploadedDoc && uploadedDoc.verificationStatus !== 'rejected' ? (
                <View style={styles.uploadedContainer}>
                  {uploadedDoc.fileUrl.endsWith('.pdf') ? (
                    <View style={styles.pdfPlaceholder}>
                      <Text style={styles.pdfText}>📄 PDF Document</Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: `${API_BASE_URL}${uploadedDoc.fileUrl}` }}
                      style={styles.documentImage}
                      resizeMode="cover"
                    />
                  )}
                  <TouchableOpacity
                    style={[styles.reuploadButton, uploadedDoc.verificationStatus === 'verified' && styles.verifiedButton]}
                    onPress={() => uploadedDoc.verificationStatus !== 'verified' && pickImage(docType.key)}
                    disabled={uploadedDoc.verificationStatus === 'verified'}
                  >
                    <Text style={styles.reuploadButtonText}>
                      {uploadedDoc.verificationStatus === 'verified' ? '✓ Verified' : '↻ Replace'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                    onPress={() => pickImage(docType.key)}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.uploadButtonText}>📷 Upload Photo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ℹ️ All documents will be reviewed by admin within 24-48 hours
        </Text>
        <Text style={styles.footerText}>
          🔒 Your documents are secured and encrypted
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  documentsContainer: {
    padding: 16,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  documentRequired: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectionBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  rejectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: '#991B1B',
    marginBottom: 6,
  },
  rejectionHint: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  uploadedContainer: {
    alignItems: 'center',
  },
  documentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  pdfPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  pdfText: {
    fontSize: 16,
    color: '#6B7280',
  },
  reuploadButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  verifiedButton: {
    backgroundColor: '#10B981',
  },
  reuploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButtonsContainer: {
    gap: 8,
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
