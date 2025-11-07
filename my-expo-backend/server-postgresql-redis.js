const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Sequelize, DataTypes, Op } = require('sequelize');
const Redis = require('redis');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const GeocodingService = require('./geocoding-service');

const app = express();
const PORT = process.env.PORT || 3001;

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'load_management',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  logging: (msg) => console.log(`🗄️  PostgreSQL: ${msg}`),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

redisClient.on('connect', () => console.log('🔴 Redis connected'));
redisClient.on('error', (err) => console.error('🔴 Redis error:', err));

(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

const UserType = {
  DRIVER: 'driver',
  VENDOR: 'vendor'
};

const LoadStatus = {
  POSTED: 'posted',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  IN_PROGRESS: 'in_progress',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const LoadPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};



const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: DataTypes.STRING(100),
  state: DataTypes.STRING(100),
  country: {
    type: DataTypes.STRING(100),
    defaultValue: 'India'
  },
  postalCode: {
    type: DataTypes.STRING(20),
    field: 'postal_code'
  },
  contactName: {
    type: DataTypes.STRING(100),
    field: 'contact_name'
  },
  contactPhone: {
    type: DataTypes.STRING(15),
    field: 'contact_phone'
  },
  locationType: {
    type: DataTypes.ENUM('pickup', 'drop', 'warehouse', 'other'),
    defaultValue: 'other',
    field: 'location_type'
  }
}, {
  tableName: 'locations',
  underscored: true,
  timestamps: true
});


const DriverLocation = sequelize.define('DriverLocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'driver_id'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  accuracy: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  speed: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  heading: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  altitude: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'driver_locations',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});


const LocationHistory = sequelize.define('LocationHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'driver_id'
  },
  loadId: {
    type: DataTypes.UUID,
    field: 'load_id'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  accuracy: DataTypes.DECIMAL(8, 2),
  speed: DataTypes.DECIMAL(8, 2),
  heading: DataTypes.DECIMAL(5, 2),
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  eventType: {
    type: DataTypes.STRING(20), 
    field: 'event_type'
  },
  notes: DataTypes.TEXT
}, {
  tableName: 'location_history',
  underscored: true
});


