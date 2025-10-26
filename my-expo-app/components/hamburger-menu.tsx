import { IconSymbol } from '@/components/ui/icon-symbol';
import AuthService from '@/services/auth';
import { UserType } from '@/types/user';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function HamburgerMenu({ visible, onClose }: HamburgerMenuProps) {
  const [userType, setUserType] = useState<UserType | null>(null);

  useEffect(() => {
    getUserType();
  }, []);

  const getUserType = async () => {
    const authService = AuthService.getInstance();
    const user = await authService.getCurrentUser();
    if (user) {
      setUserType(user.type);
    }
  };

  const navigateToScreen = (screenName: string) => {
    onClose();
    // Small delay to allow modal to close before navigation
    setTimeout(() => {
      router.push(`/(tabs)/${screenName}` as any);
    }, 100);
  };

  const menuItems = userType === 'driver' ? [
    {
      title: 'Available Loads',
      icon: 'shippingbox.fill',
      screen: 'loads',
      description: 'Browse available loads to haul'
    },
    {
      title: 'My Loads',
      icon: 'truck.box.fill',
      screen: 'my-loads',
      description: 'View your active and completed loads'
    },
    {
      title: 'Earnings',
      icon: 'banknote.fill',
      screen: 'earnings',
      description: 'Track your earnings and payments'
    },
    {
      title: 'Trip Tracking',
      icon: 'truck.box.fill',
      screen: 'trip-tracking',
      description: 'Track your current trip'
    },
  ] : [
    {
      title: 'Post Load',
      icon: 'plus.circle.fill',
      screen: 'post-load',
      description: 'Create new load posting'
    },
    {
      title: 'My Loads',
      icon: 'list.clipboard.fill',
      screen: 'my-loads',
      description: 'Manage your posted loads'
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Navigation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.menuContent}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => navigateToScreen(item.screen)}
              >
                <View style={styles.menuItemIcon}>
                  <IconSymbol name={item.icon as any} size={24} color="#4A90E2" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  menuContent: {
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginVertical: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});
