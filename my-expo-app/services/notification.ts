import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  loadId?: string;
  type?: string;
  [key: string]: any;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Register for push notifications
      const token = await this.registerForPushNotifications();
      if (token) {
        this.expoPushToken = token;
        console.log('📱 Push notification token:', token);
        
        // Send token to backend
        await this.sendTokenToBackend(token);
      }

      // Set up notification listeners
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device (push notifications don't work on simulator)
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Permission for notifications was denied');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id',
      });

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4A90E2',
        });

        // Create separate channel for load notifications
        await Notifications.setNotificationChannelAsync('loads', {
          name: 'Load Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4A90E2',
          sound: 'default',
        });
      }

      return tokenData.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const deviceInfo = {
        deviceType: Platform.OS,
        deviceModel: Device.modelName || 'Unknown',
      };

      const response = await api.post('/users/push-token', {
        expoPushToken: token,
        ...deviceInfo,
      });

      if (response.success) {
        console.log('✅ Push token registered with backend');
      } else {
        console.error('❌ Failed to register push token:', response.message);
      }
    } catch (error) {
      console.error('Error sending token to backend:', error);
    }
  }

  private setupNotificationListeners(): void {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received in foreground:', notification);
      // You can handle custom logic here
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data as NotificationData;
      
      // Handle navigation based on notification type
      if (data.loadId) {
        console.log(`Navigate to load: ${data.loadId}`);
        // You can use navigation here to open the load details
      }
    });
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async showNotification(title: string, body: string, data?: NotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: null, // null means show immediately
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async scheduleNotification(
    title: string,
    body: string,
    delay: number,
    data?: NotificationData
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: delay > 0 ? { seconds: Math.floor(delay / 1000) } as any : null,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  async sendImmediateNotification(notification: {
    title: string;
    body: string;
    data?: NotificationData;
  }): Promise<void> {
    return this.showNotification(notification.title, notification.body, notification.data);
  }

  async notifyDeliveryUpdate(loadId: string, status: string): Promise<void> {
    return this.showNotification(
      'Delivery Update',
      `Load ${loadId} status: ${status}`,
      { loadId, type: 'delivery_update' }
    );
  }

  async notifyLocationReached(location: string): Promise<void> {
    return this.showNotification(
      'Location Reached',
      `You have arrived at ${location}`,
      { type: 'location_reached' }
    );
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  cleanup(): void {
    // Remove listeners when component unmounts
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
}

export default NotificationService;