class RedisLogger {
  static async set(key, value, expirationSeconds) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      if (expirationSeconds) {
        await redisClient.setEx(key, expirationSeconds, stringValue);
      } else {
        await redisClient.set(key, stringValue);
      }
      console.log(`🔴 Redis SET: ${key}`);
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  static async get(key) {
    try {
      const result = await redisClient.get(key);
      console.log(`🔴 Redis GET: ${key} = ${result ? 'found' : 'null'}`);
      return result;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  static async del(key) {
    try {
      const result = await redisClient.del(key);
      console.log(`🔴 Redis DEL: ${key}`);
      return result;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return 0;
    }
  }

  static async sAdd(key, value) {
    try {
      const result = await redisClient.sAdd(key, value);
      console.log(`🔴 Redis SADD: ${key} + ${value}`);
      return result;
    } catch (error) {
      console.error('Redis SADD error:', error);
      return 0;
    }
  }

  static async sRem(key, value) {
    try {
      const result = await redisClient.sRem(key, value);
      console.log(`🔴 Redis SREM: ${key} - ${value}`);
      return result;
    } catch (error) {
      console.error('Redis SREM error:', error);
      return 0;
    }
  }
}


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

app.use(express.json());


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('\n' + '🟢'.repeat(80));
  console.log(`🚀 HTTP REQUEST [${timestamp}]`);
  console.log(`📝 ${req.method} ${req.path}`);
  console.log(`📤 Headers:`, {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'Bearer ***' : 'None',
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  });
  console.log(`📦 Body:`, req.body);
  console.log(`🔍 Query:`, req.query);
  console.log(`📍 Params:`, req.params);
  console.log('🟢'.repeat(80) + '\n');
  next();
});

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
  
    const isBlacklisted = await RedisLogger.get(`blacklisted_token:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Vendor,
          as: 'vendorProfile',
          required: false
        },
        {
          model: Driver,
          as: 'driverProfile',
          required: false
        }
      ]
    });
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = decoded;
    req.userEntity = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};


const generateTokens = async (userId, userType) => {
  const payload = { userId, userType };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  

  await RedisLogger.set(`access_token:${userId}`, accessToken, 24 * 60 * 60);
  await RedisLogger.set(`refresh_token:${userId}`, refreshToken, 7 * 24 * 60 * 60);
  
  return { accessToken, refreshToken };
};

const generateOTP = () => {
  return process.env.NODE_ENV === 'production' 
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : '123456';
};


const { defineModels, UserType: UserTypeEnum, ApprovalStatus, DocumentType } = require('./models-updated');
const { createAdminRoutes } = require('./admin-routes');
const { createRegistrationRoutes } = require('./registration-routes');


const normalizedModels = defineModels(sequelize);


const User = normalizedModels.User;
const Driver = normalizedModels.Driver;
const Vendor = normalizedModels.Vendor;
const Admin = normalizedModels.Admin;


const Load = sequelize.define('Load', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vendorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'vendor_id'
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'driver_id'
  },
  weight: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  vehicleTypeRequired: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'vehicle_type_required'
  },
  priority: {
    type: DataTypes.STRING(20),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'posted'
  },
  // Location foreign keys
  pickupLocationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'pickup_location_id'
  },
  dropLocationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'drop_location_id'
  },
  pickupDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'pickup_date'
  },
  // Note: Driver location is now tracked in driver_locations table, not in loads table
  isPickedUp: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_picked_up'
  },
  isDropped: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_dropped'
  },
  pickupConfirmedAt: {
    type: DataTypes.DATE,
    field: 'pickup_confirmed_at'
  },
  dropConfirmedAt: {
    type: DataTypes.DATE,
    field: 'drop_confirmed_at'
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  finalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'final_price'
  },
  specialInstructions: {
    type: DataTypes.TEXT,
    field: 'special_instructions'
  },
  estimatedDistance: {
    type: DataTypes.DECIMAL(8, 2),
    field: 'estimated_distance'
  },
  actualDistance: {
    type: DataTypes.DECIMAL(8, 2),
    field: 'actual_distance'
  },
  estimatedDuration: {
    type: DataTypes.INTEGER,
    field: 'estimated_duration'
  },
  actualDuration: {
    type: DataTypes.INTEGER,
    field: 'actual_duration'
  },
  acceptedAt: {
    type: DataTypes.DATE,
    field: 'accepted_at'
  },
  startedAt: {
    type: DataTypes.DATE,
    field: 'started_at'
  },
  deliveredAt: {
    type: DataTypes.DATE,
    field: 'delivered_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at'
  }
}, {
  tableName: 'loads',
  underscored: true,
  timestamps: true
});

const Rating = sequelize.define('Rating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  loadId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'load_id',
    unique: true
  },
  vendorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'vendor_id'
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'driver_id'
  },
  overallRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'overall_rating',
    validate: {
      min: 1,
      max: 5
    }
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  punctualityRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'punctuality_rating',
    validate: {
      min: 1,
      max: 5
    }
  },
  behaviorRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'behavior_rating',
    validate: {
      min: 1,
      max: 5
    }
  },
  vehicleConditionRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'vehicle_condition_rating',
    validate: {
      min: 1,
      max: 5
    }
  },
  careOfGoodsRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'care_of_goods_rating',
    validate: {
      min: 1,
      max: 5
    }
  },
  isFlagged: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'is_flagged',
    defaultValue: false
  },
  flaggedReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'flagged_reason'
  },
  flaggedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'flagged_by'
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'is_visible',
    defaultValue: true
  }
}, {
  tableName: 'ratings',
  underscored: true,
  timestamps: true
});


// ===================== LOAD ASSOCIATIONS (NORMALIZED SCHEMA) =====================
// Load belongs to Vendor profile (not User)
Load.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendorProfile' });
// Load belongs to Driver profile (not User)
Load.belongsTo(Driver, { foreignKey: 'driverId', as: 'driverProfile' });
// Load belongs to Locations
Load.belongsTo(Location, { foreignKey: 'pickupLocationId', as: 'pickupLocation' });
Load.belongsTo(Location, { foreignKey: 'dropLocationId', as: 'dropLocation' });

// Reverse associations
Vendor.hasMany(Load, { foreignKey: 'vendorId', as: 'postedLoads' });
Driver.hasMany(Load, { foreignKey: 'driverId', as: 'assignedLoads' });
Location.hasMany(Load, { foreignKey: 'pickupLocationId', as: 'pickupLoads' });
Location.hasMany(Load, { foreignKey: 'dropLocationId', as: 'dropLoads' });

Rating.belongsTo(Load, { foreignKey: 'loadId', as: 'load' });
Rating.belongsTo(User, { foreignKey: 'vendorId', as: 'vendor' });
Rating.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });
Load.hasOne(Rating, { foreignKey: 'loadId', as: 'rating' });
User.hasMany(Rating, { foreignKey: 'driverId', as: 'receivedRatings' });
User.hasMany(Rating, { foreignKey: 'vendorId', as: 'givenRatings' });




app.use('/api', createAdminRoutes(normalizedModels, JWT_SECRET, redisClient));
app.use('/api', createRegistrationRoutes(normalizedModels));

console.log('✅ Admin system integrated successfully');



app.get('/health', async (req, res) => {
  try {

    const dbStatus = await User.count();
    
    res.json({
      success: true,
      message: 'PostgreSQL + Redis server is healthy',
      timestamp: new Date().toISOString(),
      version: '4.0.0',
      database: {
        postgresql: `Connected (${dbStatus} users)`,
        redis: 'Connected'
      },
      client: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        host: req.headers.host
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Helper function to derive approval status from user fields
function getApprovalStatus(user) {
  if (user.isSuspended) {
    return 'suspended';
  }
  if (user.verified) {
    return 'approved';
  }
  if (user.rejectionReason) {
    return 'rejected';
  }
  return 'pending';
}


app.post('/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    const otp = generateOTP();
    await RedisLogger.set(`otp:${phone}`, otp, 300); 

    console.log(`📱 Generated OTP for ${phone}: ${otp}`);


    const existingUser = await User.findOne({ 
      where: { phone },
      attributes: ['id', 'phone', 'username', 'name', 'user_type', 'is_active', 'is_verified']
    });

    res.json({
      success: true,
      data: {
        phone,
        userExists: !!existingUser,
        isNewUser: !existingUser
      },
      message: `OTP sent successfully to ${phone}. For testing: ${otp}`
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/auth/signin', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    const storedOtp = await RedisLogger.get(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }


    await RedisLogger.del(`otp:${phone}`);


    await user.update({ lastActiveAt: new Date() });


    const tokens = await generateTokens(user.id, user.userType);

    await RedisLogger.set(`user_session:${user.id}`, JSON.stringify({
      id: user.id,
      type: user.userType,
      phone: user.phone,
      name: user.name,
      lastLoginAt: new Date().toISOString()
    }), 24 * 60 * 60);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          type: user.userType,
          phone: user.phone,
          username: user.username,
          name: user.name,
          verified: user.verified,
          approvalStatus: getApprovalStatus(user)
        },
        tokens
      },
      message: 'Sign in successful'
    });

  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/auth/register/driver', async (req, res) => {
  try {
    console.log('📝 Driver Registration - Full Request body:', JSON.stringify(req.body, null, 2));
    
    const { phone, otp, name, licenseNumber, vehicleType, vehicleCapacity, vehicleNumber } = req.body;
    
    console.log('📝 Driver Registration - Extracted fields:', { 
      phone, 
      name, 
      licenseNumber, 
      vehicleType, 
      vehicleCapacity, 
      vehicleNumber,
      hasLicenseNumber: !!licenseNumber,
      hasVehicleType: !!vehicleType 
    });
    
    if (!phone || !otp || !name || !licenseNumber || !vehicleType || !vehicleCapacity || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required for driver registration'
      });
    }

    const storedOtp = await RedisLogger.get(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create User record (only user table fields)
    const driver = await User.create({
      userType: UserType.DRIVER,
      phone,
      username: phone,
      name,
      verified: true,
      isActive: true,
      lastActiveAt: new Date()
    });

    console.log('✅ Driver user created:', driver.id);

    // Create Driver profile record (separate table)
    const driverProfile = await Driver.create({
      userId: driver.id,
      licenseNumber: licenseNumber,
      vehicleType: vehicleType,
      vehicleCapacity: parseFloat(vehicleCapacity),
      vehicleNumber: vehicleNumber,
      isAvailable: true,
      rating: 5.0,
      totalTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      totalEarnings: 0.0,
      onTimePercentage: 100.00,
      licenseVerificationStatus: 'pending',
      vehicleVerificationStatus: 'pending',
      backgroundCheckStatus: 'pending'
    });

    console.log('✅ Driver profile created:', driverProfile.id);

    await RedisLogger.del(`otp:${phone}`);

    const tokens = await generateTokens(driver.id, driver.userType);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: driver.id,
          type: driver.userType,
          phone: driver.phone,
          username: driver.username,
          name: driver.name,
          verified: driver.verified
        },
        tokens
      },
      message: 'Driver registration successful'
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

app.post('/auth/register/vendor', async (req, res) => {
  try {
    console.log('📝 Vendor Registration - Request body:', JSON.stringify(req.body, null, 2));
    
    const { phone, otp, name, businessName, gstNumber } = req.body;

    console.log('📝 Extracted vendor values:', {
      phone, otp, name, businessName, gstNumber
    });

    if (!phone || !otp || !name || !businessName) {
      return res.status(400).json({
        success: false,
        message: 'Phone, OTP, name, and business name are required'
      });
    }

    const storedOtp = await RedisLogger.get(`otp:${phone}`);
    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create User record (only user table fields)
    const user = await User.create({
      userType: 'vendor',
      phone,
      username: phone,
      name,
      verified: true,
      isActive: true,
      lastActiveAt: new Date()
    });

    console.log('✅ Vendor user created:', user.id);

    // Create Vendor profile record (separate table)
    // Note: Use camelCase property names, Sequelize will map to snake_case database columns
    const vendor = await Vendor.create({
      userId: user.id,
      businessName: businessName,
      gstNumber: gstNumber || null,
      rating: 5.00,
      totalOrders: 0
    });

    console.log('✅ Vendor profile created:', vendor.id);

    await RedisLogger.del(`otp:${phone}`);

    const tokens = await generateTokens(user.id, user.userType);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          type: user.userType,
          phone: user.phone,
          username: user.username,
          name: user.name,
          verified: user.verified
        },
        tokens
      },
      message: 'Vendor registration successful'
    });
  } catch (error) {
    console.error('❌ Vendor registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

app.post('/auth/signout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await RedisLogger.set(`blacklisted_token:${token}`, 'true', 24 * 60 * 60);
    }

    await RedisLogger.del(`user_session:${userId}`);
    await RedisLogger.del(`access_token:${userId}`);
    await RedisLogger.del(`refresh_token:${userId}`);

    console.log(`👋 User ${userId} signed out successfully`);

    res.json({
      success: true,
      message: 'Signed out successfully'
    });

  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


app.put('/auth/profile/driver', authenticateToken, async (req, res) => {
  try {
    const { licenseNumber, vehicleType, vehicleCapacity, vehicleNumber, name, isAvailable } = req.body;
    const userId = req.user.userId;


    const driver = await User.findOne({ where: { id: userId, userType: 'driver' } });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }


    const updateData = {};
    if (name) updateData.name = name;
    if (licenseNumber) updateData.licenseNumber = licenseNumber;
    if (vehicleType) updateData.vehicleType = vehicleType;
    if (vehicleCapacity) updateData.vehicleCapacity = parseFloat(vehicleCapacity);
    if (vehicleNumber) updateData.vehicleNumber = vehicleNumber.toUpperCase();
    if (typeof isAvailable === 'boolean') updateData.isAvailable = isAvailable;
    updateData.updatedAt = new Date();

    await driver.update(updateData);

    if (typeof isAvailable === 'boolean' && driver.latitude && driver.longitude) {
      broadcastDriverAvailabilityChange({
        latitude: driver.latitude,
        longitude: driver.longitude
      }, isAvailable);
    }


    // Find and update the driver profile
    const driverProfile = await Driver.findOne({ where: { userId: driver.id } });
    
    if (driverProfile) {
      // Update existing driver profile
      const driverUpdateData = {};
      if (licenseNumber) driverUpdateData.license_number = licenseNumber;
      if (vehicleType) driverUpdateData.vehicle_type = vehicleType;
      if (vehicleCapacity) driverUpdateData.vehicleCapacity = parseFloat(vehicleCapacity);
      if (vehicleNumber) driverUpdateData.vehicleNumber = vehicleNumber.toUpperCase();
      if (typeof isAvailable === 'boolean') driverUpdateData.is_available = isAvailable;
      
      if (Object.keys(driverUpdateData).length > 0) {
        await driverProfile.update(driverUpdateData);
      }
    }

    console.log(`✅ Driver profile updated for user ${userId}`);

    // Reload the driver profile to get updated data
    const updatedDriverProfile = await Driver.findOne({ where: { userId: driver.id } });

    res.json({
      success: true,
      data: {
        user: {
          id: driver.id,
          type: driver.userType,
          phone: driver.phone,
          username: driver.username,
          name: driver.name,
          verified: driver.verified,
          isAvailable: updatedDriverProfile ? updatedDriverProfile.is_available : driver.isAvailable
        },
        driver: updatedDriverProfile ? {
          licenseNumber: updatedDriverProfile.license_number,
          vehicleType: updatedDriverProfile.vehicle_type,
          vehicleCapacity: updatedDriverProfile.vehicleCapacity,
          vehicleNumber: updatedDriverProfile.vehicleNumber,
          rating: updatedDriverProfile.rating,
          totalTrips: updatedDriverProfile.totalTrips,
          completedTrips: updatedDriverProfile.completedTrips,
          totalEarnings: updatedDriverProfile.totalEarnings,
          isAvailable: updatedDriverProfile.is_available
        } : null
      },
      message: 'Driver profile updated successfully'
    });

  } catch (error) {
    console.error('Driver profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.put('/auth/profile/vendor', authenticateToken, async (req, res) => {
  try {
    const { businessName, gstNumber, name } = req.body;
    const userId = req.user.userId;


    const user = await User.findOne({ where: { id: userId, userType: 'vendor' } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Vendor user not found'
      });
    }

    const vendor = await Vendor.findOne({ where: { userId: userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    if (name && name !== user.name) {
      await user.update({ name, updatedAt: new Date() });
    }

    const vendorUpdateData = {};
    if (businessName) vendorUpdateData.businessName = businessName;
    if (gstNumber) vendorUpdateData.gstNumber = gstNumber.toUpperCase();
    
    if (Object.keys(vendorUpdateData).length > 0) {
      vendorUpdateData.updatedAt = new Date();
      await vendor.update(vendorUpdateData);
    }


    await user.reload();
    await vendor.reload();

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          type: user.userType,
          phone: user.phone,
          username: user.username,
          name: user.name,
          phoneVerified: user.verified,
          approvalStatus: getApprovalStatus(user)
        },
        vendor: {
          businessName: vendor.businessName,
          gstNumber: vendor.gstNumber,
          rating: vendor.rating,
          totalOrders: vendor.totalOrders
        }
      },
      message: 'Vendor profile updated successfully'
    });

  } catch (error) {
    console.error('Vendor profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    console.log(`🔍 Profile Request - User ID: ${userId}, Type from token: ${userType}`);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`🔍 Profile Request - Type from DB: ${user.userType}`);

    const userData = {
      id: user.id,
      type: user.userType,
      phone: user.phone,
      username: user.username,
      name: user.name,
      verified: user.verified,
      is_active: user.is_active,
      approvalStatus: getApprovalStatus(user),
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    if (user.userType === 'driver') {

      const driver = await Driver.findOne({ where: { userId: user.id } });
      
      if (!driver) {
        console.error(`❌ Driver profile not found for user ${user.id}`);
        return res.status(404).json({
          success: false,
          message: 'Driver profile not found'
        });
      }

      console.log(`✅ Driver profile found for ${user.name}`);
      console.log('📋 Driver data:', JSON.stringify(driver.toJSON(), null, 2));
      
      res.json({
        success: true,
        data: {
          user: userData,
          driver: {
            licenseNumber: driver.licenseNumber,
            vehicleType: driver.vehicleType,
            vehicleCapacity: driver.vehicleCapacity,
            vehicleNumber: driver.vehicleNumber,
            isAvailable: driver.isAvailable,
            rating: driver.rating,
            totalTrips: driver.totalTrips,
            completedTrips: driver.completedTrips,
            totalEarnings: driver.totalEarnings
          }
        },
        message: 'Driver profile retrieved successfully'
      });
    } else if (user.userType === 'vendor') {

      const vendor = await Vendor.findOne({ where: { userId: user.id } });
      
      if (!vendor) {
        console.error(`❌ Vendor profile not found for user ${user.id}`);
        return res.status(404).json({
          success: false,
          message: 'Vendor profile not found'
        });
      }

      console.log(`✅ Vendor profile found for ${user.name}`);
      console.log('📋 Vendor data:', JSON.stringify(vendor.toJSON(), null, 2));

      res.json({
        success: true,
        data: {
          user: userData,
          vendor: {
            businessName: vendor.businessName,
            gstNumber: vendor.gstNumber,
            rating: vendor.rating,
            totalOrders: vendor.totalOrders
          }
        },
        message: 'Vendor profile retrieved successfully'
      });
    } else if (user.userType === 'admin') {

      const admin = await Admin.findOne({ where: { userId: user.id } });
      
      res.json({
        success: true,
        data: {
          user: userData,
          admin: admin ? {
            adminLevel: admin.adminLevel,
            department: admin.department,
            canApproveVendors: admin.canApproveVendors,
            canApproveDrivers: admin.canApproveDrivers,
            canSuspendUsers: admin.canSuspendUsers
          } : null
        },
        message: 'Admin profile retrieved successfully'
      });
    } else {

      res.json({
        success: true,
        data: { user: userData },
        message: 'User profile retrieved successfully'
      });
    }

  } catch (error) {
    console.error('Profile retrieval error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


const geocodeAddress = async (address) => {

  const locationDatabase = {
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'surat': { lat: 21.1702, lng: 72.8311 },
    'lucknow': { lat: 26.8467, lng: 80.9462 },
    'kanpur': { lat: 26.4499, lng: 80.3319 },
    'nagpur': { lat: 21.1458, lng: 79.0882 },
    'indore': { lat: 22.7196, lng: 75.8577 },
    'bhopal': { lat: 23.2599, lng: 77.4126 },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
    'patna': { lat: 25.5941, lng: 85.1376 },
    'vadodara': { lat: 22.3072, lng: 73.1812 },
    'ghaziabad': { lat: 28.6692, lng: 77.4538 },
    'ludhiana': { lat: 30.9010, lng: 75.8573 },

    'guntur': { lat: 16.3067, lng: 80.4365 },
    'markapur': { lat: 15.7326, lng: 79.2670 },
    'vijayawada': { lat: 16.5062, lng: 80.6480 },
    'tirupati': { lat: 13.6288, lng: 79.4192 },
    'nellore': { lat: 14.4426, lng: 79.9865 },
    'kurnool': { lat: 15.8281, lng: 78.0373 },
    'rajahmundry': { lat: 17.0005, lng: 81.8040 },
    'kakinada': { lat: 16.9891, lng: 82.2475 },
    'anantapur': { lat: 14.6819, lng: 77.6006 },
    'chittoor': { lat: 13.2172, lng: 79.1003 },
    'eluru': { lat: 16.7107, lng: 81.0958 },
    'ongole': { lat: 15.5057, lng: 80.0499 },
    'machilipatnam': { lat: 16.1871, lng: 81.1378 },
    'nizamabad': { lat: 18.6725, lng: 78.0941 },
    'karimnagar': { lat: 18.4386, lng: 79.1288 },
    'warangal': { lat: 17.9689, lng: 79.5941 },
    'khammam': { lat: 17.2473, lng: 80.1514 },
    'mahbubnagar': { lat: 16.7302, lng: 77.9777 },
    'adilabad': { lat: 19.6715, lng: 78.5311 },
    
    'coimbatore': { lat: 11.0168, lng: 76.9558 },
    'madurai': { lat: 9.9252, lng: 78.1198 },
    'salem': { lat: 11.6643, lng: 78.1460 },
    'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
    'erode': { lat: 11.3410, lng: 77.7172 },
    'vellore': { lat: 12.9165, lng: 79.1325 },
    'thoothukudi': { lat: 8.7642, lng: 78.1348 },
    'thanjavur': { lat: 10.7870, lng: 79.1378 },
    'dindigul': { lat: 10.3673, lng: 77.9803 },
    'cuddalore': { lat: 11.7593, lng: 79.7711 },
    

    'vizag': { lat: 17.6868, lng: 83.2185 }, 
    'hyd': { lat: 17.3850, lng: 78.4867 }, 
    'blr': { lat: 12.9716, lng: 77.5946 }, 
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'madras': { lat: 13.0827, lng: 80.2707 }, 
    'kunata': { lat: 15.9011, lng: 79.3017 }, 
    'kunta': { lat: 15.9011, lng: 79.3017 }, 
  };
  
  const addressLower = address.toLowerCase().trim();
  

  for (const [location, coords] of Object.entries(locationDatabase)) {
    if (addressLower.includes(location)) {
      console.log(`🗺️  Geocoded "${address}" to ${location}: ${coords.lat}, ${coords.lng}`);

      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.02, 
        lng: coords.lng + (Math.random() - 0.5) * 0.02
      };
    }
  }
  
  console.warn(`⚠️  Location "${address}" not found in database. Using Bangalore as fallback.`);
  console.warn(`💡 Consider adding "${addressLower}" to the location database for better accuracy.`);
  
  return { 
    lat: 12.9716 + (Math.random() - 0.5) * 0.1, 
    lng: 77.5946 + (Math.random() - 0.5) * 0.1 
  };
};

app.post('/loads', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.userEntity.userType !== UserType.VENDOR) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only vendors can create loads'
      });
    }

    const {
      weight,
      description,
      vehicleTypeRequired = 'truck',
      pickupLat,
      pickupLng,
      pickupAddress,
      pickupCity,
      pickupState,
      pickupPostalCode,
      pickupDate,
      pickupContactName,
      pickupContactPhone,
      dropLat,
      dropLng,
      dropAddress,
      dropCity,
      dropState,
      dropPostalCode,
      dropContactName,
      dropContactPhone,
      budget,
      priority = 'medium',
      specialInstructions
    } = req.body;

    if (!weight || !description || !budget) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: weight, description, and budget are required'
      });
    }

    if (!pickupLat || !pickupLng) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Pickup location coordinates are required. Please select pickup location on map.'
      });
    }

    if (!dropLat || !dropLng) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Drop location coordinates are required. Please select drop location on map.'
      });
    }

    let finalPickupLat = parseFloat(pickupLat);
    let finalPickupLng = parseFloat(pickupLng);
    let finalDropLat = parseFloat(dropLat);
    let finalDropLng = parseFloat(dropLng);
    
    const isPickupAddressCoords = pickupAddress && /^\d+\.\d+,\s*\d+\.\d+$/.test(pickupAddress.trim());
    const isDropAddressCoords = dropAddress && /^\d+\.\d+,\s*\d+\.\d+$/.test(dropAddress.trim());
    
    let finalPickupAddress = pickupAddress;
    let finalDropAddress = dropAddress;
    
    if (!pickupAddress || isPickupAddressCoords) {
      console.log(`🗺️  Reverse geocoding pickup location: ${finalPickupLat}, ${finalPickupLng}`);
      const geocodedPickup = await GeocodingService.reverseGeocode(finalPickupLat, finalPickupLng);
      if (geocodedPickup) {
        finalPickupAddress = geocodedPickup;
        console.log(`✅ Pickup address: ${finalPickupAddress}`);
      } else {
        finalPickupAddress = `${finalPickupLat.toFixed(6)}, ${finalPickupLng.toFixed(6)}`;
      }
    }
    
    if (!dropAddress || isDropAddressCoords) {
      console.log(`🗺️  Reverse geocoding drop location: ${finalDropLat}, ${finalDropLng}`);
      const geocodedDrop = await GeocodingService.reverseGeocode(finalDropLat, finalDropLng);
      if (geocodedDrop) {
        finalDropAddress = geocodedDrop;
        console.log(`✅ Drop address: ${finalDropAddress}`);
      } else {
        finalDropAddress = `${finalDropLat.toFixed(6)}, ${finalDropLng.toFixed(6)}`;
      }
    }

    console.log(`📍 Creating location records for load:`);
    console.log(`   Pickup: ${finalPickupAddress} (${finalPickupLat}, ${finalPickupLng})`);
    console.log(`   Drop: ${finalDropAddress} (${finalDropLat}, ${finalDropLng})`);

    // Get vendor profile ID (loads.vendor_id references vendors.id, not users.id)
    const vendorProfile = await Vendor.findOne({
      where: { userId: req.user.userId }
    }, { transaction });

    if (!vendorProfile) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    // Create pickup location
    const pickupLocation = await Location.create({
      address: finalPickupAddress,
      city: pickupCity,
      state: pickupState,
      postalCode: pickupPostalCode,
      country: 'India',
      latitude: finalPickupLat,
      longitude: finalPickupLng,
      contactName: pickupContactName,
      contactPhone: pickupContactPhone,
      locationType: 'pickup'
    }, { transaction });

    // Create drop location
    const dropLocation = await Location.create({
      address: finalDropAddress,
      city: dropCity,
      state: dropState,
      postalCode: dropPostalCode,
      country: 'India',
      latitude: finalDropLat,
      longitude: finalDropLng,
      contactName: dropContactName,
      contactPhone: dropContactPhone,
      locationType: 'drop'
    }, { transaction });

    // Create load with location references
    const load = await Load.create({
      vendorId: vendorProfile.id,  // Use vendor profile ID, not user ID
      weight: parseFloat(weight),
      description,
      vehicleTypeRequired,
      priority,
      status: LoadStatus.POSTED,
      pickupLocationId: pickupLocation.id,
      dropLocationId: dropLocation.id,
      pickupDate: new Date(pickupDate || Date.now()),
      budget: parseFloat(budget),
      specialInstructions
    }, { transaction });

    await transaction.commit();

    console.log(`📦 Load created successfully: ${load.id}`);
    console.log(`   Pickup Location ID: ${pickupLocation.id}`);
    console.log(`   Drop Location ID: ${dropLocation.id}`);

    // Fetch load with location data for response
    const loadWithLocations = await Load.findByPk(load.id, {
      include: [
        { model: Location, as: 'pickupLocation' },
        { model: Location, as: 'dropLocation' }
      ]
    });

    res.status(201).json({
      success: true,
      data: { load: loadWithLocations },
      message: 'Load created successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create load error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});


function formatLoadForFrontend(load) {
  const loadData = load.toJSON ? load.toJSON() : load;
  
  // Extract pickup location data from association
  const pickupLoc = loadData.pickupLocation || {};
  const dropLoc = loadData.dropLocation || {};
  
  return {
    ...loadData,
    // Format pickup location from association
    pickupLocation: {
      latitude: pickupLoc.latitude ? parseFloat(pickupLoc.latitude) : null,
      longitude: pickupLoc.longitude ? parseFloat(pickupLoc.longitude) : null,
      address: pickupLoc.address || 'Address not available'
    },
    pickupAddress: pickupLoc.address || 'Address not available',
    pickupCity: pickupLoc.city,
    pickupState: pickupLoc.state,
    pickupPostalCode: pickupLoc.postalCode,
    pickupContactName: pickupLoc.contactName,
    pickupContactPhone: pickupLoc.contactPhone,
    pickupLat: pickupLoc.latitude ? parseFloat(pickupLoc.latitude) : null,
    pickupLng: pickupLoc.longitude ? parseFloat(pickupLoc.longitude) : null,
    
    // Format drop location from association
    dropLocation: {
      latitude: dropLoc.latitude ? parseFloat(dropLoc.latitude) : null,
      longitude: dropLoc.longitude ? parseFloat(dropLoc.longitude) : null,
      address: dropLoc.address || 'Address not available'
    },
    dropAddress: dropLoc.address || 'Address not available',
    dropCity: dropLoc.city,
    dropState: dropLoc.state,
    dropPostalCode: dropLoc.postalCode,
    dropContactName: dropLoc.contactName,
    dropContactPhone: dropLoc.contactPhone,
    dropLat: dropLoc.latitude ? parseFloat(dropLoc.latitude) : null,
    dropLng: dropLoc.longitude ? parseFloat(dropLoc.longitude) : null,
    
    // Format numeric fields
    weight: parseFloat(loadData.weight),
    budget: parseFloat(loadData.budget),
    finalPrice: loadData.finalPrice ? parseFloat(loadData.finalPrice) : null,
    estimatedDistance: loadData.estimatedDistance ? parseFloat(loadData.estimatedDistance) : null,
    actualDistance: loadData.actualDistance ? parseFloat(loadData.actualDistance) : null
  };
}

app.get('/loads/available', authenticateToken, async (req, res) => {
  try {
    if (req.userEntity.userType !== UserType.DRIVER) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can view available loads'
      });
    }

    const driverId = req.user.userId;
    const { lat, lng } = req.query; 

    const user = await User.findByPk(driverId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const driver = await Driver.findOne({ where: { userId: driverId } });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    console.log(`🚗 Driver vehicle: ${driver.vehicleType}, capacity: ${driver.vehicleCapacity}`);


    const activeLoad = await Load.findOne({
      where: {
        driverId: driverId,
        status: {
          [Op.in]: [LoadStatus.ACCEPTED, LoadStatus.PICKED_UP, LoadStatus.IN_TRANSIT]
        }
      },
      include: [
        { model: Location, as: 'pickupLocation' },
        { model: Location, as: 'dropLocation' }
      ]
    });

    if (activeLoad) {

      return res.json({
        success: true,
        data: [], 
        message: 'You have an active load',
        hasActiveLoad: true,
        activeLoad: {
          id: activeLoad.id,
          status: activeLoad.status,
          pickupAddress: activeLoad.pickupLocation?.address || 'Address not available',
          dropAddress: activeLoad.dropLocation?.address || 'Address not available',
          description: activeLoad.description,
          budget: parseFloat(activeLoad.budget)
        }
      });
    }

    let whereClause = {
      status: LoadStatus.POSTED,
      driverId: null
    };


    let orderClause = [['createdAt', 'DESC']];
    
    if (lat && lng) {

      const earthRadius = 6371; 
      

      const driverLat = parseFloat(lat);
      const driverLng = parseFloat(lng);
      

      const searchRadii = [50, 100, 200, 250];
      
      console.log(`🌍 Starting progressive radius search from driver location: ${driverLat}, ${driverLng}`);
      

      const allLoads = await Load.findAll({
        where: whereClause,
        include: [
          { model: Location, as: 'pickupLocation' },
          { model: Location, as: 'dropLocation' }
        ],
        order: orderClause,
        limit: 100 
      });

      console.log(`📦 Total available loads in database: ${allLoads.length}`);


      const loadsWithDistance = allLoads.map(load => {
        const loadLat = load.pickupLocation?.latitude;
        const loadLng = load.pickupLocation?.longitude;
        
        if (!loadLat || !loadLng) {
          console.warn(`⚠️  Load ${load.id} missing pickup location coordinates`);
          return null;
        }
        
        const dLat = (loadLat - driverLat) * Math.PI / 180;
        const dLng = (loadLng - driverLng) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(driverLat * Math.PI / 180) * Math.cos(loadLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = earthRadius * c; 
        let matchScore = 50; 
        if (distance <= 5) matchScore += 40;
        else if (distance <= 15) matchScore += 30;
        else if (distance <= 30) matchScore += 20;
        else if (distance <= 50) matchScore += 10;
        

        if (load.vehicleTypeRequired === driver.vehicleType) {
          matchScore += 25;
        }
        

        if (driver.vehicleCapacity && driver.vehicleCapacity >= load.weight) {
          matchScore += 15;
        }
        

        if (load.budget >= 5000) matchScore += 10;
        else if (load.budget >= 2000) matchScore += 5;
        

        const dropLat = load.dropLocation?.latitude;
        const dropLng = load.dropLocation?.longitude;
        
        if (!dropLat || !dropLng) {
          console.warn(`⚠️  Load ${load.id} missing drop location coordinates`);
          return null;
        }
        
        const tripDLat = (dropLat - loadLat) * Math.PI / 180;
        const tripDLng = (dropLng - loadLng) * Math.PI / 180;
        const tripA = Math.sin(tripDLat/2) * Math.sin(tripDLat/2) +
                Math.cos(loadLat * Math.PI / 180) * Math.cos(dropLat * Math.PI / 180) *
                Math.sin(tripDLng/2) * Math.sin(tripDLng/2);
        const tripC = 2 * Math.atan2(Math.sqrt(tripA), Math.sqrt(1-tripA));
        const tripDistance = earthRadius * tripC;
        
        return {
          ...load.toJSON(),
          distance: Math.round(distance * 10) / 10, 
          estimatedDistance: Math.round(tripDistance * 10) / 10, 
          matchScore: Math.min(matchScore, 100),
          estimatedTime: Math.ceil(distance / 60 * 60), 
          estimatedTripDuration: Math.ceil(tripDistance / 50 * 60),
          pickupLocation: {
            latitude: parseFloat(loadLat),
            longitude: parseFloat(loadLng),
            address: load.pickupLocation.address || `${loadLat}, ${loadLng}`
          },
          dropLocation: {
            latitude: parseFloat(dropLat),
            longitude: parseFloat(dropLng),
            address: load.dropLocation.address || `${dropLat}, ${dropLng}`
          },
          // Add backward compatibility fields
          pickupAddress: load.pickupLocation.address,
          dropAddress: load.dropLocation.address,
          pickupLat: loadLat,
          pickupLng: loadLng,
          dropLat: dropLat,
          dropLng: dropLng,
          weight: parseFloat(load.weight),
          budget: parseFloat(load.budget)
        };
      })
      .filter(load => load !== null) // Filter out loads with missing location data
      .sort((a, b) => b.matchScore - a.matchScore); 
      let foundLoads = [];
      let usedRadius = 0;

      for (const radius of searchRadii) {
        foundLoads = loadsWithDistance.filter(load => load.distance <= radius);
        console.log(`� Searching within ${radius}km: Found ${foundLoads.length} loads`);
        
        if (foundLoads.length > 0) {
          usedRadius = radius;
          foundLoads = foundLoads.slice(0, 20); 
          console.log(`✅ Found loads within ${radius}km radius`);
          foundLoads.forEach(load => {
            console.log(`   📍 Load ${load.id.substring(0, 8)}: ${load.distance}km away, score: ${load.matchScore}`);
          });
          break;
        }
      }


      if (foundLoads.length === 0) {
        console.log(`❌ No loads found within 250km. Showing closest loads:`);
        const sortedByDistance = [...loadsWithDistance].sort((a, b) => a.distance - b.distance);
        sortedByDistance.slice(0, 3).forEach(load => {
          console.log(`   📍 Load ${load.id.substring(0, 8)}: ${load.distance}km away`);
        });
        usedRadius = 250;
      }

      res.json({
        success: true,
        data: foundLoads,
        message: foundLoads.length > 0 
          ? `Found ${foundLoads.length} loads within ${usedRadius}km`
          : `No loads available within 250km of your location.`,
        searchInfo: {
          driverLocation: { lat: driverLat, lng: driverLng },
          searchRadius: usedRadius,
          totalLoadsAvailable: allLoads.length,
          loadsWithinRadius: foundLoads.length,
          searchRadiiAttempted: searchRadii.filter(r => r <= usedRadius)
        }
      });

    } else {

      const availableLoads = await Load.findAll({
        where: whereClause,
        include: [
          { model: Location, as: 'pickupLocation' },
          { model: Location, as: 'dropLocation' }
        ],
        order: orderClause,
        limit: 20
      });


      const loadsWithScore = availableLoads.map(load => {
        let matchScore = 50; 
        if (load.vehicleTypeRequired === driver.vehicleType) {
          matchScore += 25;
        }
        
 
        if (driver.vehicleCapacity && driver.vehicleCapacity >= load.weight) {
          matchScore += 15;
        }
        

        if (load.budget >= 5000) matchScore += 10;
        else if (load.budget >= 2000) matchScore += 5;
        

        const loadLat = load.pickupLocation?.latitude;
        const loadLng = load.pickupLocation?.longitude;
        const dropLat = load.dropLocation?.latitude;
        const dropLng = load.dropLocation?.longitude;
        
        let tripDistance = null;
        if (loadLat && loadLng && dropLat && dropLng) {
          const earthRadius = 6371;
          const tripDLat = (dropLat - loadLat) * Math.PI / 180;
          const tripDLng = (dropLng - loadLng) * Math.PI / 180;
          const tripA = Math.sin(tripDLat/2) * Math.sin(tripDLat/2) +
                  Math.cos(loadLat * Math.PI / 180) * Math.cos(dropLat * Math.PI / 180) *
                  Math.sin(tripDLng/2) * Math.sin(tripDLng/2);
          const tripC = 2 * Math.atan2(Math.sqrt(tripA), Math.sqrt(1-tripA));
          tripDistance = earthRadius * tripC;
        }
        
        return {
          ...load.toJSON(),
          matchScore: Math.min(matchScore, 100),
          distance: null,
          estimatedDistance: tripDistance ? Math.round(tripDistance * 10) / 10 : null, 
          estimatedTime: null,
          estimatedTripDuration: tripDistance ? Math.ceil(tripDistance / 50 * 60) : null,
          pickupLocation: {
            latitude: loadLat ? parseFloat(loadLat) : null,
            longitude: loadLng ? parseFloat(loadLng) : null,
            address: load.pickupLocation?.address || 'Address not available'
          },
          dropLocation: {
            latitude: dropLat ? parseFloat(dropLat) : null,
            longitude: dropLng ? parseFloat(dropLng) : null,
            address: load.dropLocation?.address || 'Address not available'
          },
          // Add backward compatibility fields
          pickupAddress: load.pickupLocation?.address,
          dropAddress: load.dropLocation?.address,
          pickupLat: loadLat,
          pickupLng: loadLng,
          dropLat: dropLat,
          dropLng: dropLng,
          weight: parseFloat(load.weight),
          budget: parseFloat(load.budget)
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      console.log(`📦 Found ${loadsWithScore.length} available loads for driver ${driverId} (no location filtering)`);

      res.json({
        success: true,
        data: loadsWithScore,
        message: `Found ${loadsWithScore.length} available loads`,
        searchInfo: {
          driverLocation: null,
          searchRadius: null,
          totalLoadsFiltered: loadsWithScore.length
        }
      });
    }

  } catch (error) {
    console.error('Get available loads error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/loads/vendor/:vendorId', authenticateToken, async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    console.log(`🔍 Load request - Vendor ID from URL: ${vendorId}`);
    console.log(`🔍 Load request - User ID from token: ${req.user.userId}`);
    console.log(`🔍 Load request - User type from token: ${req.userEntity.userType}`);
    console.log(`🔍 Load request - Match: ${req.user.userId === vendorId}`);
    
    if (req.userEntity.userType !== UserType.VENDOR || req.user.userId !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only vendors can access their own loads.'
      });
    }

    // Get vendor profile ID (loads.vendor_id references vendors.id, not users.id)
    const vendorProfile = await Vendor.findOne({
      where: { userId: vendorId }
    });

    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    const vendorLoads = await Load.findAll({
      where: {
        vendorId: vendorProfile.id  // Use vendor profile ID, not user ID
      },
      include: [
        { model: Location, as: 'pickupLocation' },
        { model: Location, as: 'dropLocation' }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`📦 Found ${vendorLoads.length} loads for vendor ${vendorId}`);
    
    // Format loads with location data for frontend
    const formattedLoads = vendorLoads.map(load => formatLoadForFrontend(load));

    res.json({
      success: true,
      data: formattedLoads,
      message: `Found ${vendorLoads.length} loads for vendor`
    });

  } catch (error) {
    console.error('Get vendor loads error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/loads/driver/:driverId', authenticateToken, async (req, res) => {
  try {
    const { driverId } = req.params;
    
    console.log(`🔍 Load request - Driver ID from URL: ${driverId}`);
    console.log(`🔍 Load request - User ID from token: ${req.user.userId}`);
    console.log(`🔍 Load request - User type from token: ${req.userEntity.userType}`);
    console.log(`🔍 Load request - Match: ${req.user.userId === driverId}`);
    
    if (req.userEntity.userType !== UserType.DRIVER || req.user.userId !== driverId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only drivers can access their own loads.'
      });
    }

    // Get driver profile ID (loads.driver_id references drivers.id, not users.id)
    const driverProfile = await Driver.findOne({
      where: { userId: driverId }
    });

    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const driverLoads = await Load.findAll({
      where: {
        driverId: driverProfile.id  // Use driver profile ID, not user ID
      },
      include: [
        { model: Location, as: 'pickupLocation' },
        { model: Location, as: 'dropLocation' }
      ],
      order: [['accepted_at', 'DESC'], ['created_at', 'DESC']]
    });

    console.log(`🚛 Found ${driverLoads.length} loads for driver ${driverId}`);
    
    // Format loads with location data for frontend
    const formattedLoads = driverLoads.map(load => formatLoadForFrontend(load));

    res.json({
      success: true,
      data: formattedLoads,
      message: `Found ${driverLoads.length} loads for driver`
    });

  } catch (error) {
    console.error('Get driver loads error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get driver earnings summary
app.get('/loads/driver/:driverId/earnings', authenticateToken, async (req, res) => {
  try {
    const { driverId } = req.params;
    
    if (req.userEntity.userType !== UserType.DRIVER || req.user.userId !== driverId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only drivers can access their own earnings.'
      });
    }

    // Get driver profile for total earnings
    const driver = await Driver.findOne({ where: { userId: driverId } });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Calculate this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthLoads = await Load.findAll({
      where: {
        driverId: driverId,
        status: LoadStatus.DELIVERED,
        deliveredAt: {
          [Op.gte]: startOfMonth
        }
      }
    });

    const thisMonthEarnings = monthLoads.reduce((sum, load) => 
      sum + parseFloat(load.budget.toString()), 0
    );

    // Calculate this week's earnings
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekLoads = await Load.findAll({
      where: {
        driverId: driverId,
        status: LoadStatus.DELIVERED,
        deliveredAt: {
          [Op.gte]: startOfWeek
        }
      }
    });

    const thisWeekEarnings = weekLoads.reduce((sum, load) => 
      sum + parseFloat(load.budget.toString()), 0
    );

    const earningsData = {
      totalEarnings: parseFloat(driver.totalEarnings.toString()),
      completedTrips: driver.completedTrips,
      thisMonthEarnings: thisMonthEarnings,
      thisWeekEarnings: thisWeekEarnings
    };

    console.log(`💰 Earnings for driver ${driverId}:`, earningsData);

    res.json({
      success: true,
      data: earningsData,
      message: 'Earnings retrieved successfully'
    });

  } catch (error) {
    console.error('Get driver earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings'
    });
  }
});

app.post('/loads/:loadId/accept', authenticateToken, async (req, res) => {
  try {
    if (req.userEntity.userType !== UserType.DRIVER) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can accept loads'
      });
    }

    const { loadId } = req.params;
    
    // Get driver profile ID from user ID
    const driverProfile = await Driver.findOne({ where: { userId: req.user.userId } });
    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }
    
    // Check if driver already has an active load
    const activeLoad = await Load.findOne({
      where: {
        driverId: driverProfile.id,
        status: {
          [sequelize.Sequelize.Op.in]: [
            LoadStatus.ACCEPTED,
            LoadStatus.IN_TRANSIT,
            LoadStatus.PICKED_UP
          ]
        }
      }
    });
    
    if (activeLoad) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active load. Please complete or cancel your current load before accepting a new one.',
        activeLoadId: activeLoad.id
      });
    }
    
    const load = await Load.findByPk(loadId);
    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found'
      });
    }

    if (load.status !== LoadStatus.POSTED) {
      return res.status(400).json({
        success: false,
        message: 'Load is no longer available'
      });
    }

    // Update load with driver PROFILE ID
    await load.update({
      status: LoadStatus.ACCEPTED,
      driverId: driverProfile.id,
      acceptedAt: new Date()
    });

    // Update driver availability in both User and Driver tables
    await driverProfile.update({
      isAvailable: false,
      totalTrips: driverProfile.totalTrips + 1
    });
    
    await User.update(
      { 
        lastActiveAt: new Date()
      },
      { where: { id: req.user.userId } }
    );

    // Get driver location for broadcast
    const driverForBroadcast = await User.findByPk(req.user.userId);
    if (driverForBroadcast && driverForBroadcast.latitude && driverForBroadcast.longitude) {
      broadcastDriverAvailabilityChange({
        latitude: driverForBroadcast.latitude,
        longitude: driverForBroadcast.longitude
      }, false);
    }

    // Broadcast status change via WebSocket
    broadcastStatusChange(loadId, LoadStatus.POSTED, LoadStatus.ACCEPTED, {
      driverId: req.user.userId,
      acceptedAt: new Date().toISOString()
    });

    // Get complete load details with vendor information for driver
    const completeLoad = await Load.findByPk(loadId, {
      include: [
        { model: Location, as: 'pickupLocation' },
        { model: Location, as: 'dropLocation' },
        {
          model: Vendor,
          as: 'vendorProfile',
          attributes: ['id', 'businessName', 'gstNumber', 'rating', 'totalOrders'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'phone']
          }]
        }
      ]
    });

    // Get driver information for vendor notification
    const driverUser = await User.findByPk(req.user.userId, {
      attributes: ['id', 'name', 'phone'],
      include: [{
        model: Driver,
        as: 'driverProfile',
        attributes: ['vehicle_type', 'vehicle_number', 'license_number', 'rating', 'totalTrips']
      }]
    });
    
    const driver = {
      ...driverUser.toJSON(),
      ...driverUser.driverProfile?.toJSON()
    };

    console.log(`✅ Load ${loadId} accepted by driver ${req.user.userId}`);
    console.log(`📱 Load acceptance details:`);
    console.log(`   🚛 Driver: ${driver.name} (${driver.phone})`);
    console.log(`   🏭 Vendor: ${completeLoad.vendorProfile.user.name} (${completeLoad.vendorProfile.user.phone})`);
    console.log(`   📦 Load: ${completeLoad.weight}kg from ${completeLoad.pickupLocation.address} to ${completeLoad.dropLocation.address}`);
    console.log(`   💰 Budget: ₹${completeLoad.budget}`);

    // 🔔 Push notifications disabled - service not yet implemented
    // TODO: Implement pushNotificationService
    console.log(`📬 Notification: Driver ${driver.name} accepted load ${loadId}`);
    console.log(`📬 Notification: Load assigned to driver ${driver.name}`);

    // Store acceptance notification in Redis for real-time updates
    await redisClient.setEx(`load_acceptance:${loadId}`, 3600, JSON.stringify({
      loadId,
      driverId: req.user.userId,
      driverName: driver.name,
      driverPhone: driver.phone,
      vehicleInfo: `${driver.vehicleType} - ${driver.vehicleNumber}`,
      acceptedAt: new Date().toISOString(),
      vendorId: load.vendorId
    }));

    res.json({
      success: true,
      data: {
        load: {
          ...completeLoad.toJSON(),
          // Full contact details for driver from location associations
          pickupContactDetails: {
            name: completeLoad.pickupLocation?.contactName,
            phone: completeLoad.pickupLocation?.contactPhone,
            address: completeLoad.pickupLocation?.address,
            coordinates: {
              lat: completeLoad.pickupLocation?.latitude,
              lng: completeLoad.pickupLocation?.longitude
            }
          },
          dropContactDetails: {
            name: completeLoad.dropLocation?.contactName,
            phone: completeLoad.dropLocation?.contactPhone,
            address: completeLoad.dropLocation?.address,
            coordinates: {
              lat: completeLoad.dropLocation?.latitude,
              lng: completeLoad.dropLocation?.longitude
            }
          }
        },
        vendor: {
          id: completeLoad.vendorProfile.user.id,
          name: completeLoad.vendorProfile.user.name,
          phone: completeLoad.vendorProfile.user.phone,
          businessName: completeLoad.vendorProfile.businessName,
          gstNumber: completeLoad.vendorProfile.gstNumber,
          rating: completeLoad.vendorProfile.rating
        },
        driver: driver,
        nextSteps: [
          '📞 Contact pickup person before arriving',
          '📍 Start location tracking during trip',
          '📷 Confirm pickup with photo',
          '🚛 Update location during transit',
          '📷 Confirm delivery with photo'
        ]
      },
      message: 'Load accepted successfully! You now have access to complete contact details and trip information.'
    });

  } catch (error) {
    console.error('Accept load error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Live Location Tracking Endpoint
app.post('/loads/:loadId/update-location', authenticateToken, async (req, res) => {
  try {
    if (req.userEntity.userType !== UserType.DRIVER) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can update location'
      });
    }

    const { loadId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Get driver profile ID
    const driverProfile = await Driver.findOne({ where: { userId: req.user.userId } });
    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const load = await Load.findOne({
      where: { 
        id: loadId, 
        driverId: driverProfile.id
      }
    });

    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found or not assigned to you'
      });
    }

    // Check if load is in a state where location can be updated
    const activeStatuses = [LoadStatus.ACCEPTED, LoadStatus.PICKED_UP, LoadStatus.IN_PROGRESS, LoadStatus.IN_TRANSIT];
    if (!activeStatuses.includes(load.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update location for ${load.status} load`,
        currentStatus: load.status
      });
    }

    // Store location in driver_locations table
    await DriverLocation.upsert({
      driverId: driverProfile.id,
      latitude: latitude,
      longitude: longitude,
      accuracy: req.body.accuracy || null,
      speed: req.body.speed || null,
      heading: req.body.heading || null,
      isActive: true
    });

    // Cache location in Redis for real-time tracking (using driver profile ID)
    await RedisLogger.set(`driver_location:${driverProfile.id}`, JSON.stringify({
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      loadId
    }), 300); // 5 minutes

    console.log(`📍 Location updated for driver ${req.user.userId} (profile: ${driverProfile.id}) on load ${loadId}`);

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// Get Live Location for Vendor
app.get('/loads/:loadId/driver-location', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;

    const load = await Load.findOne({
      where: { 
        id: loadId, 
        vendorId: req.user.userId 
      },
      include: [{
        model: User,
        as: 'driver',
        attributes: ['id', 'name', 'phone'],
        include: [{
          model: Driver,
          as: 'driverProfile',
          attributes: ['vehicleType', 'vehicleNumber']
        }]
      }]
    });

    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found or not authorized'
      });
    }

    if (!load.driverId) {
      return res.status(400).json({
        success: false,
        message: 'Load not yet accepted by any driver'
      });
    }

    // Check if load is completed or cancelled
    if (load.status === LoadStatus.COMPLETED || load.status === LoadStatus.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: `Cannot track driver location after load is ${load.status.toLowerCase()}`
      });
    }

    // Get cached location from Redis
    const cachedLocation = await RedisLogger.get(`driver_location:${load.driverId}`);
    
    let locationData = null;

    if (cachedLocation) {
      const parsed = JSON.parse(cachedLocation);
      locationData = {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        lastUpdate: parsed.timestamp,
        isLive: true
      };
    } else {
      // Fall back to driver_locations table
      const driverLocation = await DriverLocation.findOne({
        where: { driverId: load.driverId, isActive: true },
        order: [['created_at', 'DESC']]
      });
      
      if (driverLocation) {
        locationData = {
          latitude: parseFloat(driverLocation.latitude),
          longitude: parseFloat(driverLocation.longitude),
          lastUpdate: driverLocation.createdAt,
          isLive: false
        };
      }
    }

    // Flatten driver data
    const driverData = load.driver ? {
      id: load.driver.id,
      name: load.driver.name,
      phone: load.driver.phone,
      vehicleType: load.driver.driverProfile?.vehicleType,
      vehicleNumber: load.driver.driverProfile?.vehicleNumber
    } : null;

    res.json({
      success: true,
      data: {
        load: {
          id: load.id,
          status: load.status,
          isPickedUp: load.isPickedUp,
          isDropped: load.isDropped
        },
        driver: driverData,
        location: locationData
      }
    });

  } catch (error) {
    console.error('Get driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver location'
    });
  }
});

