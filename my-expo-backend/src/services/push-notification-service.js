// ============================================================================
// EXPO PUSH NOTIFICATION SERVICE
// ============================================================================
// Service for sending push notifications to drivers and vendors via Expo

const { Expo } = require('expo-server-sdk');

class PushNotificationService {
  constructor(models) {
    this.expo = new Expo();
    this.models = models;
    console.log('📱 Push Notification Service initialized');
  }

  /**
   * Send a push notification to a specific user
   */
  async sendToUser(userId, notification) {
    try {
      const { User } = this.models;
      
      // Get user's push token
      const user = await User.findByPk(userId, {
        attributes: ['id', 'name', 'expoPushToken', 'deviceType']
      });

      if (!user || !user.expoPushToken) {
        console.log(`⚠️ User ${userId} has no push token registered`);
        return { success: false, error: 'No push token' };
      }

      // Validate push token
      if (!Expo.isExpoPushToken(user.expoPushToken)) {
        console.error(`❌ Invalid push token for user ${userId}:`, user.expoPushToken);
        return { success: false, error: 'Invalid push token' };
      }

      // Prepare push message
      const message = {
        to: user.expoPushToken,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        priority: notification.priority || 'high',
        channelId: notification.channelId || 'default',
        badge: notification.badge,
      };

      // Send notification
      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('❌ Error sending push notification chunk:', error);
        }
      }

      // Log notification
      await this.logNotification(
        userId,
        notification.type || 'general',
        notification.title,
        notification.body,
        notification.data,
        'sent',
        tickets[0]?.id
      );

