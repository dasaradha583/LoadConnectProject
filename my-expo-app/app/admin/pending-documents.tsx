import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/services/api';
import AuthService from '@/services/auth';

const { width } = Dimensions.get('window');

interface Document {
  id: string;
  documentType: string;
  documentNumber?: string;
  fileUrl: string;
  verificationStatus: string;
  uploadedAt: string;
  User: {
    id: string;
    name: string;
    username: string;
    userType: string;
  };
}

const DOCUMENT_LABELS: Record<string, string> = {
  driver_license: '🪪 Driving License',
  vehicle_rc: '🚛 Vehicle RC',
  gst_certificate: '📄 GST Certificate',
};

export default function PendingDocuments() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async () => {
    try {
      const authService = AuthService.getInstance();
      const token = await authService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/pending-documents?page=1&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
      setRefreshing(false);
    }
  };

  const handleVerify = async (doc: Document) => {
    Alert.alert(
      'Verify Document',
      `Verify ${DOCUMENT_LABELS[doc.documentType]} for ${doc.User.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              setActionLoading(true);
              const authService = AuthService.getInstance();
              const token = await authService.getToken();

              const response = await fetch(`${API_BASE_URL}/api/admin/verify-document/${doc.id}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Document verified successfully!');
                setShowImageModal(false);
                fetchPendingDocuments();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.message || 'Failed to verify document');
              }
            } catch (error) {
              console.error('Error verifying document:', error);
              Alert.alert('Error', 'Failed to verify document');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(true);
      const authService = AuthService.getInstance();
      const token = await authService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/reject-document/${selectedDoc.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Document rejected');
        setShowRejectModal(false);
        setShowImageModal(false);
        setRejectionReason('');
        setSelectedDoc(null);
        fetchPendingDocuments();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to reject document');
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
      Alert.alert('Error', 'Failed to reject document');
    } finally {
      setActionLoading(false);
    }
  };

  const renderDocumentCard = ({ item }: { item: Document }) => (
    <TouchableOpacity
      style={styles.docCard}
      onPress={() => {
        setSelectedDoc(item);
        setShowImageModal(true);
      }}
    >
      <View style={styles.docHeader}>
        <Text style={styles.docIcon}>
          {item.documentType === 'driver_license' ? '🪪' :
           item.documentType === 'vehicle_rc' ? '🚛' : '📄'}
        </Text>
        <View style={styles.docInfo}>
          <Text style={styles.docType}>
            {DOCUMENT_LABELS[item.documentType] || item.documentType}
          </Text>
          <Text style={styles.docNumber}>
            {item.documentNumber || 'No number provided'}
          </Text>
        </View>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.User.name}</Text>
        <View style={styles.userTypeBadge}>
          <Text style={styles.userTypeText}>
            {item.User.userType.toUpperCase()}
          </Text>
        </View>
      </View>

      {item.fileUrl && !item.fileUrl.endsWith('.pdf') && (
        <Image
          source={{ uri: `${API_BASE_URL}${item.fileUrl}` }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}

      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => {
          setSelectedDoc(item);
          setShowImageModal(true);
        }}
      >
        <Text style={styles.viewButtonText}>👁️ View & Verify</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Documents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pending Documents</Text>
        <Text style={styles.count}>{documents.length} documents</Text>
      </View>

      <FlatList
        data={documents}
        renderItem={renderDocumentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchPendingDocuments();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyText}>No pending documents</Text>
            <Text style={styles.emptySubtext}>All documents verified</Text>
          </View>
        }
      />

      {/* Image Preview Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <View>
                <Text style={styles.imageModalTitle}>
                  {selectedDoc && DOCUMENT_LABELS[selectedDoc.documentType]}
                </Text>
                <Text style={styles.imageModalUser}>
                  {selectedDoc?.User.name}
                </Text>
                <Text style={styles.imageModalNumber}>
                  {selectedDoc?.documentNumber || 'No number'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowImageModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedDoc?.fileUrl && !selectedDoc.fileUrl.endsWith('.pdf') && (
              <Image
                source={{ uri: `${API_BASE_URL}${selectedDoc.fileUrl}` }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}

            {selectedDoc?.fileUrl && selectedDoc.fileUrl.endsWith('.pdf') && (
              <View style={styles.pdfPlaceholder}>
                <Text style={styles.pdfIcon}>📄</Text>
                <Text style={styles.pdfText}>PDF Document</Text>
              </View>
            )}

            <View style={styles.imageModalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => {
                  setShowImageModal(false);
                  setTimeout(() => setShowRejectModal(true), 300);
                }}
                disabled={actionLoading}
              >
                <Text style={styles.actionBtnText}>✗ Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.verifyBtn]}
                onPress={() => selectedDoc && handleVerify(selectedDoc)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionBtnText}>✓ Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Document</Text>
            <Text style={styles.modalSubtitle}>
              {selectedDoc && DOCUMENT_LABELS[selectedDoc.documentType]}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
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
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 12,
  },
  docCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    maxWidth: (width - 40) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  docIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  docInfo: {
    flex: 1,
  },
  docType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  docNumber: {
    fontSize: 10,
    color: '#6B7280',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userName: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  userTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
  },
  userTypeText: {
    fontSize: 9,
    color: '#1E40AF',
    fontWeight: '600',
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  viewButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
  },
  imageModalContent: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  imageModalUser: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 2,
  },
  imageModalNumber: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  fullImage: {
    flex: 1,
    width: '100%',
  },
  pdfPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  pdfText: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  imageModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  verifyBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalRejectButton: {
    backgroundColor: '#EF4444',
  },
  modalCancelText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  modalRejectText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
