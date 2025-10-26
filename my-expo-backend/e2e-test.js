/**
 * END-TO-END TEST FLOW
 * Tests the complete LoadConnect application flow
 * 
 * Run: node e2e-test.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://10.10.60.209:3001';
const TEST_PHONE_DRIVER = '9876543210';
const TEST_PHONE_VENDOR = '9876543211';
const TEST_OTP = '123456'; // Your OTP is hardcoded to 123456 in dev

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper function to log test results
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

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

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

// Test Storage
let driverTokens = null;
let vendorTokens = null;
let driverUserId = null;
let vendorUserId = null;
let loadId = null;

console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════`);
console.log(`🚀 LoadConnect - END-TO-END TEST SUITE`);
console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

async function runTests() {
  try {
    // ========================================
    // 1. HEALTH CHECK
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📊 TEST SUITE 1: HEALTH CHECK${colors.reset}`);
    console.log('─'.repeat(60));

    const healthCheck = await apiRequest('GET', '/health');
    logTest(
      'Health Check',
      healthCheck.success && healthCheck.status === 200,
      healthCheck.success ? 'Server is healthy' : 'Server is down'
    );

    // ========================================
    // 2. DRIVER REGISTRATION FLOW
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📊 TEST SUITE 2: DRIVER REGISTRATION${colors.reset}`);
    console.log('─'.repeat(60));

    // 2.1 Send OTP for Driver
    const driverOTP = await apiRequest('POST', '/auth/send-otp', {
      phone: TEST_PHONE_DRIVER,
    });
    logTest(
      'Driver - Send OTP',
      driverOTP.success && driverOTP.data.success,
      driverOTP.success ? `OTP sent to ${TEST_PHONE_DRIVER}` : driverOTP.error.message
    );

    // 2.2 Register Driver
    const driverReg = await apiRequest('POST', '/auth/register/driver', {
      phone: TEST_PHONE_DRIVER,
      otp: TEST_OTP,
      name: 'Test Driver',
      licenseNumber: 'DL1234567890',
      vehicleType: 'truck',
      vehicleCapacity: 10,
      vehicleNumber: 'KA01AB1234',
    });
    
    if (driverReg.success && driverReg.data.data) {
      driverTokens = driverReg.data.data.tokens;
      driverUserId = driverReg.data.data.user?.id;
    }
    
    logTest(
      'Driver - Registration',
      driverReg.success && driverReg.data.success && driverTokens,
      driverReg.success
        ? `Driver registered with ID: ${driverUserId?.substring(0, 8)}...`
        : driverReg.error.message
    );

    logTest(
      'Driver - Tokens Generated',
      driverTokens && driverTokens.accessToken && driverTokens.refreshToken,
      driverTokens ? 'Access & Refresh tokens received' : 'No tokens received'
    );

    logTest(
      'Driver - User Type Correct',
      driverReg.data.data?.user?.type === 'driver',
      `User type: ${driverReg.data.data?.user?.type}`
    );

    logTest(
      'Driver - Approval Status',
      driverReg.data.data?.user?.approvalStatus === 'pending',
      `Status: ${driverReg.data.data?.user?.approvalStatus}`
    );

    // ========================================
    // 3. VENDOR REGISTRATION FLOW
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📊 TEST SUITE 3: VENDOR REGISTRATION${colors.reset}`);
    console.log('─'.repeat(60));

    // 3.1 Send OTP for Vendor
    const vendorOTP = await apiRequest('POST', '/auth/send-otp', {
      phone: TEST_PHONE_VENDOR,
    });
    logTest(
      'Vendor - Send OTP',
      vendorOTP.success && vendorOTP.data.success,
      vendorOTP.success ? `OTP sent to ${TEST_PHONE_VENDOR}` : vendorOTP.error.message
    );

    // 3.2 Register Vendor
    const vendorReg = await apiRequest('POST', '/auth/register/vendor', {
      phone: TEST_PHONE_VENDOR,
      otp: TEST_OTP,
      name: 'Test Vendor',
      businessName: 'Test Logistics Ltd',
      gstNumber: '29ABCDE1234F1Z5',
    });
    
    if (vendorReg.success && vendorReg.data.data) {
      vendorTokens = vendorReg.data.data.tokens;
      vendorUserId = vendorReg.data.data.user?.id;
    }
    
    logTest(
      'Vendor - Registration',
      vendorReg.success && vendorReg.data.success && vendorTokens,
      vendorReg.success
        ? `Vendor registered with ID: ${vendorUserId?.substring(0, 8)}...`
        : vendorReg.error.message
    );

    logTest(
      'Vendor - Tokens Generated',
      vendorTokens && vendorTokens.accessToken && vendorTokens.refreshToken,
      vendorTokens ? 'Access & Refresh tokens received' : 'No tokens received'
    );

    logTest(
      'Vendor - User Type Correct',
      vendorReg.data.data?.user?.type === 'vendor',
      `User type: ${vendorReg.data.data?.user?.type}`
    );

    logTest(
      'Vendor - No businessId Field',
      !vendorReg.data.data?.user?.businessId && !vendorReg.data.data?.vendor?.businessId,
      'businessId field correctly removed from schema'
    );

    // ========================================
    // 4. AUTHENTICATION FLOW
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📊 TEST SUITE 4: AUTHENTICATION${colors.reset}`);
    console.log('─'.repeat(60));

    // 4.1 Driver Login
    await apiRequest('POST', '/auth/send-otp', { phone: TEST_PHONE_DRIVER });
    const driverLogin = await apiRequest('POST', '/auth/signin', {
      phone: TEST_PHONE_DRIVER,
      otp: TEST_OTP,
    });
    
    logTest(
      'Driver - Login',
      driverLogin.success && driverLogin.data.success,
      driverLogin.success ? 'Driver logged in successfully' : driverLogin.error.message
    );

    logTest(
      'Driver - Login Returns Type',
      driverLogin.data.data?.user?.type === 'driver',
      `Returned type: ${driverLogin.data.data?.user?.type}`
    );

    // 4.2 Vendor Login
    await apiRequest('POST', '/auth/send-otp', { phone: TEST_PHONE_VENDOR });
    const vendorLogin = await apiRequest('POST', '/auth/signin', {
      phone: TEST_PHONE_VENDOR,
      otp: TEST_OTP,
    });
    
    logTest(
      'Vendor - Login',
      vendorLogin.success && vendorLogin.data.success,
      vendorLogin.success ? 'Vendor logged in successfully' : vendorLogin.error.message
    );

    logTest(
      'Vendor - Login Returns Type',
      vendorLogin.data.data?.user?.type === 'vendor',
      `Returned type: ${vendorLogin.data.data?.user?.type}`
    );

    // ========================================
    // 5. PROFILE MANAGEMENT
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📊 TEST SUITE 5: PROFILE MANAGEMENT${colors.reset}`);
    console.log('─'.repeat(60));

    // 5.1 Get Driver Profile
    const driverProfile = await apiRequest(
      'GET',
      '/auth/profile',
      null,
      driverTokens?.accessToken
    );
    
    logTest(
      'Driver - Get Profile',
      driverProfile.success && driverProfile.data.success,
      driverProfile.success
        ? `Profile retrieved for ${driverProfile.data.data?.user?.name}`
        : driverProfile.error.message
    );

    logTest(
      'Driver - Profile Has Driver Data',
      driverProfile.data.data?.driver && driverProfile.data.data?.driver?.vehicleNumber,
      driverProfile.data.data?.driver
        ? `Vehicle: ${driverProfile.data.data.driver.vehicleNumber}`
        : 'No driver data'
    );

    // 5.2 Get Vendor Profile
    const vendorProfile = await apiRequest(
      'GET',
      '/auth/profile',
      null,
      vendorTokens?.accessToken
    );
    
    logTest(
      'Vendor - Get Profile',
      vendorProfile.success && vendorProfile.data.success,
      vendorProfile.success
        ? `Profile retrieved for ${vendorProfile.data.data?.user?.name}`
        : vendorProfile.error.message
    );

    logTest(
      'Vendor - Profile Has Vendor Data',
      vendorProfile.data.data?.vendor && vendorProfile.data.data?.vendor?.businessName,
      vendorProfile.data.data?.vendor
        ? `Business: ${vendorProfile.data.data.vendor.businessName}`
        : 'No vendor data'
    );

    logTest(
      'Vendor - Profile Has No businessId',
      vendorProfile.data.data?.vendor && !vendorProfile.data.data.vendor.businessId,
      'businessId field correctly removed'
    );

    // 5.3 Update Vendor Profile
    const vendorUpdate = await apiRequest(
      'PUT',
      '/auth/profile/vendor',
      {
        businessName: 'Updated Logistics Ltd',
        gstNumber: '29ABCDE1234F1Z6',
      },
      vendorTokens?.accessToken
    );
    
    logTest(
      'Vendor - Update Profile',
      vendorUpdate.success && vendorUpdate.data.success,
      vendorUpdate.success
        ? `Business name updated to ${vendorUpdate.data.data?.vendor?.businessName}`
        : vendorUpdate.error.message
    );

    // ========================================
    // 6. LOAD MANAGEMENT (if vendor is approved)
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📊 TEST SUITE 6: LOAD MANAGEMENT${colors.reset}`);
    console.log('─'.repeat(60));

    // Note: This will fail if vendor is not approved
    const createLoad = await apiRequest(
      'POST',
      '/loads',
      {
        pickupLocation: {
          address: 'Bangalore, Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        deliveryLocation: {
          address: 'Mumbai, Maharashtra',
          latitude: 19.0760,
          longitude: 72.8777,
        },
        loadType: 'electronics',
        weight: 500,
        estimatedPrice: 15000,
        scheduledPickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      vendorTokens?.accessToken
    );
    
    if (createLoad.success && createLoad.data.data) {
      loadId = createLoad.data.data.id;
    }
    
    logTest(
      'Vendor - Create Load',
      createLoad.success && createLoad.data.success,
      createLoad.success
        ? `Load created with ID: ${loadId?.substring(0, 8)}...`
        : createLoad.status === 403
        ? 'Vendor not approved yet (expected)'
        : createLoad.error.message
    );

    if (loadId) {
      // 6.1 Get Available Loads (Driver)
      const availableLoads = await apiRequest(
        'GET',
        '/loads/available',
        null,
        driverTokens?.accessToken
      );
      
      logTest(
        'Driver - Get Available Loads',
        availableLoads.success,
        availableLoads.success
          ? `Found ${availableLoads.data.data?.length || 0} available loads`
          : availableLoads.error.message
      );

      // 6.2 Get Load Details
      const loadDetails = await apiRequest(
        'GET',
        `/loads/${loadId}`,
        null,
        vendorTokens?.accessToken
      );
      
      logTest(
        'Vendor - Get Load Details',
        loadDetails.success && loadDetails.data.success,
        loadDetails.success
          ? `Load details retrieved: ${loadDetails.data.data?.loadType}`
          : loadDetails.error.message
      );
    }

    // ========================================
    // 7. TOKEN REFRESH
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📊 TEST SUITE 7: TOKEN MANAGEMENT${colors.reset}`);
    console.log('─'.repeat(60));

    const refreshToken = await apiRequest('POST', '/auth/refresh-token', {
      refreshToken: driverTokens?.refreshToken,
    });
    
    logTest(
      'Driver - Refresh Token',
      refreshToken.success && refreshToken.data.data?.accessToken,
      refreshToken.success ? 'New access token generated' : refreshToken.error.message
    );

    // ========================================
    // 8. SIGNOUT
    // ========================================
    console.log(`\n${colors.bright}${colors.yellow}📊 TEST SUITE 8: SIGNOUT${colors.reset}`);
    console.log('─'.repeat(60));

    const signout = await apiRequest(
      'POST',
      '/auth/signout',
      { refreshToken: driverTokens?.refreshToken },
      driverTokens?.accessToken
    );
    
    logTest(
      'Driver - Signout',
      signout.success && signout.data.success,
      signout.success ? 'Driver signed out successfully' : signout.error.message
    );

    // ========================================
    // FINAL REPORT
    // ========================================
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════`);
    console.log(`📊 TEST RESULTS SUMMARY`);
    console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);
    
    console.log(`${colors.bright}Total Tests:${colors.reset} ${totalTests}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passedTests}`);
    console.log(`${colors.red}Failed:${colors.reset} ${failedTests}`);
    
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);
    const rateColor = successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red;
    console.log(`${rateColor}Success Rate:${colors.reset} ${successRate}%\n`);

    if (failedTests === 0) {
      console.log(`${colors.green}${colors.bright}🎉 ALL TESTS PASSED! 🎉${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️  Some tests failed. Check the logs above for details.${colors.reset}\n`);
    }

    console.log(`${colors.cyan}📝 Note: Some tests may fail if users need admin approval.${colors.reset}`);
    console.log(`${colors.cyan}   This is expected behavior for the approval workflow.${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ TEST SUITE FAILED WITH ERROR:${colors.reset}`);
    console.error(error);
  }
}

// Run the tests
runTests().catch(console.error);