      console.log(`✅ Push notification sent to user ${userId}: ${notification.title}`);
      return { success: true, tickets };

    } catch (error) {
      console.error('❌ Error in sendToUser:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToMultipleUsers(userIds, notification) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, notification))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`📊 Batch notification: ${successful} sent, ${failed} failed`);
    return { successful, failed, total: results.length };
  }

  /**
   * Send notification to drivers within radius of a location
   */
  async sendToNearbyDrivers(location, radiusKm, notification) {
    try {
      const { User, Driver } = this.models;

      // Find available drivers with push tokens
      const drivers = await User.findAll({
        attributes: ['id', 'name', 'expoPushToken', 'currentLat', 'currentLng'],
        where: {
          userType: 'driver',
          expoPushToken: { [require('sequelize').Op.ne]: null },
          isActive: true,
        },
        include: [{
          model: Driver,
          as: 'driverProfile',
          where: { isAvailable: true },
          required: true,
        }],
      });

      // Filter by distance
      const nearbyDrivers = drivers.filter(driver => {
        if (!driver.currentLat || !driver.currentLng) return false;
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          driver.currentLat,
          driver.currentLng
        );
        return distance <= radiusKm;
      });

      console.log(`📍 Found ${nearbyDrivers.length} nearby drivers within ${radiusKm}km`);

      // Send to all nearby drivers
      if (nearbyDrivers.length > 0) {
        return await this.sendToMultipleUsers(
          nearbyDrivers.map(d => d.id),
          notification
        );
      }

      return { successful: 0, failed: 0, total: 0 };

    } catch (error) {
      console.error('❌ Error sending to nearby drivers:', error);
      return { successful: 0, failed: 0, total: 0, error: error.message };
    }
  }

  /**
   * Notification templates for common events
   */
  templates = {
    newLoadPosted: (load) => ({
      type: 'new_load',
      title: '🆕 New Load Available!',
      body: `${load.weight}kg load from ${load.pickupAddress} to ${load.dropAddress}`,
      data: { loadId: load.id, type: 'new_load' },
      sound: 'default',
      priority: 'high',
      channelId: 'loads',
    }),

    loadAssigned: (load, driverName) => ({
      type: 'load_assigned',
      title: '✅ Load Assigned!',
      body: `You've been assigned a load: ${load.weight}kg to ${load.dropAddress}`,
      data: { loadId: load.id, type: 'load_assigned' },
      sound: 'default',
      priority: 'high',
      channelId: 'loads',
    }),

    loadCancelled: (load) => ({
      type: 'load_cancelled',
      title: '❌ Load Cancelled',
      body: `Load to ${load.dropAddress} has been cancelled by vendor`,
      data: { loadId: load.id, type: 'load_cancelled' },
      sound: 'default',
      priority: 'high',
      channelId: 'loads',
    }),

    paymentReceived: (amount, loadId) => ({
      type: 'payment_received',
      title: '💰 Payment Received!',
      body: `You received ₹${amount} for completing load`,
      data: { loadId, type: 'payment_received', amount },
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }),

    loadPickupReminder: (load) => ({
      type: 'pickup_reminder',
      title: '⏰ Pickup Reminder',
      body: `Don't forget to pickup load from ${load.pickupAddress}`,
      data: { loadId: load.id, type: 'pickup_reminder' },
      sound: 'default',
      priority: 'default',
      channelId: 'loads',
    }),

    nearPickupLocation: (load) => ({
      type: 'near_pickup',
      title: '📍 Approaching Pickup Location',
      body: `You're near ${load.pickupAddress}. Ready to pickup?`,
      data: { loadId: load.id, type: 'near_pickup' },
      sound: 'default',
      priority: 'high',
      channelId: 'loads',
    }),

    nearDropLocation: (load) => ({
      type: 'near_drop',
      title: '📍 Approaching Drop Location',
      body: `You're near ${load.dropAddress}. Ready to deliver?`,
      data: { loadId: load.id, type: 'near_drop' },
      sound: 'default',
      priority: 'high',
      channelId: 'loads',
    }),

    driverAcceptedLoad: (driver, load) => ({
      type: 'driver_accepted',
      title: '🚛 Driver Accepted Your Load!',
      body: `${driver.name} accepted your load to ${load.dropAddress}`,
      data: { loadId: load.id, driverId: driver.id, type: 'driver_accepted' },
      sound: 'default',
      priority: 'high',
      channelId: 'loads',
    }),

    loadPickedUp: (driver, load) => ({
      type: 'load_picked_up',
      title: '📦 Load Picked Up!',
      body: `${driver.name} picked up your load. In transit to ${load.dropAddress}`,
      data: { loadId: load.id, driverId: driver.id, type: 'load_picked_up' },
      sound: 'default',
      priority: 'high',
      channelId: 'loads',
    }),

    loadDelivered: (driver, load) => ({
      type: 'load_delivered',
      title: '✅ Load Delivered!',
      body: `${driver.name} delivered your load to ${load.dropAddress}`,
      data: { loadId: load.id, driverId: driver.id, type: 'load_delivered' },
      sound: 'default',
      priority: 'high',
      channelId: 'loads',
    }),
  };

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Log notification to database
   */
  async logNotification(userId, type, title, body, data, status, receiptId) {
    try {
      const { sequelize } = this.models;
      await sequelize.query(
        `INSERT INTO notification_logs 
         (user_id, notification_type, title, body, data, delivery_status, expo_receipt_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        {
          bind: [userId, type, title, body, JSON.stringify(data || {}), status, receiptId],
          type: sequelize.QueryTypes.INSERT,
        }
      );
    } catch (error) {
      console.error('❌ Error logging notification:', error);
    }
  }

  /**
   * Check delivery receipts for sent notifications
   */
  async checkDeliveryReceipts() {
    try {
      const { sequelize } = this.models;
      
      // Get recent sent notifications with receipt IDs
      const [notifications] = await sequelize.query(
        `SELECT id, expo_receipt_id 
         FROM notification_logs 
         WHERE delivery_status = 'sent' 
         AND expo_receipt_id IS NOT NULL 
         AND sent_at > NOW() - INTERVAL '1 hour'
         LIMIT 100`
      );

      if (notifications.length === 0) return;

      const receiptIds = notifications.map(n => n.expo_receipt_id);
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

      for (const chunk of receiptIdChunks) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
          
          for (const receiptId in receipts) {
            const receipt = receipts[receiptId];
            const notification = notifications.find(n => n.expo_receipt_id === receiptId);
            
            if (receipt.status === 'ok') {
              await sequelize.query(
                `UPDATE notification_logs SET delivery_status = 'delivered' WHERE id = $1`,
                { bind: [notification.id] }
              );
            } else if (receipt.status === 'error') {
              await sequelize.query(
                `UPDATE notification_logs 
                 SET delivery_status = 'failed', error_message = $1 
                 WHERE id = $2`,
                { bind: [receipt.message, notification.id] }
              );
            }
          }
        } catch (error) {
          console.error('❌ Error checking receipt chunk:', error);
        }
      }

      console.log('✅ Checked delivery receipts for notifications');
    } catch (error) {
      console.error('❌ Error checking delivery receipts:', error);
    }
  }
}

module.exports = PushNotificationService;
