const axios = require('axios');

// Your current location (Vijayawada)
const driverLocation = {
  lat: 16.316232,
  lng: 80.4325246
};

// Create a pickup location about 8km away (northeast)
// Using approximate offset: 0.07° ≈ 7-8km
const pickupLocation = {
  lat: driverLocation.lat + 0.05,  // ~5.5km north
  lng: driverLocation.lng + 0.05,  // ~5.5km east
  // This will be approximately 7.8km away diagonally
};

// Create a drop location about 15km away from pickup
const dropLocation = {
  lat: pickupLocation.lat + 0.1,
  lng: pickupLocation.lng + 0.1
};

console.log('🎯 Creating test load near your location');
console.log(`📍 Driver location: ${driverLocation.lat}, ${driverLocation.lng}`);
console.log(`📍 Pickup location: ${pickupLocation.lat}, ${pickupLocation.lng}`);
console.log(`📍 Drop location: ${dropLocation.lat}, ${dropLocation.lng}`);

// Calculate approximate distance using Haversine
function calculateDistance(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return earthRadius * c;
}

const distanceToPickup = calculateDistance(
  driverLocation.lat, driverLocation.lng,
  pickupLocation.lat, pickupLocation.lng
);

console.log(`📏 Distance from driver to pickup: ${distanceToPickup.toFixed(2)} km`);

// You need to replace this with a valid vendor token
const VENDOR_TOKEN = 'YOUR_VENDOR_TOKEN_HERE';

async function createTestLoad() {
  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const loadData = {
      pickupLat: pickupLocation.lat,
      pickupLng: pickupLocation.lng,
      pickupAddress: `Test Pickup Location (${distanceToPickup.toFixed(1)}km from driver)`,
      dropLat: dropLocation.lat,
      dropLng: dropLocation.lng,
      dropAddress: 'Test Drop Location',
      weight: 500,
      description: 'Test load for progressive search testing - within 50km radius',
      vehicleTypeRequired: 'truck',
      pickupDate: tomorrow.toISOString(),
      budget: 5000,
      priority: 'medium'
    };

    console.log('\n📤 Posting load to backend...\n');

    const response = await axios.post(
      'http://192.168.137.225:3001/loads',
      loadData,
      {
        headers: {
          'Authorization': `Bearer ${VENDOR_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Load created successfully!');
    console.log(`📦 Load ID: ${response.data.load.id}`);
    console.log(`📍 Pickup: ${response.data.load.pickupAddress}`);
    console.log(`📍 Drop: ${response.data.load.dropAddress}`);
    console.log(`📏 Distance from driver: ${distanceToPickup.toFixed(2)} km`);
    console.log('\n🎉 Now refresh your mobile app to see the load!');

  } catch (error) {
    console.error('❌ Error creating load:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    
    console.log('\n⚠️  NOTE: You need to replace VENDOR_TOKEN with a valid token');
    console.log('Login as a vendor first to get the token, or I can help you with that.');
  }
}

// Only run if token is provided
if (VENDOR_TOKEN === 'YOUR_VENDOR_TOKEN_HERE') {
  console.log('\n⚠️  Please edit this file and replace VENDOR_TOKEN with your actual vendor token');
  console.log('Or run this script with: VENDOR_TOKEN=your_token_here node create-test-load-nearby.js');
  
  // Check if token provided via environment variable
  if (process.env.VENDOR_TOKEN) {
    console.log('✅ Using token from environment variable');
    const VENDOR_TOKEN_ENV = process.env.VENDOR_TOKEN;
    // Re-run with env token
    axios.post(
      'http://192.168.137.225:3001/loads',
      {
        pickupLat: pickupLocation.lat,
        pickupLng: pickupLocation.lng,
        pickupAddress: `Test Pickup Location (${distanceToPickup.toFixed(1)}km from driver)`,
        dropLat: dropLocation.lat,
        dropLng: dropLocation.lng,
        dropAddress: 'Test Drop Location',
        weight: 500,
        description: 'Test load for progressive search testing - within 50km radius',
        vehicleTypeRequired: 'truck',
        pickupDate: new Date(Date.now() + 86400000).toISOString(),
        budget: 5000,
        priority: 'medium'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.VENDOR_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    ).then(response => {
      console.log('✅ Load created successfully!');
      console.log(`📦 Load ID: ${response.data.load.id}`);
      console.log(`📏 Distance from driver: ${distanceToPickup.toFixed(2)} km`);
    }).catch(error => {
      console.error('❌ Error:', error.response?.data || error.message);
    });
  }
} else {
  createTestLoad();
}
