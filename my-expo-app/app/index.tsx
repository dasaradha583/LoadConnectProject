import AuthService from '@/services/auth';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const authService = AuthService.getInstance();
      const authenticated = await authService.isAuthenticated();
      
      console.log('Authentication check result:', authenticated);
      
      if (authenticated) {
        console.log('User is authenticated, redirecting to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('User is not authenticated, redirecting to welcome');
        router.replace('/auth/welcome');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      // If there's an error, assume not authenticated
      router.replace('/auth/welcome');
    }
  };

  return null; // This component doesn't render anything
}