// Pickup Confirmation Endpoint
app.post('/loads/:loadId/confirm-pickup', authenticateToken, async (req, res) => {
  try {
    if (req.userEntity.userType !== UserType.DRIVER) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can confirm pickup'
      });
    }

    const { loadId } = req.params;
    const { notes } = req.body;

    // Get driver profile ID
    const driverProfile = await Driver.findOne({ where: { userId: req.user.userId } });
    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const load = await Load.findOne({
      where: { 
        id: loadId, 
        driverId: driverProfile.id,
        status: LoadStatus.ACCEPTED
      }
    });

    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found or not in accepted status'
      });
    }

    const updateData = {
      isPickedUp: true,
      pickupConfirmedAt: new Date(),
      status: LoadStatus.IN_PROGRESS
    };

    await load.update(updateData);

    console.log(`📦 Pickup confirmed for load ${loadId} by driver ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Pickup confirmed successfully',
      data: {
        pickupConfirmedAt: updateData.pickupConfirmedAt,
        status: LoadStatus.IN_PROGRESS
      }
    });

  } catch (error) {
    console.error('Confirm pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm pickup'
    });
  }
});

// Drop Confirmation Endpoint
app.post('/loads/:loadId/confirm-drop', authenticateToken, async (req, res) => {
  try {
    if (req.userEntity.userType !== UserType.DRIVER) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can confirm drop'
      });
    }

    const { loadId } = req.params;
    const { notes } = req.body;

    // Get driver profile ID
    const driverProfile = await Driver.findOne({ where: { userId: req.user.userId } });
    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const load = await Load.findOne({
      where: { 
        id: loadId, 
        driverId: driverProfile.id,
        status: LoadStatus.IN_PROGRESS,
        isPickedUp: true
      }
    });

    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found, not in progress, or pickup not confirmed'
      });
    }

    const updateData = {
      isDropped: true,
      dropConfirmedAt: new Date(),
      status: LoadStatus.DELIVERED,
      completedAt: new Date()
    };

    await load.update(updateData);

    // Update driver stats and make available again in Driver profile
    await driverProfile.update({
      isAvailable: true,
      completedTrips: driverProfile.completedTrips + 1,
      totalEarnings: parseFloat(driverProfile.totalEarnings || 0) + parseFloat(load.budget)
    });
    
    // Update vendor stats - get vendor profile and increment completed orders
    const vendorProfile = await Vendor.findByPk(load.vendorId);
    if (vendorProfile) {
      await vendorProfile.update({
        completedOrders: vendorProfile.completedOrders + 1,
        totalOrders: vendorProfile.totalOrders + 1,
        totalSpent: parseFloat(vendorProfile.totalSpent || 0) + parseFloat(load.budget)
      });
      console.log(`📊 Updated vendor stats: completedOrders=${vendorProfile.completedOrders + 1}, totalSpent=${parseFloat(vendorProfile.totalSpent || 0) + parseFloat(load.budget)}`);
    }
    
    await User.update({
      lastActiveAt: new Date()
    }, { where: { id: req.user.userId } });

    console.log(`✅ Drop confirmed for load ${loadId} by driver ${req.user.userId}`);
    console.log(`💰 Driver earnings updated: +₹${load.budget}, total trips: ${driverProfile.completedTrips + 1}`);

    res.json({
      success: true,
      message: 'Drop confirmed successfully. Load completed!',
      data: {
        dropConfirmedAt: updateData.dropConfirmedAt,
        status: LoadStatus.DELIVERED,
        earnings: load.budget
      }
    });

  } catch (error) {
    console.error('Confirm drop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm drop'
    });
  }
});

app.put('/loads/:loadId/status', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;
    const { status } = req.body;
    
    const validStatuses = Object.values(LoadStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const load = await Load.findByPk(loadId);
    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found'
      });
    }

    // Check permissions
    if (req.userEntity.userType === UserType.DRIVER && load.driverId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own loads'
      });
    }

    if (req.userEntity.userType === UserType.VENDOR && load.vendorId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own loads'
      });
    }

    // Update load status
    await load.update({ status });

    // If load is completed, make driver available again
    if (status === LoadStatus.COMPLETED && load.driverId) {
      await User.update(
        { 
          isAvailable: true,
          completedTrips: req.userEntity.completedTrips + 1,
          lastActiveAt: new Date()
        },
        { where: { id: load.driverId } }
      );

      // Broadcast driver availability change
      const completedDriver = await User.findByPk(load.driverId);
      if (completedDriver && completedDriver.latitude && completedDriver.longitude) {
        broadcastDriverAvailabilityChange({
          latitude: completedDriver.latitude,
          longitude: completedDriver.longitude
        }, true);
      }
    }

    console.log(`📊 Load ${loadId} status updated to ${status}`);

    res.json({
      success: true,
      data: load,
      message: 'Load status updated successfully'
    });

  } catch (error) {
    console.error('Update load status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Enhanced driver status update endpoint with automatic location sharing
app.post('/loads/:loadId/driver-status-update', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;
    const { status, location } = req.body;
    
    // Only drivers can use this endpoint
    if (req.userEntity.userType !== UserType.DRIVER) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can update load status'
      });
    }

    const validStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be picked_up, in_transit, or delivered'
      });
    }

    // Get driver profile ID
    const driverProfile = await Driver.findOne({ where: { userId: req.user.userId } });
    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const load = await Load.findByPk(loadId);
    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found'
      });
    }

    // Check if driver is assigned to this load - compare with driver profile ID
    if (load.driverId !== driverProfile.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update loads assigned to you'
      });
    }

    // Update load status
    await load.update({ 
      status,
      updatedAt: new Date()
    });

    // Store status change event
    const statusEvent = {
      loadId,
      driverId: req.user.userId,
      vendorId: load.vendorId,
      status,
      timestamp: new Date().toISOString(),
      location: location || null
    };

    // Store in Redis for real-time updates
    await redisClient.setEx(
      `load_status:${loadId}`,
      3600, // 1 hour
      JSON.stringify(statusEvent)
    );

    // Notify vendor about status change
    await redisClient.publish(
      `status_updates:${load.vendorId}`,
      JSON.stringify({
        type: 'load_status_update',
        loadId,
        status,
        driverName: req.userEntity.name,
        timestamp: statusEvent.timestamp,
        message: getStatusUpdateMessage(status, req.userEntity.name)
      })
    );

    // If picked up, start automatic location sharing
    if (status === 'picked_up') {
      console.log(`🚚 Load ${loadId} picked up - location sharing will start automatically`);
      
      // Set driver as unavailable for new loads in Driver profile
      await driverProfile.update({ isAvailable: false });

      // 🔔 Notification: Load picked up (push notification service not yet implemented)
      console.log(`📬 Notification: Load ${loadId} picked up by driver ${req.userEntity.name}`);
    }

    // If delivered, stop location sharing and update driver stats
    if (status === 'delivered') {
      console.log(`✅ Load ${loadId} delivered - stopping location sharing`);
      
      // Clean up location tracking data
      await redisClient.del(`driver_location:${req.user.userId}`);
      await redisClient.del(`tracking:${loadId}`);
      
      // Update driver stats, earnings, and set back to available
      await driverProfile.update({
        isAvailable: true,
        completedTrips: driverProfile.completedTrips + 1,
        totalEarnings: parseFloat(driverProfile.totalEarnings || 0) + parseFloat(load.budget)
      });
      
      // Update vendor stats
      const vendorProfile = await Vendor.findByPk(load.vendorId);
      if (vendorProfile) {
        await vendorProfile.update({
          completedOrders: vendorProfile.completedOrders + 1,
          totalOrders: vendorProfile.totalOrders + 1,
          totalSpent: parseFloat(vendorProfile.totalSpent || 0) + parseFloat(load.budget)
        });
        console.log(`📊 Updated vendor stats: completedOrders=${vendorProfile.completedOrders + 1}, totalSpent=${parseFloat(vendorProfile.totalSpent || 0) + parseFloat(load.budget)}`);
      }
      
      await User.update(
        { lastActiveAt: new Date() },
        { where: { id: req.user.userId } }
      );
      
      console.log(`💰 Driver earnings updated: +₹${load.budget}, total trips: ${driverProfile.completedTrips + 1}`);

      // 🔔 Notification: Load delivered (push notification service not yet implemented)
      console.log(`📬 Notification: Load ${loadId} delivered by driver ${req.userEntity.name}`);
    }

    console.log(`📊 Driver ${req.userEntity.name} updated load ${loadId} status to ${status}`);

    res.json({
      success: true,
      data: {
        load,
        statusEvent,
        message: `Load status updated to ${status} successfully`
      }
    });

  } catch (error) {
    console.error('Driver status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function for status update messages
function getStatusUpdateMessage(status, driverName) {
  switch (status) {
    case 'picked_up':
      return `📦 ${driverName} has picked up your load and is now sharing live location`;
    case 'in_transit':
      return `🚛 ${driverName} is in transit with your load`;
    case 'delivered':
      return `✅ ${driverName} has delivered your load successfully`;
    default:
      return `📋 Load status updated to ${status}`;
  }
}

// ===================== LOCATION ENDPOINTS =====================

// Enhanced location update endpoint with normalized schema
app.post('/location/update', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (req.userEntity.userType !== UserType.DRIVER) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can update location'
      });
    }

    const { 
      latitude, 
      longitude, 
      accuracy, 
      speed, 
      heading, 
      address,
      loadId // Optional: if tracking a specific load
    } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const driverId = req.user.userId;

    // 1. Update or create current location in driver_locations table
    await DriverLocation.upsert({
      driverId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      speed: speed ? parseFloat(speed) : null,
      heading: heading ? parseFloat(heading) : null,
      address,
      isAvailable: true,
      lastUpdated: new Date()
    }, { transaction });

    // 2. Add to location history for tracking
    await LocationHistory.create({
      driverId,
      loadId: loadId || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      speed: speed ? parseFloat(speed) : null,
      heading: heading ? parseFloat(heading) : null,
      timestamp: new Date(),
      eventType: 'position_update'
    }, { transaction });

    // 3. Store in Redis for fast access
    const locationData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy,
      speed,
      heading,
      address,
      updatedAt: new Date().toISOString()
    };

    await RedisLogger.set(
      `driver_location:${driverId}`,
      JSON.stringify(locationData),
      300 // 5 minutes TTL
    );

    await transaction.commit();

    // 4. Broadcast location update via WebSocket if tracking a specific load
    if (loadId) {
      const broadcastData = {
        driverId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy,
        speed,
        heading,
        address,
        timestamp: new Date().toISOString(),
        loadId
      };
      
      // Broadcast to all clients subscribed to this load
      broadcastLocationUpdate(loadId, broadcastData);
      console.log(`📡 Location update broadcasted for load ${loadId}`);
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// Get available driver count near a location
app.get('/location/drivers/count', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude'
      });
    }

    // Get all available drivers
    const availableDrivers = await User.findAll({
      where: {
        user_type: UserType.DRIVER,
        is_active: true
      },
      include: [{
        model: Driver,
        as: 'driverProfile',
        where: {
          is_available: true
        },
        attributes: ['vehicle_type', 'rating', 'current_location_lat', 'current_location_lng'],
        required: true
      }]
    });

    // Calculate distances and count drivers within different radii
    const driversWithDistance = availableDrivers.map(driver => {
      const driverProfile = driver.driverProfile;
      if (!driverProfile || !driverProfile.current_location_lat || !driverProfile.current_location_lng) {
        return null;
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        driverProfile.current_location_lat,
        driverProfile.current_location_lng
      );

      return {
        driverId: driver.id,
        distance: distance
      };
    }).filter(d => d !== null);

    // Count drivers within 100km and 150km
    const within100km = driversWithDistance.filter(d => d.distance <= 100).length;
    const within150km = driversWithDistance.filter(d => d.distance <= 150).length;

    console.log(`📊 Driver count at (${latitude}, ${longitude}): ${within100km} within 100km, ${within150km} within 150km`);

    res.json({
      success: true,
      data: {
        within100km,
        within150km,
        location: {
          latitude,
          longitude
        }
      }
    });

  } catch (error) {
    console.error('Get driver count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver count'
    });
  }
});

// Debug endpoint to test geocoding
app.post('/debug/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }
    
    console.log(`🧪 DEBUG: Testing geocoding for "${address}"`);
    const coords = await geocodeAddress(address);
    console.log(`🧪 DEBUG: Result: ${coords.lat}, ${coords.lng}`);
    
    res.json({
      success: true,
      address: address,
      coordinates: coords,
      message: 'Geocoding test completed'
    });
  } catch (error) {
    console.error('Debug geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Geocoding test failed'
    });
  }
});

// Get detailed load information - for both drivers and vendors
app.get('/loads/:loadId/details', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;
    const userId = req.user.userId;
    const userType = req.userEntity.userType;

    // Validate loadId
    if (!loadId || loadId === 'undefined' || loadId === 'null') {
      console.error('❌ Invalid loadId received:', loadId);
      return res.status(400).json({ 
        error: 'Invalid load ID provided',
        receivedId: loadId 
      });
    }

    console.log('🔍 Load Details Request:', { loadId, userId, userType });

    // Find the load with all related information
    const load = await Load.findByPk(loadId, {
      include: [
        {
          model: Location,
          as: 'pickupLocation'
        },
        {
          model: Location,
          as: 'dropLocation'
        },
        {
          model: Vendor,
          as: 'vendorProfile',
          attributes: ['id', 'businessName', 'gstNumber', 'rating', 'totalOrders'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'phone']
          }]
        },
        {
          model: Driver,
          as: 'driverProfile',
          attributes: ['id', 'vehicleType', 'vehicleNumber', 'licenseNumber', 'rating', 'totalTrips'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'phone']
          }]
        }
      ]
    });

    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found'
      });
    }

    // Check access permissions - need to compare with profile IDs, not user IDs
    let hasAccess = false;
    if (userType === UserType.VENDOR && load.vendorProfile) {
      hasAccess = load.vendorProfile.user.id === userId;
    } else if (userType === UserType.DRIVER && load.driverProfile) {
      hasAccess = load.driverProfile.user.id === userId;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this load'
      });
    }

    // Extract location data
    const pickupLoc = load.pickupLocation || {};
    const dropLoc = load.dropLocation || {};

    // Prepare detailed response based on user type
    let responseData = {
      load: {
        id: load.id,
        status: load.status,
        weight: load.weight,
        description: load.description,
        vehicleTypeRequired: load.vehicleTypeRequired,
        priority: load.priority,
        budget: load.budget,
        specialInstructions: load.specialInstructions,
        
        // Pickup details from Location association
        pickupAddress: pickupLoc.address || 'Address not available',
        pickupCity: pickupLoc.city,
        pickupState: pickupLoc.state,
        pickupPostalCode: pickupLoc.postalCode,
        pickupDate: load.pickupDate,
        pickupLat: pickupLoc.latitude,
        pickupLng: pickupLoc.longitude,
        pickupContactName: pickupLoc.contactName,
        pickupContactPhone: pickupLoc.contactPhone,
        
        // Drop details from Location association
        dropAddress: dropLoc.address || 'Address not available',
        dropCity: dropLoc.city,
        dropState: dropLoc.state,
        dropPostalCode: dropLoc.postalCode,
        dropLat: dropLoc.latitude,
        dropLng: dropLoc.longitude,
        dropContactName: dropLoc.contactName,
        dropContactPhone: dropLoc.contactPhone,
        
        // Timestamps
        createdAt: load.createdAt,
        acceptedAt: load.acceptedAt,
        startedAt: load.startedAt,
        completedAt: load.completedAt,
        
        // Tracking info
        isPickedUp: load.isPickedUp,
        isDropped: load.isDropped,
        pickupConfirmedAt: load.pickupConfirmedAt,
        dropConfirmedAt: load.dropConfirmedAt,
        driverCurrentLat: load.driverCurrentLat,
        driverCurrentLng: load.driverCurrentLng,
        lastLocationUpdate: load.lastLocationUpdate
      }
    };

    if (userType === UserType.DRIVER) {
      // Driver view - show vendor details and full contact information
      responseData.vendor = load.vendorProfile ? {
        id: load.vendorProfile.user.id,
        name: load.vendorProfile.user.name,
        phone: load.vendorProfile.user.phone,
        businessName: load.vendorProfile.businessName,
        gstNumber: load.vendorProfile.gstNumber,
        rating: load.vendorProfile.rating,
        totalOrders: load.vendorProfile.totalOrders
      } : null;
      responseData.contactDetails = {
        pickup: {
          name: pickupLoc.contactName,
          phone: pickupLoc.contactPhone,
          address: pickupLoc.address,
          coordinates: { lat: pickupLoc.latitude, lng: pickupLoc.longitude }
        },
        drop: {
          name: dropLoc.contactName,
          phone: dropLoc.contactPhone,
          address: dropLoc.address,
          coordinates: { lat: dropLoc.latitude, lng: dropLoc.longitude }
        }
      };
      responseData.instructions = [
        '📞 Contact pickup person before arriving',
        '📍 Use GPS to navigate to pickup location',
        '📷 Take photo when confirming pickup',
        '🚛 Keep location tracking on during transit',
        '📷 Take photo when confirming delivery',
        '📱 Contact vendor if any issues arise'
      ];
    } else {
      // Vendor view - show driver details and tracking information
      responseData.driver = load.driverProfile ? {
        id: load.driverProfile.user.id,
        name: load.driverProfile.user.name,
        phone: load.driverProfile.user.phone,
        vehicleType: load.driverProfile.vehicleType,
        vehicleNumber: load.driverProfile.vehicleNumber,
        licenseNumber: load.driverProfile.licenseNumber,
        rating: load.driverProfile.rating,
        totalTrips: load.driverProfile.totalTrips
      } : null;
      
      // Get driver location from driver_locations table or Redis
      let driverLocation = null;
      if (load.driverId) {
        const cachedLocation = await RedisLogger.get(`driver_location:${load.driverId}`);
        if (cachedLocation) {
          const parsed = JSON.parse(cachedLocation);
          driverLocation = {
            lat: parsed.latitude,
            lng: parsed.longitude,
            lastUpdate: parsed.timestamp
          };
        } else {
          const dbLocation = await DriverLocation.findOne({
            where: { driverId: load.driverId, isActive: true },
            order: [['created_at', 'DESC']]
          });
          if (dbLocation) {
            driverLocation = {
              lat: parseFloat(dbLocation.latitude),
              lng: parseFloat(dbLocation.longitude),
              lastUpdate: dbLocation.createdAt
            };
          }
        }
      }
      
      responseData.trackingInfo = {
        canTrackLive: !!driverLocation,
        lastKnownLocation: driverLocation,
        pickupStatus: load.isPickedUp ? 'Confirmed' : 'Pending',
        deliveryStatus: load.isDropped ? 'Confirmed' : 'Pending'
      };
      responseData.instructions = [
        '📱 You can track driver location in real-time',
        '📞 Driver will contact pickup/drop persons',
        '📷 Photos will be taken for pickup/delivery confirmation',
        '🔔 You\'ll receive notifications for status updates',
        '📱 Contact driver if needed: ' + (responseData.driver?.phone || 'Not available')
      ];
    }

    // Add load progress information
    const statusProgress = {
      'posted': { step: 1, total: 6, description: 'Load posted, waiting for driver' },
      'accepted': { step: 2, total: 6, description: 'Driver assigned, preparing for pickup' },
      'picked_up': { step: 3, total: 6, description: 'Load picked up, in transit' },
      'in_transit': { step: 4, total: 6, description: 'En route to destination' },
      'delivered': { step: 5, total: 6, description: 'Delivered, awaiting confirmation' },
      'completed': { step: 6, total: 6, description: 'Trip completed successfully' }
    };

    responseData.progress = statusProgress[load.status] || statusProgress['posted'];

    console.log(`📋 Load details accessed by ${userType} ${userId} for load ${loadId}`);

    res.json({
      success: true,
      data: responseData,
      message: 'Load details retrieved successfully'
    });

  } catch (error) {
    console.error('Get load details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get load details'
    });
  }
});

// ===================== RATING ENDPOINTS =====================

// Driver rates vendor after completing load
app.post('/loads/:loadId/rate-vendor', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;
    const { rating, feedback } = req.body;

    // Only drivers can rate vendors
    if (req.userEntity.userType !== UserType.DRIVER) {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can rate vendors'
      });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Find the driver profile first
    const driverProfile = await Driver.findOne({
      where: { userId: req.user.userId }
    });

    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Find the load and verify driver is assigned
    const load = await Load.findOne({
      where: { 
        id: loadId, 
        driverId: driverProfile.id, // Use driver profile ID, not user ID
        status: LoadStatus.DELIVERED // Can only rate after delivery
      }
    });

    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found, not assigned to you, or not yet delivered'
      });
    }

    // Get vendor user from the vendor profile ID
    const vendorProfile = await Vendor.findByPk(load.vendorId, {
      include: [{
        model: User,
        as: 'user'
      }]
    });
    
    if (!vendorProfile || !vendorProfile.user) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const vendor = vendorProfile.user;

    // Calculate new average rating for vendor
    const currentRating = parseFloat(vendorProfile.rating) || 5.0;
    const totalOrders = vendorProfile.totalOrders || 0;
    const newTotalOrders = totalOrders + 1;
    const newRating = ((currentRating * totalOrders) + rating) / newTotalOrders;

    // Update vendor profile rating
    await vendorProfile.update({
      rating: newRating,
      totalOrders: newTotalOrders
    });

    // Also update user rating for consistency
    await vendor.update({
      rating: newRating
    });

    // Store rating in Redis for analytics
    await redisClient.setEx(
      `vendor_rating:${vendorProfile.id}:${loadId}`,
      86400 * 30, // 30 days
      JSON.stringify({
        loadId,
        driverId: req.user.userId,
        driverName: req.userEntity.name,
        rating,
        feedback: feedback || null,
        timestamp: new Date().toISOString()
      })
    );

    console.log(`⭐ Driver ${req.user.userId} rated vendor ${vendorProfile.user.id} with ${rating} stars for load ${loadId}`);

    res.json({
      success: true,
      data: {
        newRating: parseFloat(newRating.toFixed(2)),
        totalOrders: newTotalOrders
      },
      message: 'Vendor rated successfully'
    });

  } catch (error) {
    console.error('Rate vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate vendor'
    });
  }
});

// Vendor rates driver after completing load
app.post('/loads/:loadId/rate-driver', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;
    const { rating, review, ratingAspects } = req.body;

    // Only vendors can rate drivers
    if (req.userEntity.userType !== UserType.VENDOR) {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can rate drivers'
      });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5'
      });
    }

    // Find the vendor profile first
    const vendorProfile = await Vendor.findOne({
      where: { userId: req.user.userId }
    });

    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }

    // Find the load and verify vendor owns it
    const load = await Load.findOne({
      where: { 
        id: loadId, 
        vendorId: vendorProfile.id, // Use vendor profile ID, not user ID
        status: LoadStatus.DELIVERED // Can only rate after delivery
      }
    });

    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found, not owned by you, or not yet delivered'
      });
    }

    if (!load.driverId) {
      return res.status(400).json({
        success: false,
        message: 'No driver assigned to this load'
      });
    }

    // Check if rating already exists for this load
    const existingRating = await Rating.findOne({
      where: { loadId: loadId }
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this driver for this load'
      });
    }

    // Get driver profile and user
    const driverProfile = await Driver.findByPk(load.driverId, {
      include: [{
        model: User,
        as: 'user'
      }]
    });
    
    if (!driverProfile || !driverProfile.user) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const driver = driverProfile.user;

    // Create the rating entry (vendorId and driverId are User IDs for Rating table)
    const newRating = await Rating.create({
      loadId: loadId,
      vendorId: req.user.userId, // User ID
      driverId: driver.id, // User ID (not driver profile ID)
      overallRating: rating,
      review: review || null,
      punctualityRating: ratingAspects?.punctuality || null,
      behaviorRating: ratingAspects?.behavior || null,
      vehicleConditionRating: ratingAspects?.vehicleCondition || null,
      careOfGoodsRating: ratingAspects?.careOfGoods || null
    });

    // Calculate new average rating for the driver
    const allRatings = await Rating.findAll({
      where: { driverId: driver.id }, // Use user ID
      attributes: ['overallRating']
    });

    const totalRatings = allRatings.length;
    const sumRatings = allRatings.reduce((sum, r) => sum + r.overallRating, 0);
    const newAverageRating = totalRatings > 0 ? (sumRatings / totalRatings) : 5.0;

    // Update driver rating in User model
    await driver.update({
      rating: newAverageRating.toFixed(2)
    });

    // Update Driver profile
    // Get the load budget to add to earnings
    const loadBudget = parseFloat(load.budget.toString()) || 0;
    const newTotalEarnings = parseFloat(driverProfile.totalEarnings.toString()) + loadBudget;
    
    await driverProfile.update({
      rating: newAverageRating.toFixed(2),
      totalTrips: driverProfile.totalTrips + 1,
      completedTrips: driverProfile.completedTrips + 1,
      totalEarnings: newTotalEarnings
    });
    console.log(`💰 Driver's earnings updated: +₹${loadBudget}, total=₹${newTotalEarnings}`);

    // Update vendor's total_orders and completed_orders (reuse vendorProfile from above)
    if (vendorProfile) {
      await vendorProfile.update({
        totalOrders: vendorProfile.totalOrders + 1,
        completedOrders: vendorProfile.completedOrders + 1
      });
      console.log(`📊 Vendor's stats updated: totalOrders=${vendorProfile.totalOrders + 1}, completedOrders=${vendorProfile.completedOrders + 1}`);
    }

    // Store rating in Redis for quick access
    await redisClient.setEx(
      `driver_rating:${load.driverId}:${loadId}`,
      86400 * 90, // 90 days
      JSON.stringify({
        id: newRating.id,
        loadId,
        vendorId: req.user.userId,
        vendorName: req.userEntity.name,
        rating,
        review: review || null,
        ratingAspects: ratingAspects || null,
        timestamp: new Date().toISOString()
      })
    );

    console.log(`⭐ Vendor ${req.user.userId} rated driver ${load.driverId} with ${rating} stars for load ${loadId}`);
    console.log(`📊 Driver's new average rating: ${newAverageRating.toFixed(2)} (based on ${totalRatings} ratings)`);

    res.json({
      success: true,
      data: {
        ratingId: newRating.id,
        newAverageRating: parseFloat(newAverageRating.toFixed(2)),
        totalRatings: totalRatings
      },
      message: 'Driver rated successfully'
    });

  } catch (error) {
    console.error('❌ Rate driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate driver',
      error: error.message
    });
  }
});

