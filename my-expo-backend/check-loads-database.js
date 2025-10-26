// Check Loads Database - Debug Script
const { Sequelize, DataTypes } = require('sequelize');

// Database connection (matching your server configuration)
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'load_management',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  logging: false, // Disable SQL logging for cleaner output
});

// Define Load model (matching server structure)
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
  pickupContactName: DataTypes.STRING(100),
  pickupContactPhone: DataTypes.STRING(15),
  dropLat: DataTypes.FLOAT,
  dropLng: DataTypes.FLOAT,
  dropAddress: DataTypes.TEXT,
  dropContactName: DataTypes.STRING(100),
  dropContactPhone: DataTypes.STRING(15),
  budget: DataTypes.DECIMAL(10, 2),
  specialInstructions: DataTypes.TEXT,
  acceptedAt: DataTypes.DATE,
  pickedUpAt: DataTypes.DATE,
  deliveredAt: DataTypes.DATE,
  completedAt: DataTypes.DATE
});

// Distance calculation function
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

async function checkLoadsDatabase() {
  try {
    console.log('🔍 CHECKING LOADS DATABASE');
    console.log('=' .repeat(60));
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Get all loads
    const allLoads = await Load.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📦 TOTAL LOADS IN DATABASE: ${allLoads.length}\n`);
    
    if (allLoads.length === 0) {
      console.log('❌ NO LOADS FOUND IN DATABASE');
      console.log('   This explains why drivers see 0 loads!');
      return;
    }
    
    // Your driver location from the logs
    const driverLat = 15.902735;
    const driverLng = 79.2987017;
    console.log(`🚛 DRIVER LOCATION: ${driverLat}, ${driverLng}`);
    console.log(`📍 (This is ~19km from Markapur)\n`);
    
    // Analyze each load
    allLoads.forEach((load, index) => {
      console.log(`📦 LOAD ${index + 1}:`);
      console.log(`   ID: ${load.id}`);
      console.log(`   Vendor: ${load.vendorId}`);
      console.log(`   Status: ${load.status}`);
      console.log(`   Weight: ${load.weight} tons`);
      console.log(`   Vehicle Required: ${load.vehicleTypeRequired}`);
      console.log(`   Budget: ₹${load.budget}`);
      console.log(`   Created: ${load.createdAt}`);
      
      console.log(`\n   📍 PICKUP LOCATION:`);
      console.log(`      Address: ${load.pickupAddress}`);
      console.log(`      Coordinates: ${load.pickupLat}, ${load.pickupLng}`);
      
      console.log(`   📍 DROP LOCATION:`);  
      console.log(`      Address: ${load.dropAddress}`);
      console.log(`      Coordinates: ${load.dropLat}, ${load.dropLng}`);
      
      // Calculate distance from driver to pickup location
      if (load.pickupLat && load.pickupLng) {
        const distance = calculateDistance(
          driverLat, driverLng,
          load.pickupLat, load.pickupLng
        );
        
        console.log(`\n   📏 DISTANCE ANALYSIS:`);
        console.log(`      Driver to Pickup: ${distance.toFixed(2)} km`);
        console.log(`      Within 50km radius: ${distance <= 50 ? '✅ YES' : '❌ NO'}`);
        console.log(`      Within 20km radius: ${distance <= 20 ? '✅ YES' : '❌ NO'}`);
        
        // Check if this load should be visible to driver
        const shouldBeVisible = distance <= 50 && load.status === 'posted' && !load.driverId;
        console.log(`      Should be visible to driver: ${shouldBeVisible ? '✅ YES' : '❌ NO'}`);
        
        if (!shouldBeVisible) {
          console.log(`      ❌ REASONS WHY NOT VISIBLE:`);
          if (distance > 50) console.log(`         - Distance ${distance.toFixed(2)}km > 50km limit`);
          if (load.status !== 'posted') console.log(`         - Status '${load.status}' != 'posted'`);
          if (load.driverId) console.log(`         - Already assigned to driver ${load.driverId}`);
        }
      } else {
        console.log(`\n   ❌ MISSING COORDINATES - This is the problem!`);
        console.log(`      pickupLat: ${load.pickupLat}`);
        console.log(`      pickupLng: ${load.pickupLng}`);
      }
      
      console.log('   ' + '─'.repeat(50));
    });
    
    // Summary
    const availableLoads = allLoads.filter(l => l.status === 'posted' && !l.driverId);
    const loadsWithCoordinates = availableLoads.filter(l => l.pickupLat && l.pickupLng);
    const loadsInRange = loadsWithCoordinates.filter(l => {
      const distance = calculateDistance(driverLat, driverLng, l.pickupLat, l.pickupLng);
      return distance <= 50;
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total loads: ${allLoads.length}`);
    console.log(`   Available loads (posted, unassigned): ${availableLoads.length}`);
    console.log(`   Available loads with coordinates: ${loadsWithCoordinates.length}`);
    console.log(`   Available loads within 50km: ${loadsInRange.length}`);
    
    if (loadsInRange.length === 0) {
      console.log(`\n🔍 ROOT CAUSE IDENTIFIED:`);
      if (availableLoads.length === 0) {
        console.log(`   ❌ No available loads (all loads are taken or wrong status)`);
      } else if (loadsWithCoordinates.length === 0) {
        console.log(`   ❌ No loads have valid coordinates (geocoding failed)`);
      } else {
        console.log(`   ❌ No loads within 50km of driver location`);
      }
    } else {
      console.log(`\n✅ ${loadsInRange.length} loads should be visible to the driver!`);
      console.log(`   There might be an issue with the API response or mobile app.`);
    }
    
  } catch (error) {
    console.error('❌ Database check error:', error.message);
    if (error.original) {
      console.error('   Database error:', error.original.message);
    }
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkLoadsDatabase();
