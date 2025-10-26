import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AuthService from '@/services/auth';
import { UserType } from '@/types/user';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserType();
  }, []);

  const getUserType = async () => {
    try {
      const authService = AuthService.getInstance();
      const user = await authService.getCurrentUser();
      console.log('TabLayout - Current user:', user);
      if (user) {
        setUserType(user.type);
      }
    } catch (error) {
      console.error('TabLayout - Error getting user type:', error);
    } finally {
      setLoading(false);
    }
  };

  // Custom header with hamburger menu button
  const CustomHeader = ({ title }: { title: string }) => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 15,
      backgroundColor: Colors[colorScheme ?? 'light'].background,
      borderBottomWidth: 1,
      borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault,
    }}>
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors[colorScheme ?? 'light'].text,
      }}>
        {title}
      </Text>
      <TouchableOpacity 
        onPress={() => setShowHamburgerMenu(true)}
        style={{
          padding: 8,
          borderRadius: 20,
          backgroundColor: Colors[colorScheme ?? 'light'].tint + '20',
        }}
      >
        <IconSymbol size={24} name="line.horizontal.3" color={Colors[colorScheme ?? 'light'].tint} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[colorScheme ?? 'light'].background }}>
        <Text style={{ fontSize: 16, color: Colors[colorScheme ?? 'light'].text }}>Loading...</Text>
      </View>
    );
  }

  if (!userType) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors[colorScheme ?? 'light'].background }}>
        <Text style={{ fontSize: 16, color: Colors[colorScheme ?? 'light'].text }}>Unable to load user data</Text>
      </View>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: true,
          tabBarButton: HapticTab,
          header: ({ route }) => (
            <CustomHeader 
              title={route.name === 'index' ? 'Home' : route.name === 'profile' ? 'Profile' : 'App'} 
            />
          ),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />

        {/* Hide other tabs but keep them accessible */}
        <Tabs.Screen
          name="document-verification"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="loads"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="my-loads"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="post-load"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="trip-tracking"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="driver-dashboard"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="driver-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="profile-improved"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
      
      <HamburgerMenu 
        visible={showHamburgerMenu} 
        onClose={() => setShowHamburgerMenu(false)} 
      />
    </>
  );
}
