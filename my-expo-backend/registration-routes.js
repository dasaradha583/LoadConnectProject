// ============================================================================
// UPDATED REGISTRATION ENDPOINTS (WITHOUT BUSINESS_ID)
// ============================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function createRegistrationRoutes(models, JWT_SECRET, redisClient) {
  const express = require('express');
  const router = express.Router();
  const { User, Driver, Vendor, AdminNotification } = models;

  // Helper function to generate tokens
  const generateTokens = async (userId, userType) => {
    const accessToken = jwt.sign(
      { userId, userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId, userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store in Redis
    await redisClient.set(`access_token:${userId}`, accessToken, {
      EX: 24 * 60 * 60
    });
    await redisClient.set(`refresh_token:${userId}`, refreshToken, {
      EX: 7 * 24 * 60 * 60
    });

    return { accessToken, refreshToken };
  };

  // ===================== DRIVER REGISTRATION =====================
  router.post('/auth/register/driver', async (req, res) => {
    try {
      const { phone, otp, name, licenseNumber, vehicleType, vehicleCapacity, vehicleNumber } = req.body;
      
      if (!phone || !otp || !name || !licenseNumber || !vehicleType || !vehicleCapacity || !vehicleNumber) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required for driver registration'
        });
      }

      // Verify OTP
      const storedOtp = await redisClient.get(`otp:${phone}`);
      if (!storedOtp || storedOtp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { phone } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Create user
      const user = await User.create({
        phone,
        username: phone,
        name,
        userType: 'driver',
        phoneVerified: true,
        approvalStatus: 'pending',
        isActive: true,
        lastActiveAt: new Date()
      });

      // Create driver profile
      const driver = await Driver.create({
        userId: user.id,
        licenseNumber,
        vehicleType,
        vehicleCapacity: parseFloat(vehicleCapacity),
        vehicleNumber,
        isAvailable: true,
        rating: 5.0,
        totalTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        totalEarnings: 0,
        onTimePercentage: 100.00,
        licenseVerificationStatus: 'pending',
        vehicleVerificationStatus: 'pending',
        backgroundCheckStatus: 'pending'
      });

      // Clear OTP
      await redisClient.del(`otp:${phone}`);

      // Generate tokens
      const tokens = await generateTokens(user.id, user.userType);

      // Create admin notification
      await AdminNotification.create({
        notificationType: 'new_driver_registration',
        title: 'New Driver Registration',
        message: `Driver ${name} (${phone}) has registered and is pending approval`,
        targetUserId: user.id,
        targetUserName: name,
        targetUserType: 'driver',
        priority: 'normal'
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            userType: user.userType,
            phone: user.phone,
            username: user.username,
            name: user.name,
            phoneVerified: user.phoneVerified,
            approvalStatus: user.approvalStatus
          },
          driver: {
            licenseNumber: driver.licenseNumber,
            vehicleType: driver.vehicleType,
            vehicleCapacity: driver.vehicleCapacity,
            vehicleNumber: driver.vehicleNumber,
            rating: driver.rating
          },
          tokens
        },
        message: 'Driver registration successful. Your account is pending admin approval.'
      });

    } catch (error) {
      console.error('Driver registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // ===================== VENDOR REGISTRATION =====================
  router.post('/auth/register/vendor', async (req, res) => {
    try {
      const { phone, otp, name, businessName, gstNumber } = req.body;
      
      if (!phone || !otp || !name || !businessName) {
        return res.status(400).json({
          success: false,
          message: 'Phone, OTP, name, and business name are required'
        });
      }

      // Verify OTP
      const storedOtp = await redisClient.get(`otp:${phone}`);
      if (!storedOtp || storedOtp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { phone } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Create user
      const user = await User.create({
        phone,
        username: phone,
        name,
        userType: 'vendor',
        phoneVerified: true,
        approvalStatus: 'pending',
        isActive: true,
        lastActiveAt: new Date()
      });

      // Create vendor profile (WITHOUT business_id)
      const vendor = await Vendor.create({
        userId: user.id,
        businessName,
        gstNumber: gstNumber || null,
        rating: 5.0,
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalSpent: 0,
        gstVerified: false,
        businessVerificationStatus: 'pending'
      });

      // Clear OTP
      await redisClient.del(`otp:${phone}`);

      // Generate tokens
      const tokens = await generateTokens(user.id, user.userType);

      // Create admin notification
      await AdminNotification.create({
        notificationType: 'new_vendor_registration',
        title: 'New Vendor Registration',
        message: `Vendor ${businessName} (${phone}) has registered and is pending approval`,
        targetUserId: user.id,
        targetUserName: name,
        targetUserType: 'vendor',
        priority: 'normal'
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            userType: user.userType,
            phone: user.phone,
            username: user.username,
            name: user.name,
            phoneVerified: user.phoneVerified,
            approvalStatus: user.approvalStatus
          },
          vendor: {
            businessName: vendor.businessName,
            gstNumber: vendor.gstNumber,
            rating: vendor.rating
          },
          tokens
        },
        message: 'Vendor registration successful. Your account is pending admin approval.'
      });

    } catch (error) {
      console.error('Vendor registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = { createRegistrationRoutes };