// Get driver's ratings and reviews
app.get('/drivers/:driverId/ratings', authenticateToken, async (req, res) => {
  try {
    const { driverId } = req.params;

    // Get all ratings for this driver
    const ratings = await Rating.findAll({
      where: { driverId },
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'phone']
        },
        {
          model: Load,
          as: 'load',
          attributes: ['id', 'pickupAddress', 'dropAddress', 'deliveredAt']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate statistics
    const totalRatings = ratings.length;
    const avgRating = totalRatings > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
      : 5.0;

    const ratingDistribution = {
      5: ratings.filter(r => r.rating === 5).length,
      4: ratings.filter(r => r.rating === 4).length,
      3: ratings.filter(r => r.rating === 3).length,
      2: ratings.filter(r => r.rating === 2).length,
      1: ratings.filter(r => r.rating === 1).length
    };

    res.json({
      success: true,
      data: {
        averageRating: parseFloat(avgRating.toFixed(2)),
        totalRatings,
        ratingDistribution,
        ratings: ratings.map(r => ({
          id: r.id,
          rating: r.rating,
          review: r.review,
          ratingAspects: r.ratingAspects,
          createdAt: r.createdAt,
          vendor: {
            id: r.vendor.id,
            name: r.vendor.name,
            phone: r.vendor.phone
          },
          load: {
            id: r.load.id,
            pickupAddress: r.load.pickupAddress,
            dropAddress: r.load.dropAddress,
            deliveredAt: r.load.deliveredAt
          }
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get driver ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver ratings',
      error: error.message
    });
  }
});

// (Error + 404 handlers moved to the end of the file so all routes are registered first)

// WebSocket client management
const websocketClients = new Map(); // Map of userId -> WebSocket connection
const loadSubscriptions = new Map(); // Map of loadId -> Set of userIds

// WebSocket authentication helper
function authenticateWebSocket(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Broadcast location update to subscribed clients
function broadcastLocationUpdate(loadId, locationData) {
  const subscribers = loadSubscriptions.get(loadId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify({
    type: 'location_update',
    loadId: loadId,
    data: locationData,
    timestamp: new Date().toISOString()
  });

  subscribers.forEach(userId => {
    const client = websocketClients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast status change to subscribed clients
// Broadcast driver availability change to all vendors
function broadcastDriverAvailabilityChange(location, isAvailable) {
  const message = JSON.stringify({
    type: 'driver_availability_change',
    data: {
      location,
      isAvailable,
      timestamp: new Date().toISOString()
    }
  });

  // Send to all connected vendor clients
  websocketClients.forEach((client, userId) => {
    if (client && client.readyState === WebSocket.OPEN) {
      // Check if user is a vendor (you could filter by userType if stored)
      client.send(message);
    }
  });
  
  console.log(`📡 Broadcasted driver availability change: ${isAvailable ? 'available' : 'unavailable'}`);
}

function broadcastStatusChange(loadId, oldStatus, newStatus, additionalData = {}) {
  const subscribers = loadSubscriptions.get(loadId);
  if (!subscribers || subscribers.size === 0) return;
  const message = JSON.stringify({
    type: 'status_change',
    loadId: loadId,
    data: {
      oldStatus,
      newStatus,
      ...additionalData
    },
    timestamp: new Date().toISOString()
  });

  subscribers.forEach(userId => {
    const client = websocketClients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Initialize and start server
async function startServer() {
  try {
    // Test database connections
    await sequelize.authenticate();
    console.log('🗄️  PostgreSQL connection established');

    // Sync database models (create tables if they don't exist)
    // Using alter: false to avoid schema conflicts with existing views
    await sequelize.sync({ alter: false });
    console.log('🗄️  Database models synchronized');

    // Create HTTP server
    const server = http.createServer(app);

    // Create WebSocket server
    const wss = new WebSocket.Server({ 
      server,
      path: '/ws' // WebSocket endpoint will be ws://localhost:3001/ws
    });

    // WebSocket connection handler
    wss.on('connection', (ws, req) => {
      console.log('🔗 New WebSocket connection established');
      
      let userId = null;
      let userType = null;

      // Handle WebSocket messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📨 WebSocket message received:', data.type);

          switch (data.type) {
            case 'authenticate':
              // Authenticate the WebSocket connection
              const authData = authenticateWebSocket(data.token);
              if (authData) {
                userId = authData.userId;
                userType = authData.userType;
                websocketClients.set(userId, ws);
                
                ws.send(JSON.stringify({
                  type: 'auth_success',
                  message: 'WebSocket authenticated successfully',
                  userId: userId,
                  userType: userType
                }));
                
                console.log(`✅ WebSocket authenticated: ${userType} ${userId}`);
              } else {
                ws.send(JSON.stringify({
                  type: 'auth_error',
                  message: 'Invalid token'
                }));
                console.log('❌ WebSocket authentication failed');
              }
              break;

            case 'subscribe':
              // Subscribe to load updates
              if (!userId) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Must authenticate before subscribing'
                }));
                return;
              }

              const loadId = data.loadId;
              if (!loadSubscriptions.has(loadId)) {
                loadSubscriptions.set(loadId, new Set());
              }
              loadSubscriptions.get(loadId).add(userId);
              
              ws.send(JSON.stringify({
                type: 'subscription_success',
                loadId: loadId,
                message: `Subscribed to load ${loadId} updates`
              }));
              
              console.log(`📡 User ${userId} subscribed to load ${loadId}`);
              break;

            case 'unsubscribe':
              // Unsubscribe from load updates
              const unsubLoadId = data.loadId;
              if (loadSubscriptions.has(unsubLoadId)) {
                loadSubscriptions.get(unsubLoadId).delete(userId);
                if (loadSubscriptions.get(unsubLoadId).size === 0) {
                  loadSubscriptions.delete(unsubLoadId);
                }
              }
              
              ws.send(JSON.stringify({
                type: 'unsubscription_success',
                loadId: unsubLoadId,
                message: `Unsubscribed from load ${unsubLoadId} updates`
              }));
              
              console.log(`📡 User ${userId} unsubscribed from load ${unsubLoadId}`);
              break;

            case 'ping':
              // Keep-alive ping
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
              }));
              break;

            default:
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type'
              }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      // Handle WebSocket close
      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        if (userId) {
          websocketClients.delete(userId);
          
          // Remove from all subscriptions
          loadSubscriptions.forEach((subscribers, loadId) => {
            subscribers.delete(userId);
            if (subscribers.size === 0) {
              loadSubscriptions.delete(loadId);
            }
          });
        }
      });

      // Handle WebSocket error
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'WebSocket connection established. Please authenticate.',
        timestamp: new Date().toISOString()
      }));
    });


    // Start HTTP server with WebSocket support
    server.listen(PORT, '0.0.0.0', () => {
      // Dynamically detect local IP address
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let localIP = 'localhost';
      
      // Try to find the main network interface IP
      for (const interfaceName of Object.keys(networkInterfaces)) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
          // Skip internal (loopback) and non-IPv4 addresses
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
          }
        }
        if (localIP !== 'localhost') break;
      }
      
      console.log('\n' + '🎉'.repeat(80));
      console.log(`🚀 POSTGRESQL + REDIS + WEBSOCKET SERVER RUNNING`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`📱 Mobile: http://${localIP}:${PORT}`);
      console.log(`🏥 Health: http://${localIP}:${PORT}/health`);
      console.log(`🔗 WebSocket: ws://${localIP}:${PORT}/ws`);
      console.log('\n📊 REAL DATABASE FEATURES:');
      console.log('   ✅ PostgreSQL for persistent data');
      console.log('   ✅ Redis for real-time features');  
      console.log('   ✅ WebSocket for live updates');
      console.log('   ✅ Full query logging enabled');
      console.log('   ✅ User authentication & authorization');
      console.log('   ✅ Load management system');
      console.log('   ✅ Real-time location tracking');
      console.log('\n🔐 API ENDPOINTS:');
      console.log('   📱 /auth/* - Authentication');
      console.log('   📦 /loads/* - Load management');
      console.log('   📍 /location/* - Location services');
      console.log('   🔗 /ws - WebSocket real-time updates');
      console.log('🎉'.repeat(80) + '\n');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await sequelize.close();
  await redisClient.disconnect();
  process.exit(0);
});

