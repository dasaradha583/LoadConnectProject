/**
 * LoadConnect - Complete Application Test Suite
 * 
 * This script tests the entire application flow:
 * 1. Admin login and user approvals
 * 2. Driver registration and onboarding
 * 3. Vendor registration and onboarding
 * 4. Load posting and management
 * 5. Load acceptance and assignment
 * 6. Live tracking simulation
 * 7. Delivery and proof of delivery
 * 8. Ratings and reviews
 * 9. Push notifications
 * 10. Payment calculations
 * 
 * Usage: node complete-application-test.js
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://192.0.0.2:3001';
const TEST_MODE = true;
const TIMESTAMP = Date.now().toString().slice(-9); // Last 9 digits of timestamp

// Test data
const testData = {
  admin: {
    username: 'superadmin',
    password: 'Admin@123'
  },
  driver: {
    phone: `9${TIMESTAMP}`, // Unique 10-digit phone number for each test run (9 + 9 digits = 10 total)
    name: 'Rajesh Kumar',
    licenseNumber: `DL${TIMESTAMP}`,
    vehicleType: 'truck',
    vehicleCapacity: 10,
    vehicleNumber: `MH12AB${TIMESTAMP.slice(0,4)}`,
    location: { latitude: 19.0760, longitude: 72.8777 } // Mumbai
  },
  vendor: {
    phone: `8${TIMESTAMP}`, // Unique 10-digit phone number for each test run (8 + 9 digits = 10 total)
    name: 'ABC Logistics',
    businessName: 'ABC Pvt Ltd',
    gstNumber: `GST${TIMESTAMP}`,
    location: { latitude: 19.0760, longitude: 72.8777 }
  },
  load: {
    weight: 500,
    description: 'Electronics shipment - Test Load',
    vehicleTypeRequired: 'truck',
    budget: 5000,
    pickupAddress: 'Mumbai, Maharashtra',
    pickupLat: 19.0760,
    pickupLng: 72.8777,
    dropAddress: 'Delhi, India',
    dropLat: 28.6139,
    dropLng: 77.2090,
    pickupContactName: 'John Doe',
    pickupContactPhone: '9876543210',
    dropContactName: 'Jane Smith',
    dropContactPhone: '9876543211',
    specialInstructions: 'Handle with care - fragile items',
    priority: 'high'
  }
};

// Store tokens and IDs
const testState = {
  adminToken: null,
  driverToken: null,
  driverUserId: null,
  driverProfileId: null,
  vendorToken: null,
  vendorUserId: null,
  vendorProfileId: null,
  loadId: null,
  testResults: {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(80) + '\n');
}

function logTest(name, status, details = '') {
  testState.testResults.total++;
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  
  if (status === 'PASS') testState.testResults.passed++;
  if (status === 'FAIL') testState.testResults.failed++;
  
  testState.testResults.tests.push({ name, status, details });
  log(`${icon} ${name}`, color);
  if (details) log(`   ${details}`, 'reset');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data }),
      timeout: 10000 // 10 second timeout
    };

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timeout',
        status: 408
      };
    }
    return {
      success: false,
      error: error.response?.data || error.message || 'Unknown error',
      status: error.response?.status
    };
  }
}

// Test functions

async function testServerHealth() {
  logSection('1. SERVER HEALTH CHECK');
  
  const result = await makeRequest('GET', '/health');
  if (result.success) {
    logTest('Server is running', 'PASS', `Status: ${result.status}`);
    log(`   Response: ${JSON.stringify(result.data, null, 2)}`, 'blue');
  } else {
    logTest('Server is running', 'FAIL', `Error: ${result.error}`);
    process.exit(1);
  }
}

async function testAdminLogin() {
  logSection('2. ADMIN LOGIN');
  
  const result = await makeRequest('POST', '/api/auth/admin/login', {
    username: testData.admin.username,
    password: testData.admin.password
  });

  if (result.success && result.data.data?.tokens?.accessToken) {
    testState.adminToken = result.data.data.tokens.accessToken;
    logTest('Admin login successful', 'PASS', `Token received`);
    log(`   Admin ID: ${result.data.data.user?.id}`, 'blue');
    log(`   Admin Level: ${result.data.data.user?.adminLevel}`, 'blue');
  } else {
    logTest('Admin login successful', 'FAIL', `Error: ${JSON.stringify(result.error || result.data)}`);
  }
}

async function testDriverRegistration() {
  logSection('3. DRIVER REGISTRATION');
  
  // Step 1: Send OTP
  log('Step 1: Sending OTP...', 'yellow');
  const otpResult = await makeRequest('POST', '/auth/send-otp', {
    phone: testData.driver.phone
  });

  if (otpResult.success) {
    logTest('OTP sent to driver', 'PASS', `Phone: ${testData.driver.phone}`);
    log(`   OTP: 123456 (test mode)`, 'blue');
  } else {
    logTest('OTP sent to driver', 'FAIL', `Error: ${JSON.stringify(otpResult.error)}`);
    return;
  }

  await sleep(1000);

  // Step 2: Register Driver (skip signin check, go straight to registration with unique phone)
  log('\nStep 2: Registering driver profile...', 'yellow');
  const registerResult = await makeRequest('POST', '/auth/register/driver', {
    phone: testData.driver.phone,
    otp: '123456', // Required for registration
    name: testData.driver.name,
    licenseNumber: testData.driver.licenseNumber,
    vehicleType: testData.driver.vehicleType,
    vehicleCapacity: testData.driver.vehicleCapacity,
    vehicleNumber: testData.driver.vehicleNumber
  });

  if (registerResult.success && registerResult.data.data?.tokens) {
    testState.driverToken = registerResult.data.data.tokens.accessToken;
    testState.driverUserId = registerResult.data.data.user?.id;
    logTest('Driver registration successful', 'PASS', `User ID: ${testState.driverUserId}`);
    log(`   Name: ${testData.driver.name}`, 'blue');
    log(`   Vehicle: ${testData.driver.vehicleType} (${testData.driver.vehicleCapacity} tons)`, 'blue');
  } else {
    logTest('Driver registration successful', 'FAIL', `Error: ${JSON.stringify(registerResult.error || registerResult.data)}`);
  }
}

async function testVendorRegistration() {
  logSection('4. VENDOR REGISTRATION');
  
  // Step 1: Send OTP
  log('Step 1: Sending OTP...', 'yellow');
  const otpResult = await makeRequest('POST', '/auth/send-otp', {
    phone: testData.vendor.phone
  });

  if (otpResult.success) {
    logTest('OTP sent to vendor', 'PASS', `Phone: ${testData.vendor.phone}`);
  } else {
    logTest('OTP sent to vendor', 'FAIL', `Error: ${JSON.stringify(otpResult.error)}`);
    return;
  }

  await sleep(1000);

  // Step 2: Register Vendor (skip signin check, go straight to registration with unique phone)
  log('\nStep 2: Registering vendor profile...', 'yellow');
  const registerResult = await makeRequest('POST', '/auth/register/vendor', {
    phone: testData.vendor.phone,
    otp: '123456', // Required for registration
    name: testData.vendor.name,
    businessName: testData.vendor.businessName,
    gstNumber: testData.vendor.gstNumber
  });

  if (registerResult.success && registerResult.data.data?.tokens) {
    testState.vendorToken = registerResult.data.data.tokens.accessToken;
    testState.vendorUserId = registerResult.data.data.user?.id;
    logTest('Vendor registration successful', 'PASS', `User ID: ${testState.vendorUserId}`);
    log(`   Business: ${testData.vendor.businessName}`, 'blue');
    log(`   GST: ${testData.vendor.gstNumber}`, 'blue');
  } else {
    logTest('Vendor registration successful', 'FAIL', `Error: ${JSON.stringify(registerResult.error || registerResult.data)}`);
  }
}

async function testUserApprovals() {
  logSection('5. ADMIN USER APPROVALS');
  
  if (!testState.adminToken) {
    logTest('Admin approval process', 'FAIL', 'Admin token not available');
    return;
  }

  // Step 1: Get pending users
  log('Step 1: Fetching pending users...', 'yellow');
  const pendingResult = await makeRequest('GET', '/api/admin/pending-users', null, testState.adminToken);
  
  if (pendingResult.success) {
    const count = pendingResult.data.users?.length || 0;
    logTest('Fetched pending users', 'PASS', `Count: ${count}`);
  } else {
    logTest('Fetched pending users', 'FAIL', `Error: ${JSON.stringify(pendingResult.error)}`);
  }

  await sleep(1000);

  // Step 2: Approve Driver
  if (testState.driverUserId) {
    log('\nStep 2: Approving driver...', 'yellow');
    const approveDriverResult = await makeRequest(
      'POST',
      `/api/admin/approve-user/${testState.driverUserId}`,
      { comments: 'Approved for testing - Driver license verified' },
      testState.adminToken
    );

    if (approveDriverResult.success) {
      logTest('Driver approved', 'PASS', `User ID: ${testState.driverUserId}`);
      log(`   Driver can now see and accept loads`, 'blue');
    } else {
      logTest('Driver approved', 'FAIL', `Error: ${JSON.stringify(approveDriverResult.error)}`);
    }
  }

  await sleep(1000);

  // Step 3: Approve Vendor
  if (testState.vendorUserId) {
    log('\nStep 3: Approving vendor...', 'yellow');
    const approveVendorResult = await makeRequest(
      'POST',
      `/api/admin/approve-user/${testState.vendorUserId}`,
      { comments: 'Approved for testing - Business details verified' },
      testState.adminToken
    );

    if (approveVendorResult.success) {
      logTest('Vendor approved', 'PASS', `User ID: ${testState.vendorUserId}`);
      log(`   Vendor can now post loads`, 'blue');
    } else {
      logTest('Vendor approved', 'FAIL', `Error: ${JSON.stringify(approveVendorResult.error || approveVendorResult.data)}`);
    }
  }

  // Wait for approval changes to propagate
  await sleep(2000);
}

async function testLocationUpdate() {
  logSection('6. LOCATION UPDATES');
  
  // Update driver location
  if (testState.driverToken) {
    log('Updating driver location...', 'yellow');
    const locationResult = await makeRequest(
      'POST',
      '/location/update',
      testData.driver.location,
      testState.driverToken
    );

    if (locationResult.success) {
      logTest('Driver location updated', 'PASS', 
        `Lat: ${testData.driver.location.latitude}, Lng: ${testData.driver.location.longitude}`);
    } else {
      logTest('Driver location updated', 'FAIL', `Error: ${JSON.stringify(locationResult.error)}`);
    }
  }

  await sleep(500);

  // Check driver count
  log('\nChecking nearby drivers count...', 'yellow');
  const countResult = await makeRequest(
    'GET',
    `/location/drivers/count?lat=${testData.vendor.location.latitude}&lng=${testData.vendor.location.longitude}`,
    null,
    testState.vendorToken
  );

  if (countResult.success) {
    const count = countResult.data.count || 0;
    logTest('Nearby drivers query', 'PASS', `Found ${count} drivers nearby`);
  } else {
    logTest('Nearby drivers query', 'FAIL', `Error: ${JSON.stringify(countResult.error)}`);
  }
}

async function testLoadPosting() {
  logSection('7. LOAD POSTING (VENDOR)');
  
  if (!testState.vendorToken) {
    logTest('Load posting', 'FAIL', 'Vendor token not available');
    return;
  }

  log('Posting new load...', 'yellow');
  const loadResult = await makeRequest(
    'POST',
    '/loads',
    testData.load,
    testState.vendorToken
  );

  if (loadResult.success && loadResult.data?.data?.load) {
    testState.loadId = loadResult.data.data.load.id;
    logTest('Load posted successfully', 'PASS', `Load ID: ${testState.loadId}`);
    log(`   Route: ${testData.load.pickupAddress} → ${testData.load.dropAddress}`, 'blue');
    log(`   Weight: ${testData.load.weight}kg`, 'blue');
    log(`   Budget: ₹${testData.load.budget}`, 'blue');
    log(`   Status: ${loadResult.data.data.load.status}`, 'blue');
    
    if (loadResult.data.data.notifiedDrivers) {
      log(`   📬 Notified ${loadResult.data.data.notifiedDrivers} nearby drivers`, 'green');
    }
  } else {
    logTest('Load posted successfully', 'FAIL', `Error: ${JSON.stringify(loadResult.error || loadResult.data)}`);
  }
}

async function testAvailableLoads() {
  logSection('8. AVAILABLE LOADS (DRIVER)');
  
  if (!testState.driverToken) {
    logTest('Fetch available loads', 'FAIL', 'Driver token not available');
    return;
  }

  log('Fetching available loads for driver...', 'yellow');
  const loadsResult = await makeRequest(
    'GET',
    `/loads/available?latitude=${testData.driver.location.latitude}&longitude=${testData.driver.location.longitude}`,
    null,
    testState.driverToken
  );

  if (loadsResult.success) {
    const loads = loadsResult.data?.data?.loads || loadsResult.data?.loads || [];
    logTest('Fetched available loads', 'PASS', `Found ${loads.length} available loads`);
    
    if (loads.length > 0) {
      const testLoad = loads.find(l => l.id === testState.loadId);
      if (testLoad) {
        log(`   ✓ Test load is visible to driver`, 'green');
        log(`   Distance: ${testLoad.distance?.toFixed(2) || 'N/A'} km`, 'blue');
      } else {
        log(`   ⚠ Test load not found in available loads`, 'yellow');
      }
    }
  } else {
    logTest('Fetched available loads', 'FAIL', `Error: ${JSON.stringify(loadsResult.error || loadsResult.data)}`);
  }
}

async function testLoadDetails() {
  logSection('9. LOAD DETAILS');
  
  if (!testState.loadId || !testState.driverToken) {
    logTest('Fetch load details', 'FAIL', 'Load ID or driver token not available');
    return;
  }

  log('Fetching load details...', 'yellow');
  const detailsResult = await makeRequest(
    'GET',
    `/loads/${testState.loadId}/details`,
    null,
    testState.driverToken
  );

  if (detailsResult.success && detailsResult.data?.data?.load) {
    const load = detailsResult.data.data.load;
    logTest('Fetched load details', 'PASS', `Load ID: ${load.id}`);
    log(`   Status: ${load.status}`, 'blue');
    log(`   Weight: ${load.weight}kg`, 'blue');
    log(`   Budget: ₹${load.budget}`, 'blue');
    log(`   Vendor: ${load.vendor_name || 'N/A'}`, 'blue');
  } else {
    logTest('Fetched load details', 'FAIL', `Error: ${JSON.stringify(detailsResult.error || detailsResult.data)}`);
  }
}

async function testLoadAcceptance() {
  logSection('10. LOAD ACCEPTANCE (DRIVER)');
  
  if (!testState.loadId || !testState.driverToken) {
    logTest('Accept load', 'FAIL', 'Load ID or driver token not available');
    return;
  }

  log('Driver accepting load...', 'yellow');
  const acceptResult = await makeRequest(
    'POST',
    `/loads/${testState.loadId}/accept`,
    {},
    testState.driverToken
  );

  if (acceptResult.success) {
    logTest('Load accepted successfully', 'PASS', `Load ID: ${testState.loadId}`);
    log(`   Driver assigned to load`, 'green');
    log(`   📬 Vendor should receive notification`, 'blue');
  } else {
    logTest('Load accepted successfully', 'FAIL', `Error: ${JSON.stringify(acceptResult.error)}`);
  }
}

async function testPickupConfirmation() {
  logSection('11. PICKUP CONFIRMATION');
  
  if (!testState.loadId || !testState.driverToken) {
    logTest('Mark as picked up', 'FAIL', 'Load ID or driver token not available');
    return;
  }

  log('Marking load as picked up...', 'yellow');
  const pickupResult = await makeRequest(
    'POST',
    `/loads/${testState.loadId}/driver-status-update`,
    {
      status: 'picked_up',
      latitude: testData.load.pickupLat,
      longitude: testData.load.pickupLng,
      notes: 'Picked up from warehouse - all items verified'
    },
    testState.driverToken
  );

  if (pickupResult.success) {
    logTest('Load marked as picked up', 'PASS', `Load ID: ${testState.loadId}`);
    log(`   Status: picked_up`, 'green');
    log(`   📬 Vendor should receive pickup notification`, 'blue');
  } else {
    logTest('Load marked as picked up', 'FAIL', `Error: ${JSON.stringify(pickupResult.error)}`);
  }
}

async function testLiveTracking() {
  logSection('12. LIVE TRACKING SIMULATION');
  
  if (!testState.driverToken) {
    logTest('Live tracking', 'FAIL', 'Driver token not available');
    return;
  }

  log('Simulating location updates during trip...', 'yellow');
  
  // Simulate 5 location updates along the route
  const routePoints = [
    { lat: 19.0760, lng: 72.8777, city: 'Mumbai (Start)' },
    { lat: 20.5937, lng: 78.9629, city: 'En route (Nagpur area)' },
    { lat: 23.2599, lng: 77.4126, city: 'En route (Bhopal area)' },
    { lat: 26.9124, lng: 75.7873, city: 'En route (Jaipur area)' },
    { lat: 28.6139, lng: 77.2090, city: 'Delhi (Destination)' }
  ];

  for (let i = 0; i < routePoints.length; i++) {
    const point = routePoints[i];
    const updateResult = await makeRequest(
      'POST',
      '/location/update',
      { latitude: point.lat, longitude: point.lng },
      testState.driverToken
    );

    if (updateResult.success) {
      logTest(`Location update ${i + 1}/5`, 'PASS', `${point.city}`);
    } else {
      logTest(`Location update ${i + 1}/5`, 'FAIL', `Error: ${JSON.stringify(updateResult.error)}`);
    }

    if (i < routePoints.length - 1) {
      await sleep(1000); // Wait 1 second between updates
    }
  }

  log('\n   ✓ Driver location tracked throughout journey', 'green');
}

async function testDeliveryConfirmation() {
  logSection('13. DELIVERY CONFIRMATION');
  
  if (!testState.loadId || !testState.driverToken) {
    logTest('Mark as delivered', 'FAIL', 'Load ID or driver token not available');
    return;
  }

  log('Marking load as delivered...', 'yellow');
  const deliveryResult = await makeRequest(
    'POST',
    `/loads/${testState.loadId}/driver-status-update`,
    {
      status: 'delivered',
      latitude: testData.load.dropLat,
      longitude: testData.load.dropLng,
      notes: 'Delivered successfully - received by Jane Smith',
      proofOfDelivery: 'base64_encoded_image_data_would_go_here'
    },
    testState.driverToken
  );

  if (deliveryResult.success) {
    logTest('Load marked as delivered', 'PASS', `Load ID: ${testState.loadId}`);
    log(`   Status: delivered`, 'green');
    log(`   📬 Vendor should receive delivery notification`, 'blue');
    log(`   💰 Driver earnings should be calculated`, 'blue');
  } else {
    logTest('Load marked as delivered', 'FAIL', `Error: ${JSON.stringify(deliveryResult.error)}`);
  }
}

async function testRatings() {
  logSection('14. RATINGS & REVIEWS');
  
  if (!testState.loadId) {
    logTest('Ratings', 'FAIL', 'Load ID not available');
    return;
  }

  // Driver rates vendor
  if (testState.driverToken) {
    log('Driver rating vendor...', 'yellow');
    const driverRatingResult = await makeRequest(
      'POST',
      `/loads/${testState.loadId}/rate-vendor`,
      {
        rating: 4,
        review: 'Good communication, clear instructions. Payment on time.'
      },
      testState.driverToken
    );

    if (driverRatingResult.success) {
      logTest('Driver rated vendor', 'PASS', `Rating: 4/5 stars`);
    } else {
      logTest('Driver rated vendor', 'FAIL', `Error: ${JSON.stringify(driverRatingResult.error)}`);
    }
  }

  await sleep(1000);

  // Vendor rates driver
  if (testState.vendorToken) {
    log('\nVendor rating driver...', 'yellow');
    const vendorRatingResult = await makeRequest(
      'POST',
      `/loads/${testState.loadId}/rate-driver`,
      {
        rating: 5,
        review: 'Excellent service! Delivered on time, goods in perfect condition.'
      },
      testState.vendorToken
    );

    if (vendorRatingResult.success) {
      logTest('Vendor rated driver', 'PASS', `Rating: 5/5 stars`);
    } else {
      logTest('Vendor rated driver', 'FAIL', `Error: ${JSON.stringify(vendorRatingResult.error)}`);
    }
  }
}

async function testNotifications() {
  logSection('15. NOTIFICATION SYSTEM');
  
  // Get vendor notifications
  if (testState.vendorUserId && testState.vendorToken) {
    log('Fetching vendor notifications...', 'yellow');
    const vendorNotifResult = await makeRequest(
      'GET',
      `/notifications/vendor/${testState.vendorUserId}/latest`,
      null,
      testState.vendorToken
    );

    if (vendorNotifResult.success) {
      const notifications = vendorNotifResult.data?.data?.notifications || vendorNotifResult.data?.notifications || [];
      logTest('Vendor notifications', 'PASS', `Received ${notifications.length} notifications`);
      
      if (notifications.length > 0) {
        log(`   Latest notifications:`, 'blue');
        notifications.slice(0, 3).forEach(notif => {
          log(`     - ${notif.title}: ${notif.body}`, 'blue');
        });
      }
    } else {
      logTest('Vendor notifications', 'FAIL', `Error: ${JSON.stringify(vendorNotifResult.error || vendorNotifResult.data)}`);
    }
  }

  await sleep(500);

  // Get driver notifications
  if (testState.driverUserId && testState.driverToken) {
    log('\nFetching driver notifications...', 'yellow');
    const driverNotifResult = await makeRequest(
      'GET',
      `/notifications/driver/${testState.driverUserId}/latest`,
      null,
      testState.driverToken
    );

    if (driverNotifResult.success) {
      const notifications = driverNotifResult.data?.data?.notifications || driverNotifResult.data?.notifications || [];
      logTest('Driver notifications', 'PASS', `Received ${notifications.length} notifications`);
      
      if (notifications.length > 0) {
        log(`   Latest notifications:`, 'blue');
        notifications.slice(0, 3).forEach(notif => {
          log(`     - ${notif.title}: ${notif.body}`, 'blue');
        });
      }
    } else {
      logTest('Driver notifications', 'FAIL', `Error: ${JSON.stringify(driverNotifResult.error || driverNotifResult.data)}`);
    }
  }
}

async function testDriverEarnings() {
  logSection('16. DRIVER EARNINGS');
  
  if (!testState.driverUserId || !testState.driverToken) {
    logTest('Driver earnings', 'FAIL', 'Driver ID or token not available');
    return;
  }

  log('Fetching driver earnings...', 'yellow');
  const earningsResult = await makeRequest(
    'GET',
    `/loads/driver/${testState.driverUserId}/earnings`,
    null,
    testState.driverToken
  );

  if (earningsResult.success) {
    const earnings = earningsResult.data?.data || earningsResult.data || {};
    logTest('Driver earnings calculated', 'PASS', `Total: ₹${earnings.totalEarnings || 0}`);
    log(`   Completed trips: ${earnings.completedTrips || 0}`, 'blue');
    log(`   Average per trip: ₹${earnings.averageEarnings || 0}`, 'blue');
    log(`   This month: ₹${earnings.monthlyEarnings || 0}`, 'blue');
  } else {
    logTest('Driver earnings calculated', 'FAIL', `Error: ${JSON.stringify(earningsResult.error || earningsResult.data)}`);
  }
}

async function testVendorLoads() {
  logSection('17. VENDOR LOAD MANAGEMENT');
  
  if (!testState.vendorUserId || !testState.vendorToken) {
    logTest('Vendor loads', 'FAIL', 'Vendor ID or token not available');
    return;
  }

  log('Fetching vendor\'s loads...', 'yellow');
  const loadsResult = await makeRequest(
    'GET',
    `/loads/vendor/${testState.vendorUserId}`,
    null,
    testState.vendorToken
  );

  if (loadsResult.success) {
    const loads = loadsResult.data?.data?.loads || loadsResult.data?.loads || [];
    logTest('Fetched vendor loads', 'PASS', `Total loads: ${loads.length}`);
    
    if (loads.length > 0) {
      const statusCounts = loads.reduce((acc, load) => {
        acc[load.status] = (acc[load.status] || 0) + 1;
        return acc;
      }, {});
      
      log(`   Status breakdown:`, 'blue');
      Object.entries(statusCounts).forEach(([status, count]) => {
        log(`     - ${status}: ${count}`, 'blue');
      });
    }
  } else {
    logTest('Fetched vendor loads', 'FAIL', `Error: ${JSON.stringify(loadsResult.error || loadsResult.data)}`);
  }
}

async function printTestSummary() {
  logSection('TEST SUMMARY');
  
  const { total, passed, failed } = testState.testResults;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  
  log(`Total Tests: ${total}`, 'bright');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, 'red');
  log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  
  console.log('\n' + '='.repeat(80));
  log('  TEST DETAILS', 'cyan');
  console.log('='.repeat(80) + '\n');
  
  testState.testResults.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${icon} ${test.name}`);
    if (test.details) {
      console.log(`   ${test.details}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  
  if (passed === total) {
    log('  🎉 ALL TESTS PASSED! 🎉', 'green');
  } else if (passRate >= 90) {
    log('  ✅ Most tests passed - Minor issues detected', 'yellow');
  } else if (passRate >= 70) {
    log('  ⚠️  Some tests failed - Review required', 'yellow');
  } else {
    log('  ❌ Many tests failed - Immediate attention needed', 'red');
  }
  
  console.log('='.repeat(80) + '\n');
}

async function printTestState() {
  logSection('TEST STATE & CREDENTIALS');
  
  log('Test User Credentials:', 'bright');
  console.log(`
  Admin:
    Username: ${testData.admin.username}
    Password: ${testData.admin.password}
    Token: ${testState.adminToken ? 'Available' : 'Not available'}

  Driver (Rajesh Kumar):
    Phone: ${testData.driver.phone}
    OTP: 123456 (test mode)
    User ID: ${testState.driverUserId || 'Not created'}
    Token: ${testState.driverToken ? 'Available' : 'Not available'}
    Vehicle: ${testData.driver.vehicleType} (${testData.driver.vehicleCapacity} tons)
    License: ${testData.driver.licenseNumber}

  Vendor (ABC Logistics):
    Phone: ${testData.vendor.phone}
    OTP: 123456 (test mode)
    User ID: ${testState.vendorUserId || 'Not created'}
    Token: ${testState.vendorToken ? 'Available' : 'Not available'}
    Business: ${testData.vendor.businessName}
    GST: ${testData.vendor.gstNumber}

  Test Load:
    ID: ${testState.loadId || 'Not created'}
    Route: ${testData.load.pickupAddress} → ${testData.load.dropAddress}
    Weight: ${testData.load.weight}kg
    Budget: ₹${testData.load.budget}
  `);
}

// Main test execution
async function runAllTests() {
  try {
    log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'bright');
    log('║                   LoadConnect - Complete Application Test                 ║', 'bright');
    log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'bright');
    
    log(`Base URL: ${BASE_URL}`, 'blue');
    log(`Test Mode: ${TEST_MODE ? 'Enabled' : 'Disabled'}`, 'blue');
    log(`Started: ${new Date().toLocaleString()}\n`, 'blue');

    // Run all tests sequentially
    await testServerHealth();
    await sleep(500);
    
    await testAdminLogin();
    await sleep(500);
    
    await testDriverRegistration();
    await sleep(500);
    
    await testVendorRegistration();
    await sleep(500);
    
    await testUserApprovals();
    await sleep(500);
    
    await testLocationUpdate();
    await sleep(500);
    
    await testLoadPosting();
    await sleep(500);
    
    await testAvailableLoads();
    await sleep(500);
    
    await testLoadAcceptance();
    await sleep(1000);
    
    await testLoadDetails();
    await sleep(500);
    
    await testPickupConfirmation();
    await sleep(1000);
    
    await testLiveTracking();
    await sleep(1000);
    
    await testDeliveryConfirmation();
    await sleep(1000);
    
    await testRatings();
    await sleep(500);
    
    await testNotifications();
    await sleep(500);
    
    await testDriverEarnings();
    await sleep(500);
    
    await testVendorLoads();
    await sleep(500);
    
    // Print summary
    await printTestSummary();
    await printTestState();
    
    log(`\nCompleted: ${new Date().toLocaleString()}`, 'blue');
    
    // Exit with appropriate code
    process.exit(testState.testResults.failed === 0 ? 0 : 1);
    
  } catch (error) {
    log('\n❌ FATAL ERROR DURING TEST EXECUTION', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, testState, testData };
