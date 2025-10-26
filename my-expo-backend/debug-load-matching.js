// Debug Load Matching Issue
const { Sequelize, DataTypes } = require('sequelize');

// Database configuration (matching your server)
const sequelize = new Sequelize('postgres://postgres:password@localhost:5432/load_management', {
  logging: (sql, timing) => {
    console.log(`🗄️  SQL: ${sql.slice(0, 100)}${sql.length > 100 ? '...' : ''}`);
  }
});

// Define models (matching your server structure)
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  phone: {
    type: DataTypes.STRING(15),
    unique: true,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('driver', 'vendor'),
    allowNull: false
  },
  name: DataTypes.STRING(100),
  vehicleType: DataTypes.STRING(50),
  vehicleCapacity: DataTypes.FLOAT,
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

const Load = sequelize.define('Load', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vendorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  weight: DataTypes.FLOAT,
  description: DataTypes.TEXT,
  vehicleTypeRequired: DataTypes.STRING(50),
  priority: DataTypes.STRING(20),
  status: DataTypes.STRING(20),
  pickupLat: DataTypes.FLOAT,
  pickupLng: DataTypes.FLOAT,
  pickupAddress: DataTypes.TEXT,
  pickupDate: DataTypes.DATE,
  dropLat: DataTypes.FLOAT,
  dropLng: DataTypes.FLOAT,
  dropAddress: DataTypes.TEXT,
  budget: DataTypes.DECIMAL(10, 2)
});

// Distance calculation function (matching your server)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function debugLoadMatching() {
  try {
    console.log('🔍 DEBUGGING LOAD MATCHING ISSUE');
    console.log('=' .repeat(50));
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check all users
    const allUsers = await User.findAll();
    console.log(`\n👥 TOTAL USERS: ${allUsers.length}`);
    
    const drivers = allUsers.filter(u => u.type === 'driver');
    const vendors = allUsers.filter(u => u.type === 'vendor');
    
    console.log(`   🚛 Drivers: ${drivers.length}`);
    console.log(`   🏭 Vendors: ${vendors.length}`);
    
    if (drivers.length > 0) {
      console.log('\n🚛 DRIVER DETAILS:');
      drivers.forEach(d => {
        console.log(`   ID: ${d.id}, Name: ${d.name}, Phone: ${d.phone}`);
        console.log(`   Vehicle: ${d.vehicleType}, Capacity: ${d.vehicleCapacity}`);
        console.log(`   Available: ${d.isAvailable}`);
        console.log('   ---');
      });
    }
    
    // Check all loads
    const allLoads = await Load.findAll();
    console.log(`\n📦 TOTAL LOADS: ${allLoads.length}`);
    
    const availableLoads = allLoads.filter(l => l.status === 'posted');
    console.log(`   📦 Available: ${availableLoads.length}`);
    
    if (availableLoads.length > 0) {
      console.log('\n📦 AVAILABLE LOAD DETAILS:');
      availableLoads.forEach(load => {
        console.log(`   ID: ${load.id}, Vendor: ${load.vendorId}`);
        console.log(`   From: ${load.pickupAddress} (${load.pickupLat}, ${load.pickupLng})`);
        console.log(`   To: ${load.dropAddress} (${load.dropLat}, ${load.dropLng})`);
        console.log(`   Vehicle: ${load.vehicleTypeRequired}, Weight: ${load.weight}`);
        console.log(`   Budget: ₹${load.budget}`);
        console.log('   ---');
      });
    }
    
    // Test distance calculation from Markapur
    if (availableLoads.length > 0) {
      console.log('\n📍 DISTANCE ANALYSIS FROM MARKAPUR:');
      
      // Markapur coordinates (approximate)
      const markapurLat = 15.7324;
      const markapurLng = 79.2699;
      
      console.log(`Driver location: Markapur (${markapurLat}, ${markapurLng})`);
      
      availableLoads.forEach(load => {
        const distance = calculateDistance(
          markapurLat, markapurLng,
          load.pickupLat, load.pickupLng
        );
        
        console.log(`\n   Load ${load.id}: ${load.pickupAddress}`);
        console.log(`   Distance: ${distance.toFixed(2)} km`);
        console.log(`   Within 20km: ${distance <= 20 ? '✅ YES' : '❌ NO'}`);
      });
    }
    
    // Test the enhanced geocoding
    console.log('\n🌍 TESTING ENHANCED GEOCODING:');
    try {
      const IndiaGeocodingService = require('./india-geocoding-service.js');
      const geocoder = new IndiaGeocodingService();
      
      const markapurResult = await geocoder.geocode('Markapur, Andhra Pradesh');
      console.log('Markapur geocoding:', markapurResult);
      
      const gunturResult = await geocoder.geocode('Guntur, Andhra Pradesh');
      console.log('Guntur geocoding:', gunturResult);
      
    } catch (geoError) {
      console.log('❌ Geocoding service error:', geoError.message);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the debug
debugLoadMatching();
