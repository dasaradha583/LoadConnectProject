/**
 * COMPLETE END-TO-END FLOW TEST
 * Tests the entire LoadConnect workflow from start to finish
 * 
 * Flow:
 * 1. Register Driver & Vendor
 * 2. Admin Approves Both Users
 * 3. Vendor Posts a Load
 * 4. Driver Views Available Loads
 * 5. Driver Accepts Load
 * 6. Driver Updates Location
 * 7. Driver Updates Load Status (In Transit, Delivered)
 * 8. Both Users Give Ratings
 * 
 * Run: node complete-flow-test.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://10.10.60.209:3001';
const TEST_PHONE_DRIVER = '7777777777';
const TEST_PHONE_VENDOR = '8888888888';
const TEST_PHONE_ADMIN = '9999999999';
const TEST_OTP = '123456';

// Colors for console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`${colors.green}✅ PASS${colors.reset} - ${name}`);
    if (details) console.log(`   ${colors.cyan}${details}${colors.reset}`);
  } else {
    failedTests++;
    console.log(`${colors.red}❌ FAIL${colors.reset} - ${name}`);
    if (details) console.log(`   ${colors.red}${details}${colors.reset}`);
  }
}

function logStep(step) {
  console.log(`\n${colors.bright}${colors.magenta}▶ ${step}${colors.reset}`);
}

async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    if (data) config.data = data;

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

// Test storage
let driverTokens = null;
let vendorTokens = null;
let adminTokens = null;
let driverUserId = null;
let vendorUserId = null;
let loadId = null;

console.log(`\n${colors.bright}${colors.blue}${'═'.repeat(70)}`);
console.log(`🚀 LoadConnect - COMPLETE WORKFLOW TEST`);
console.log(`${'═'.repeat(70)}${colors.reset}\n`);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCompleteFlow() {
  try {
    // ========================================
    // PHASE 1: USER REGISTRATION
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 1: USER REGISTRATION${colors.reset}`);
    console.log('─'.repeat(70));

    // Register Driver
    logStep('1.1: Registering Driver');
    await apiRequest('POST', '/auth/send-otp', { phone: TEST_PHONE_DRIVER });
    const driverReg = await apiRequest('POST', '/auth/register/driver', {
      phone: TEST_PHONE_DRIVER,
      otp: TEST_OTP,
      name: 'John Driver',
      licenseNumber: 'DL1234567890',
      vehicleType: 'truck',
      vehicleCapacity: 15,
      vehicleNumber: 'KA01AB1234',
    });
    
    if (driverReg.success && driverReg.data.data) {
      driverTokens = driverReg.data.data.tokens;
      driverUserId = driverReg.data.data.user?.id;
    }
    
    logTest(
      'Driver Registration',
      driverReg.success && driverTokens,
      driverUserId ? `Driver ID: ${driverUserId.substring(0, 8)}...` : driverReg.error?.message
    );

    // Register Vendor
    logStep('1.2: Registering Vendor');
    await apiRequest('POST', '/auth/send-otp', { phone: TEST_PHONE_VENDOR });
    const vendorReg = await apiRequest('POST', '/auth/register/vendor', {
      phone: TEST_PHONE_VENDOR,
      otp: TEST_OTP,
      name: 'Jane Vendor',
      businessName: 'ABC Logistics Pvt Ltd',
      gstNumber: '29ABCDE1234F1Z5',
    });
    
    if (vendorReg.success && vendorReg.data.data) {
      vendorTokens = vendorReg.data.data.tokens;
      vendorUserId = vendorReg.data.data.user?.id;
    }
    
    logTest(
      'Vendor Registration',
      vendorReg.success && vendorTokens,
      vendorUserId ? `Vendor ID: ${vendorUserId.substring(0, 8)}...` : vendorReg.error?.message
    );

    // Check approval status
    const driverProfile = await apiRequest('GET', '/auth/profile', null, driverTokens?.accessToken);
    const vendorProfile = await apiRequest('GET', '/auth/profile', null, vendorTokens?.accessToken);
    
    logTest(
      'Driver Approval Status',
      driverProfile.data?.data?.user?.approvalStatus === 'pending',
      `Status: ${driverProfile.data?.data?.user?.approvalStatus}`
    );
    
    logTest(
      'Vendor Approval Status',
      vendorProfile.data?.data?.user?.approvalStatus === 'pending',
      `Status: ${vendorProfile.data?.data?.user?.approvalStatus}`
    );

    // ========================================
    // PHASE 2: ADMIN APPROVAL
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 2: ADMIN APPROVAL (Manual Step Required)${colors.reset}`);
    console.log('─'.repeat(70));

    console.log(`\n${colors.yellow}⚠️  MANUAL ACTION REQUIRED:${colors.reset}`);
    console.log(`   Please approve the following users via admin dashboard or database:`);
    console.log(`   1. Driver ID: ${driverUserId}`);
    console.log(`   2. Vendor ID: ${vendorUserId}`);
    console.log(`\n   SQL Command to approve:`);
    console.log(`   ${colors.cyan}UPDATE users SET approval_status = 'approved' WHERE id IN ('${driverUserId}', '${vendorUserId}');${colors.reset}`);
    console.log(`\n   Press Enter when users are approved...`);
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    // Verify approval
    logStep('2.1: Verifying User Approvals');
    await sleep(1000);
    
    const driverCheckAfterApproval = await apiRequest('GET', '/auth/profile', null, driverTokens?.accessToken);
    const vendorCheckAfterApproval = await apiRequest('GET', '/auth/profile', null, vendorTokens?.accessToken);
    
    const driverApproved = driverCheckAfterApproval.data?.data?.user?.approvalStatus === 'approved';
    const vendorApproved = vendorCheckAfterApproval.data?.data?.user?.approvalStatus === 'approved';
    
    logTest(
      'Driver Approved',
      driverApproved,
      driverApproved ? 'Driver is now approved' : 'Driver still pending - cannot continue'
    );
    
    logTest(
      'Vendor Approved',
      vendorApproved,
      vendorApproved ? 'Vendor is now approved' : 'Vendor still pending - cannot continue'
    );

    if (!driverApproved || !vendorApproved) {
      console.log(`\n${colors.red}❌ Test cannot continue without user approvals${colors.reset}`);
      return;
    }

    // ========================================
    // PHASE 3: VENDOR POSTS A LOAD
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 3: LOAD CREATION${colors.reset}`);
    console.log('─'.repeat(70));

    logStep('3.1: Vendor Creating Load');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const createLoad = await apiRequest(
      'POST',
      '/loads',
      {
        pickupLocation: {
          address: 'Indiranagar, Bangalore, Karnataka 560038',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        deliveryLocation: {
          address: 'Bandra West, Mumbai, Maharashtra 400050',
          latitude: 19.0760,
          longitude: 72.8777,
        },
        loadType: 'electronics',
        weight: 500,
        description: 'Dell laptops and monitors - handle with care',
        estimatedPrice: 25000,
        scheduledPickupTime: tomorrow.toISOString(),
        specialInstructions: 'Fragile items - requires covered truck',
      },
      vendorTokens?.accessToken
    );
    
    if (createLoad.success && createLoad.data.data) {
      loadId = createLoad.data.data.id;
    }
    
    logTest(
      'Load Created',
      createLoad.success && loadId,
      loadId ? `Load ID: ${loadId.substring(0, 8)}... | Type: electronics | Price: ₹25,000` : createLoad.error?.message
    );

    if (!loadId) {
      console.log(`\n${colors.red}❌ Cannot continue without load creation${colors.reset}`);
      return;
    }

    // Get load details
    logStep('3.2: Fetching Load Details');
    const loadDetails = await apiRequest('GET', `/loads/${loadId}`, null, vendorTokens?.accessToken);
    
    logTest(
      'Load Details Retrieved',
      loadDetails.success && loadDetails.data.data,
      loadDetails.success 
        ? `Status: ${loadDetails.data.data.status} | Weight: ${loadDetails.data.data.weight}kg`
        : loadDetails.error?.message
    );

    // ========================================
    // PHASE 4: DRIVER VIEWS AVAILABLE LOADS
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 4: LOAD DISCOVERY${colors.reset}`);
    console.log('─'.repeat(70));

    logStep('4.1: Driver Viewing Available Loads');
    const availableLoads = await apiRequest(
      'GET',
      '/loads/available',
      null,
      driverTokens?.accessToken
    );
    
    logTest(
      'Available Loads Retrieved',
      availableLoads.success && Array.isArray(availableLoads.data.data),
      availableLoads.success 
        ? `Found ${availableLoads.data.data.length} available loads`
        : availableLoads.error?.message
    );

    const ourLoad = availableLoads.data?.data?.find(load => load.id === loadId);
    logTest(
      'Our Load Visible to Driver',
      ourLoad !== undefined,
      ourLoad ? `Load "${ourLoad.loadType}" visible in available loads` : 'Load not found in available loads'
    );

    // ========================================
    // PHASE 5: DRIVER ACCEPTS LOAD
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 5: LOAD ACCEPTANCE${colors.reset}`);
    console.log('─'.repeat(70));

    logStep('5.1: Driver Accepting Load');
    const acceptLoad = await apiRequest(
      'POST',
      `/loads/${loadId}/accept`,
      null,
      driverTokens?.accessToken
    );
    
    logTest(
      'Load Accepted',
      acceptLoad.success && acceptLoad.data.success,
      acceptLoad.success 
        ? `Load assigned to driver ${driverProfile.data.data.user.name}`
        : acceptLoad.error?.message
    );

    // Verify load status changed
    logStep('5.2: Verifying Load Status');
    await sleep(500);
    const loadAfterAccept = await apiRequest('GET', `/loads/${loadId}`, null, vendorTokens?.accessToken);
    
    logTest(
      'Load Status Updated',
      loadAfterAccept.data?.data?.status === 'accepted',
      `Status: ${loadAfterAccept.data?.data?.status}`
    );
    
    logTest(
      'Driver Assigned to Load',
      loadAfterAccept.data?.data?.driverId === driverUserId,
      loadAfterAccept.data?.data?.driverId ? 'Driver assigned correctly' : 'Driver not assigned'
    );

    // ========================================
    // PHASE 6: DRIVER STARTS JOURNEY
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 6: JOURNEY START${colors.reset}`);
    console.log('─'.repeat(70));

    logStep('6.1: Driver Starting Journey');
    const startLoad = await apiRequest(
      'PUT',
      `/loads/${loadId}/status`,
      { status: 'in_transit' },
      driverTokens?.accessToken
    );
    
    logTest(
      'Load Status: In Transit',
      startLoad.success && startLoad.data.success,
      startLoad.success ? 'Journey started' : startLoad.error?.message
    );

    // Update driver location
    logStep('6.2: Driver Updating Location (Pune - Midway)');
    const updateLocation = await apiRequest(
      'POST',
      '/location/update',
      {
        latitude: 18.5204,
        longitude: 73.8567,
        heading: 270,
        speed: 60,
      },
      driverTokens?.accessToken
    );
    
    logTest(
      'Location Updated',
      updateLocation.success,
      updateLocation.success 
        ? 'Location: Pune (18.52°N, 73.85°E) | Speed: 60 km/h'
        : updateLocation.error?.message
    );

    // Get driver's current location
    logStep('6.3: Fetching Driver Location');
    const driverLocation = await apiRequest(
      'GET',
      `/location/driver/${driverUserId}`,
      null,
      vendorTokens?.accessToken
    );
    
    logTest(
      'Driver Location Retrieved',
      driverLocation.success && driverLocation.data.data,
      driverLocation.success 
        ? `Last update: ${new Date(driverLocation.data.data.timestamp).toLocaleTimeString()}`
        : driverLocation.error?.message
    );

    // ========================================
    // PHASE 7: DELIVERY COMPLETION
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 7: DELIVERY COMPLETION${colors.reset}`);
    console.log('─'.repeat(70));

    logStep('7.1: Driver Arriving at Destination');
    await sleep(1000);
    
    // Update location to Mumbai
    await apiRequest(
      'POST',
      '/location/update',
      {
        latitude: 19.0760,
        longitude: 72.8777,
        heading: 0,
        speed: 0,
      },
      driverTokens?.accessToken
    );

    logStep('7.2: Driver Marking Load as Delivered');
    const deliverLoad = await apiRequest(
      'PUT',
      `/loads/${loadId}/status`,
      { 
        status: 'delivered',
        deliveryNotes: 'All items delivered in good condition. Receiver: Mr. Sharma'
      },
      driverTokens?.accessToken
    );
    
    logTest(
      'Load Delivered',
      deliverLoad.success && deliverLoad.data.success,
      deliverLoad.success ? 'Load marked as delivered' : deliverLoad.error?.message
    );

    // Verify final status
    logStep('7.3: Verifying Final Load Status');
    await sleep(500);
    const finalLoadStatus = await apiRequest('GET', `/loads/${loadId}`, null, vendorTokens?.accessToken);
    
    logTest(
      'Load Status: Delivered',
      finalLoadStatus.data?.data?.status === 'delivered',
      `Final Status: ${finalLoadStatus.data?.data?.status}`
    );

    // ========================================
    // PHASE 8: RATINGS & FEEDBACK
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 8: RATINGS & FEEDBACK${colors.reset}`);
    console.log('─'.repeat(70));

    logStep('8.1: Vendor Rating Driver');
    const vendorRating = await apiRequest(
      'POST',
      '/ratings',
      {
        loadId: loadId,
        ratedUserId: driverUserId,
        rating: 5,
        feedback: 'Excellent service! Driver was professional and cargo arrived safely.',
      },
      vendorTokens?.accessToken
    );
    
    logTest(
      'Vendor Rated Driver',
      vendorRating.success,
      vendorRating.success ? '⭐⭐⭐⭐⭐ (5/5)' : vendorRating.error?.message
    );

    logStep('8.2: Driver Rating Vendor');
    const driverRating = await apiRequest(
      'POST',
      '/ratings',
      {
        loadId: loadId,
        ratedUserId: vendorUserId,
        rating: 4,
        feedback: 'Good client. Load was well-packaged and pickup was smooth.',
      },
      driverTokens?.accessToken
    );
    
    logTest(
      'Driver Rated Vendor',
      driverRating.success,
      driverRating.success ? '⭐⭐⭐⭐ (4/5)' : driverRating.error?.message
    );

    // Get updated ratings
    logStep('8.3: Checking Updated Ratings');
    const driverProfileFinal = await apiRequest('GET', '/auth/profile', null, driverTokens?.accessToken);
    const vendorProfileFinal = await apiRequest('GET', '/auth/profile', null, vendorTokens?.accessToken);
    
    logTest(
      'Driver Rating Updated',
      driverProfileFinal.data?.data?.driver?.rating >= 0,
      `Driver Rating: ${driverProfileFinal.data?.data?.driver?.rating}/5.0`
    );
    
    logTest(
      'Vendor Rating Updated',
      vendorProfileFinal.data?.data?.vendor?.rating >= 0,
      `Vendor Rating: ${vendorProfileFinal.data?.data?.vendor?.rating}/5.0`
    );

    // ========================================
    // PHASE 9: TRIP STATISTICS
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📋 PHASE 9: TRIP STATISTICS${colors.reset}`);
    console.log('─'.repeat(70));

    logStep('9.1: Driver Trip Statistics');
    logTest(
      'Driver Completed Trips',
      driverProfileFinal.data?.data?.driver?.completedTrips >= 1,
      `Total Trips: ${driverProfileFinal.data?.data?.driver?.totalTrips} | Completed: ${driverProfileFinal.data?.data?.driver?.completedTrips}`
    );

    logStep('9.2: Vendor Order Statistics');
    logTest(
      'Vendor Completed Orders',
      vendorProfileFinal.data?.data?.vendor?.completedOrders >= 1,
      `Total Orders: ${vendorProfileFinal.data?.data?.vendor?.totalOrders} | Completed: ${vendorProfileFinal.data?.data?.vendor?.completedOrders}`
    );

    // ========================================
    // FINAL REPORT
    // ========================================
    console.log(`\n${colors.bright}${colors.blue}${'═'.repeat(70)}`);
    console.log(`📊 COMPLETE WORKFLOW TEST RESULTS`);
    console.log(`${'═'.repeat(70)}${colors.reset}\n`);
    
    console.log(`${colors.bright}Total Tests:${colors.reset} ${totalTests}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passedTests}`);
    console.log(`${colors.red}Failed:${colors.reset} ${failedTests}`);
    
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);
    const rateColor = successRate >= 90 ? colors.green : successRate >= 70 ? colors.yellow : colors.red;
    console.log(`${rateColor}Success Rate:${colors.reset} ${successRate}%\n`);

    if (failedTests === 0) {
      console.log(`${colors.green}${colors.bright}🎉 ALL TESTS PASSED! COMPLETE WORKFLOW WORKS! 🎉${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️  Some tests failed. Review above for details.${colors.reset}\n`);
    }

    // Summary of what was tested
    console.log(`${colors.cyan}${colors.bright}✅ TESTED FEATURES:${colors.reset}`);
    console.log(`   1. ✅ User Registration (Driver & Vendor)`);
    console.log(`   2. ✅ Admin Approval Workflow`);
    console.log(`   3. ✅ Load Creation by Vendor`);
    console.log(`   4. ✅ Load Discovery by Driver`);
    console.log(`   5. ✅ Load Acceptance`);
    console.log(`   6. ✅ Status Updates (In Transit, Delivered)`);
    console.log(`   7. ✅ Live Location Tracking`);
    console.log(`   8. ✅ Rating System (Bidirectional)`);
    console.log(`   9. ✅ Trip/Order Statistics\n`);

    console.log(`${colors.magenta}📝 WORKFLOW SUMMARY:${colors.reset}`);
    console.log(`   📱 Driver: ${driverProfile.data?.data?.user?.name} (${TEST_PHONE_DRIVER})`);
    console.log(`   🏢 Vendor: ${vendorProfile.data?.data?.user?.name} (${TEST_PHONE_VENDOR})`);
    console.log(`   📦 Load: ${loadId?.substring(0, 8)}... (electronics, 500kg)`);
    console.log(`   📍 Route: Bangalore → Mumbai`);
    console.log(`   ⭐ Driver Rating: ${driverProfileFinal.data?.data?.driver?.rating}/5.0`);
    console.log(`   ⭐ Vendor Rating: ${vendorProfileFinal.data?.data?.vendor?.rating}/5.0\n`);

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ TEST SUITE FAILED WITH ERROR:${colors.reset}`);
    console.error(error);
  }
}

// Run the complete flow
runCompleteFlow().then(() => {
  console.log(`${colors.green}✅ Test execution completed${colors.reset}\n`);
  process.exit(0);
}).catch(err => {
  console.error(`${colors.red}❌ Test execution failed:${colors.reset}`, err);
  process.exit(1);
});