// ============================================================================
// 🚀 ENHANCED LIVE TRACKING SYSTEM
// ============================================================================

// Real-time location streaming endpoint
app.post('/loads/:loadId/stream-location', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;
    const { lat, lng, heading, speed, accuracy, timestamp } = req.body;
    const userId = req.user.userId;
    const userType = req.userEntity.userType;

    // Get driver profile ID if user is a driver
    let driverProfileId = null;
    if (userType === UserType.DRIVER) {
      const driverProfile = await Driver.findOne({ where: { userId: userId } });
      if (!driverProfile) {
        return res.status(404).json({
          success: false,
          message: 'Driver profile not found'
        });
      }
      driverProfileId = driverProfile.id;
    }

    // Verify driver is assigned to this load
    const load = await Load.findByPk(loadId, {
      include: [
        { model: Location, as: 'pickupLocation' },
        { model: Location, as: 'dropLocation' }
      ]
    });
    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found'
      });
    }

    if (userType !== UserType.DRIVER || load.driverId !== driverProfileId) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned driver can stream location'
      });
    }

    // Check if load is in a state where location can be streamed
    const activeStatuses = [LoadStatus.ACCEPTED, LoadStatus.PICKED_UP, LoadStatus.IN_PROGRESS, LoadStatus.IN_TRANSIT];
    if (!activeStatuses.includes(load.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot stream location for ${load.status} load`,
        currentStatus: load.status
      });
    }

    const now = new Date();
    
    // Store location in driver_locations table instead of load model
    await DriverLocation.upsert({
      driverId: driverProfileId,
      latitude: lat,
      longitude: lng,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      isActive: true
    });

    // Create enhanced location data
    const locationData = {
      loadId,
      driverId: driverProfileId,
      lat,
      lng,
      heading: heading || 0,
      speed: speed || 0,
      accuracy: accuracy || 0,
      timestamp: timestamp || now.toISOString(),
      status: load.status
    };

    // Store in Redis for real-time access with 1-hour expiry
    const cacheKey = `live_location:${loadId}`;
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(locationData));

    // Store in location history (non-blocking)
    storeLocationHistory(loadId, locationData).catch(err => 
      console.error('Background history storage error:', err)
    );

    // Calculate ETA if load is in transit
    let eta = null;
    if (load.status === 'accepted' || load.status === 'in_transit') {
      const destination = load.isPickedUp ? 
        { lat: load.dropLocation?.latitude, lng: load.dropLocation?.longitude } : 
        { lat: load.pickupLocation?.latitude, lng: load.pickupLocation?.longitude };
      
      if (destination.lat && destination.lng) {
        eta = await calculateETA(lat, lng, destination.lat, destination.lng, speed);
      }
    }

    // Check geofencing for pickup/drop zones
    const geofenceAlerts = await checkGeofencing(load, lat, lng);

    // Broadcast to vendor via Redis pub/sub
    const trackingUpdate = {
      loadId,
      location: locationData,
      eta,
      geofenceAlerts,
      lastUpdate: now.toISOString()
    };

    await redisClient.publish(`tracking:${load.vendorId}`, JSON.stringify(trackingUpdate));

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        eta,
        geofenceAlerts,
        nextUpdateIn: 30 // seconds
      }
    });

  } catch (error) {
    console.error('Error streaming location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream location'
    });
  }
});

// Live tracking dashboard for vendors
app.get('/loads/:loadId/live-tracking', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;
    const userId = req.user.userId;
    const userType = req.userEntity.userType;

    const load = await Load.findByPk(loadId, {
      include: [
        { model: Location, as: 'pickupLocation' },
        { model: Location, as: 'dropLocation' },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'name', 'phone'],
          include: [{
            model: Driver,
            as: 'driverProfile',
            attributes: ['vehicleType', 'vehicleNumber']
          }]
        }
      ]
    });

    if (!load) {
      return res.status(404).json({
        success: false,
        message: 'Load not found'
      });
    }

    // Check access permissions
    const hasAccess = (userType === UserType.VENDOR && load.vendorId === userId) ||
                     (userType === UserType.DRIVER && load.driverId === userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Flatten driver data
    const driverData = load.driver ? {
      id: load.driver.id,
      name: load.driver.name,
      phone: load.driver.phone,
      vehicleType: load.driver.driverProfile?.vehicleType,
      vehicleNumber: load.driver.driverProfile?.vehicleNumber
    } : null;

    // Get live location data from Redis
    const cacheKey = `live_location:${loadId}`;
    const liveLocationData = await redisClient.get(cacheKey);
    
    let currentLocation = null;
    let eta = null;
    
    if (liveLocationData) {
      const locationData = JSON.parse(liveLocationData);
      currentLocation = {
        lat: locationData.lat,
        lng: locationData.lng,
        heading: locationData.heading,
        speed: locationData.speed,
        accuracy: locationData.accuracy,
        lastUpdate: locationData.timestamp
      };

      // Recalculate ETA
      if (load.status === 'accepted' || load.status === 'in_transit') {
        const destination = load.isPickedUp ? 
          { lat: load.dropLocation?.latitude, lng: load.dropLocation?.longitude } : 
          { lat: load.pickupLocation?.latitude, lng: load.pickupLocation?.longitude };
        
        if (destination.lat && destination.lng) {
          eta = await calculateETA(
            locationData.lat, 
            locationData.lng, 
            destination.lat, 
            destination.lng, 
            locationData.speed
          );
        }
      }
    }

    // Get route information
    const routeInfo = await getOptimizedRoute(load, currentLocation);

    // Get location history (last 50 points)
    const locationHistory = await getLocationHistory(loadId);

    res.json({
      success: true,
      data: {
        load: {
          id: load.id,
          status: load.status,
          isPickedUp: load.isPickedUp,
          isDropped: load.isDropped,
          pickup: {
            address: load.pickupLocation?.address,
            lat: load.pickupLocation?.latitude,
            lng: load.pickupLocation?.longitude,
            contactName: load.pickupLocation?.contactName,
            contactPhone: load.pickupLocation?.contactPhone
          },
          drop: {
            address: load.dropLocation?.address,
            lat: load.dropLocation?.latitude,
            lng: load.dropLocation?.longitude,
            contactName: load.dropLocation?.contactName,
            contactPhone: load.dropLocation?.contactPhone
          }
        },
        driver: driverData,
        tracking: {
          isLive: !!currentLocation,
          currentLocation,
          eta,
          routeInfo,
          locationHistory: locationHistory.slice(-50), // Last 50 points
          lastUpdate: currentLocation?.lastUpdate || load.lastLocationUpdate
        },
        geofences: {
          pickup: {
            center: { 
              lat: load.pickupLocation?.latitude, 
              lng: load.pickupLocation?.longitude 
            },
            radius: 500 // meters
          },
          drop: {
            center: { 
              lat: load.dropLocation?.latitude, 
              lng: load.dropLocation?.longitude 
            },
            radius: 500 // meters
          }
        }
      }
    });

  } catch (error) {
    console.error('Error getting live tracking data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tracking data'
    });
  }
});

// Location history endpoint
app.get('/loads/:loadId/location-history', authenticateToken, async (req, res) => {
  try {
    const { loadId } = req.params;
    const { limit = 100, from, to } = req.query;
    
    const history = await getLocationHistory(loadId, {
      limit: parseInt(limit),
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null
    });

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error getting location history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location history'
    });
  }
});

// Helper Functions for Live Tracking
async function calculateETA(fromLat, fromLng, toLat, toLng, currentSpeed = 0) {
  try {
    // Calculate distance using Haversine formula
    const distance = getDistanceBetweenPoints(fromLat, fromLng, toLat, toLng);
    
    // Estimate speed (if no current speed, use average city speed)
    const estimatedSpeed = currentSpeed > 5 ? currentSpeed : 40; // km/h
    
    // Calculate ETA in minutes
    const etaMinutes = Math.round((distance / estimatedSpeed) * 60);
    
    return {
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      estimatedSpeed,
      etaMinutes,
      etaText: formatETA(etaMinutes)
    };
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return null;
  }
}

function formatETA(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}

async function checkGeofencing(load, currentLat, currentLng) {
  const alerts = [];
  const geofenceRadius = 0.5; // 500 meters in km

  try {
    // Check pickup geofence
    if (!load.isPickedUp && load.pickupLocation) {
      const distanceToPickup = getDistanceBetweenPoints(
        currentLat, currentLng, 
        load.pickupLocation.latitude, load.pickupLocation.longitude
      );

      if (distanceToPickup <= geofenceRadius) {
        alerts.push({
          type: 'pickup_zone_entered',
          message: 'Driver has entered pickup zone',
          location: 'pickup',
          distance: Math.round(distanceToPickup * 1000) // meters
        });
      }
    }

    // Check drop geofence
    if (load.isPickedUp && !load.isDropped && load.dropLocation) {
      const distanceToDrop = getDistanceBetweenPoints(
        currentLat, currentLng, 
        load.dropLocation.latitude, load.dropLocation.longitude
      );

      if (distanceToDrop <= geofenceRadius) {
        alerts.push({
          type: 'drop_zone_entered',
          message: 'Driver has entered delivery zone',
          location: 'drop',
          distance: Math.round(distanceToDrop * 1000) // meters
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error checking geofencing:', error);
    return [];
  }
}

async function getOptimizedRoute(load, currentLocation) {
  try {
    if (!currentLocation) return null;

    const waypoints = [];
    
    // Add pickup if not picked up
    if (!load.isPickedUp && load.pickupLocation) {
      waypoints.push({
        lat: load.pickupLocation.latitude,
        lng: load.pickupLocation.longitude,
        type: 'pickup',
        address: load.pickupLocation.address
      });
    }
    
    // Add drop location
    if (load.dropLocation) {
      waypoints.push({
        lat: load.dropLocation.latitude,
        lng: load.dropLocation.longitude,
        type: 'drop',
        address: load.dropLocation.address
      });
    }

    // Calculate total distance and estimated time
    let totalDistance = 0;
    let estimatedTime = 0;

    for (let i = 0; i < waypoints.length; i++) {
      const fromLat = i === 0 ? currentLocation.lat : waypoints[i-1].lat;
      const fromLng = i === 0 ? currentLocation.lng : waypoints[i-1].lng;
      
      const distance = getDistanceBetweenPoints(
        fromLat, fromLng, 
        waypoints[i].lat, waypoints[i].lng
      );
      
      totalDistance += distance;
      estimatedTime += (distance / 40) * 60; // 40 km/h average speed
    }

    return {
      waypoints,
      totalDistance: Math.round(totalDistance * 10) / 10,
      estimatedTime: Math.round(estimatedTime),
      optimized: true
    };

  } catch (error) {
    console.error('Error getting optimized route:', error);
    return null;
  }
}

async function getLocationHistory(loadId, options = {}) {
  try {
    // For now, we'll use a simple Redis-based history
    // In production, you might want to use a proper time-series database
    const historyKey = `location_history:${loadId}`;
    const history = await redisClient.lRange(historyKey, 0, options.limit || 100);
    
    return history.map(item => JSON.parse(item)).reverse();
  } catch (error) {
    console.error('Error getting location history:', error);
    return [];
  }
}

// ===================== ENHANCED NORMALIZED ENDPOINTS =====================

// Get driver current location (for map display)
app.get('/drivers/:driverId/current-location', authenticateToken, async (req, res) => {
  try {
    const { driverId } = req.params;

    // First try Redis (faster)
    const cachedLocation = await RedisLogger.get(`driver_location:${driverId}`);
    if (cachedLocation) {
      const locationData = JSON.parse(cachedLocation);
      return res.json({
        success: true,
        data: {
          ...locationData,
          source: 'cache'
        }
      });
    }

    // Fallback to database
    const currentLocation = await DriverLocation.findOne({
      where: { driverId },
      order: [['created_at', 'DESC']]
    });

    if (!currentLocation) {
      return res.json({
        success: true,
        data: null,
        message: 'No current location available'
      });
    }

    res.json({
      success: true,
      data: {
        latitude: parseFloat(currentLocation.latitude),
        longitude: parseFloat(currentLocation.longitude),
        accuracy: currentLocation.accuracy ? parseFloat(currentLocation.accuracy) : null,
        speed: currentLocation.speed ? parseFloat(currentLocation.speed) : null,
        heading: currentLocation.heading ? parseFloat(currentLocation.heading) : null,
        address: currentLocation.address,
        updatedAt: currentLocation.lastUpdated,
        source: 'database'
      }
    });

  } catch (error) {
    console.error('Error getting driver location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver location'
    });
  }
});

// Utility function for distance calculation
function getDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Store location in history (call this from stream-location endpoint)
async function storeLocationHistory(loadId, locationData) {
  try {
    const historyKey = `location_history:${loadId}`;
    await redisClient.lPush(historyKey, JSON.stringify(locationData));
    await redisClient.lTrim(historyKey, 0, 1000); // Keep last 1000 points
    await redisClient.expire(historyKey, 86400); // 24 hours
  } catch (error) {
    console.error('Error storing location history:', error);
  }
}

// Error handling middleware (registered at end so it doesn't intercept later routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler (registered at end so all routes are available first)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await sequelize.close();
  await redisClient.disconnect();
  process.exit(0);
});

// Start the server
startServer();
