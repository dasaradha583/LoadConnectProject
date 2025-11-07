const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize('load_management', 'dasaradha', 'password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

// Define User model
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  phone: { type: DataTypes.STRING(15), allowNull: false, unique: true, field: 'phone' },
  name: { type: DataTypes.STRING, allowNull: false, field: 'name' },
  user_type: { type: DataTypes.ENUM('driver', 'vendor', 'admin'), allowNull: false, field: 'user_type' },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// Define Vendor model
const Vendor = sequelize.define('Vendor', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'user_id' },
  business_name: { type: DataTypes.STRING(100), allowNull: false, field: 'business_name' },
  gst_number: { type: DataTypes.STRING(20), unique: true, allowNull: true, field: 'gst_number' },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 5.0, field: 'rating' },
  total_orders: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_orders' },
}, {
  tableName: 'vendors',
  timestamps: true,
  underscored: true
});

async function checkVendorProfile() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get vendor with phone 0987654321
    const vendor = await User.findOne({ 
      where: { 
        phone: '0987654321',
        user_type: 'vendor'
      }
    });

    if (!vendor) {
      console.error('❌ Vendor with phone 0987654321 not found');
      console.log('\n💡 Please register a vendor with phone: 0987654321');
      return;
    }

    console.log('✅ Found vendor user:', {
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      userType: vendor.user_type
    });

    // Get vendor profile
    const vendorProfile = await Vendor.findOne({
      where: { user_id: vendor.id }
    });

    if (!vendorProfile) {
      console.error('\n❌ Vendor profile not found in vendors table');
      console.log('💡 The vendor was registered but the profile was not created');
      return;
    }

    console.log('\n✅ Vendor profile found:', {
      id: vendorProfile.id,
      userId: vendorProfile.user_id,
      businessName: vendorProfile.business_name,
      gstNumber: vendorProfile.gst_number,
      rating: vendorProfile.rating,
      totalOrders: vendorProfile.total_orders
    });

    // Check if business_name and gst_number are null
    if (!vendorProfile.business_name) {
      console.log('\n⚠️  business_name is NULL or empty');
    }
    if (!vendorProfile.gst_number) {
      console.log('⚠️  gst_number is NULL or empty');
    }

    if (!vendorProfile.business_name || !vendorProfile.gst_number) {
      console.log('\n💡 To fix this, you can either:');
      console.log('1. Re-register the vendor with correct business name and GST');
      console.log('2. Or manually update the database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkVendorProfile();
