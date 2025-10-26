# Integration Guide - Admin System & Updated Models

## Changes Made

### 1. Database Schema
✅ Removed `business_id` column from `vendors` table
✅ All new tables created with normalized schema

### 2. Files Created
- `models-updated.js` - Updated Sequelize models (normalized)
- `admin-routes.js` - Admin authentication & document verification endpoints  
- `registration-routes.js` - Updated registration (no business_id)

### 3. Document Types Required

**Driver Documents:**
- `driver_license` - Driving License
- `vehicle_rc` - C Book (Registration Certificate)

**Vendor Documents:**
- `gst_certificate` - GSTIN License

---

## How to Integrate into server-postgresql-redis.js

### Step 1: Add the new models at the top of server-postgresql-redis.js

After line 75 (after LoadPriority definition), add:

```javascript
// Import updated models
const { defineModels } = require('./models-updated');
const { createAdminRoutes } = require('./admin-routes');
const { createRegistrationRoutes } = require('./registration-routes');
```

### Step 2: Replace the old model definitions

Find the existing User model definition (around line 86) and replace ALL old model definitions with:

```javascript
// Define models using the new normalized schema
const models = defineModels(sequelize);
const { User, Admin, Driver, Vendor, Document, ApprovalLog, AdminNotification } = models;

// Keep the existing Load, Rating, DriverLocation, LocationHistory models as they are
// (They are already defined in your file, just don't redefine them)
```

### Step 3: Add the new routes

After your existing routes but BEFORE the error handlers (around line 3900), add:

```javascript
// ===================== ADMIN ROUTES =====================
const adminRouter = createAdminRoutes(models, JWT_SECRET, redisClient);
app.use('/api', adminRouter);

// ===================== UPDATED REGISTRATION ROUTES =====================
const registrationRouter = createRegistrationRoutes(models, JWT_SECRET, redisClient);
app.use('/api', registrationRouter);

// Serve uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

### Step 4: Update existing registration endpoints

Find and REPLACE the existing `/auth/register/driver` and `/auth/register/vendor` endpoints (lines 863-1050) with the new versions from `registration-routes.js` OR just remove them since they're now in the router.

---

## Quick Integration Script

Alternatively, I can create a completely new integrated server file. Would you like me to do that?

For now, here's a minimal script to test the new endpoints:

### Test Script (save as `test-admin-system.js`)

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAdminSystem() {
  try {
    // 1. Admin Login
    console.log('\\n1. Testing Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/admin/login`, {
      username: 'superadmin',
      password: 'Admin@123'
    });
    
    const { accessToken } = loginResponse.data.data.tokens;
    console.log('✅ Admin logged in successfully');
    console.log('Admin:', loginResponse.data.data.user.name);

    // 2. Get Dashboard Stats
    console.log('\\n2. Getting Dashboard Stats...');
    const statsResponse = await axios.get(`${BASE_URL}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ Dashboard stats:', statsResponse.data.data);

    // 3. Get Pending Users
    console.log('\\n3. Getting Pending Users...');
    const pendingResponse = await axios.get(`${BASE_URL}/admin/pending-users`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log(`✅ Found ${pendingResponse.data.data.users.length} pending users`);

    // 4. Get Pending Documents
    console.log('\\n4. Getting Pending Documents...');
    const docsResponse = await axios.get(`${BASE_URL}/admin/pending-documents`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log(`✅ Found ${docsResponse.data.data.documents.length} pending documents`);

    console.log('\\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAdminSystem();
```

Run with: `node test-admin-system.js`

---

## API Endpoints Available

### Admin Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/admin/logout` - Admin logout

### User Management
- `GET /api/admin/pending-users` - Get pending approvals
- `POST /api/admin/approve-user/:userId` - Approve user
- `POST /api/admin/reject-user/:userId` - Reject user

### Document Verification
- `GET /api/admin/pending-documents` - Get pending documents
- `POST /api/admin/verify-document/:documentId` - Verify document
- `POST /api/admin/reject-document/:documentId` - Reject document

### Document Upload (Users)
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/user/:userId` - Get user's documents

### Admin Dashboard
- `GET /api/admin/dashboard-stats` - Get statistics
- `GET /api/admin/approval-logs` - Get audit logs

### Updated Registration
- `POST /api/auth/register/driver` - Register driver (updated, no redundant fields)
- `POST /api/auth/register/vendor` - Register vendor (NO business_id)

---

## Testing Document Upload

```bash
# Upload a document
curl -X POST http://localhost:3001/api/documents/upload \\
  -H "Content-Type: multipart/form-data" \\
  -F "document=@/path/to/license.jpg" \\
  -F "userId=<user-uuid>" \\
  -F "documentType=driver_license" \\
  -F "documentNumber=DL1234567890"
```

---

## Next Steps

1. ✅ Models created
2. ✅ Routes created  
3. ✅ Database schema updated
4. ⏳ Integrate routes into server
5. ⏳ Build admin dashboard frontend
6. ⏳ Update mobile app to support document uploads

Would you like me to:
1. Create a complete integrated server.js file?
2. Create the React admin dashboard?
3. Update the mobile app to support document uploads?
