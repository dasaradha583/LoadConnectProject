# 🚚 LoadConnect - Logistics Management Platform

**A comprehensive mobile application connecting load vendors with truck drivers for efficient logistics management.**

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0.18-000020.svg)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D.svg)](https://redis.io/)

---

## 📋 Table of Contents

- [Features](#-features)
- [System Requirements](#-system-requirements)
- [Architecture Overview](#-architecture-overview)
- [Installation Guide](#-installation-guide)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Database Setup](#2-database-setup)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Mobile App Setup](#4-mobile-app-setup)
  - [5. Network Configuration](#5-network-configuration)
- [Running the Application](#-running-the-application)
- [Testing the System](#-testing-the-system)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)

---

## ✨ Features

### 🚛 For Drivers
- ✅ **Registration & Verification**: OTP-based authentication, license verification
- ✅ **Truck Management**: Vehicle details, capacity, type configuration
- ✅ **Live GPS Tracking**: Real-time location updates every 10 seconds
- ✅ **Load Discovery**: View nearby loads within 50km radius
- ✅ **Trip Management**: Accept/reject loads, navigation, proof of delivery
- ✅ **Earnings Dashboard**: Track total earnings, trips, and ratings

### 🏭 For Vendors
- ✅ **Business Registration**: GST verification, business details
- ✅ **Load Posting**: Interactive map-based pickup/drop selection
- ✅ **Driver Matching**: Distance-based driver recommendations
- ✅ **Live Tracking**: Real-time driver location monitoring
- ✅ **Payment Integration**: Multiple payment methods (UI ready, gateway pending)
- ✅ **Rating System**: 5-star rating with aspect-based feedback

### 👨‍💼 Admin Features
- ✅ **User Management**: Approve/reject driver and vendor registrations
- ✅ **Document Verification**: GST and license verification with badges
- ✅ **Dashboard Analytics**: User statistics, pending approvals
- ✅ **Audit Logs**: Complete approval history tracking

---

## 💻 System Requirements

### Development Machine
- **Operating System**: macOS, Windows 10/11, or Linux
- **Node.js**: v18.x or v20.x (LTS recommended)
- **npm**: v9.x or higher
- **PostgreSQL**: v14 or higher
- **Redis**: v7.x or higher
- **Git**: Latest version
- **Code Editor**: VS Code (recommended)

### Mobile Device
- **Android**: Version 8.0 (API 26) or higher
- **iOS**: iOS 13 or higher
- **Expo Go App**: Latest version from App Store/Play Store
- **Network**: Must be on the **same WiFi network** as your development machine

### System Specifications
- **RAM**: Minimum 8GB (16GB recommended for smooth development)
- **Storage**: At least 5GB free space
- **Internet**: Stable connection for package downloads

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    LOADCONNECT ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  Mobile App      │         │  Admin Web       │
│  (React Native)  │◄───────►│  Dashboard       │
│  Expo + TypeScript│         │                 │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │        HTTP/REST API       │
         │        WebSocket           │
         ▼                            ▼
┌─────────────────────────────────────────────────┐
│         Node.js Express Backend                 │
│  - JWT Authentication                          │
│  - RESTful API Endpoints                       │
│  - WebSocket for Real-time Updates             │
│  - File Upload (Multer)                        │
└────────┬────────────────┬──────────────────────┘
         │                │
         ▼                ▼
┌─────────────────┐  ┌──────────────┐
│   PostgreSQL    │  │    Redis     │
│   (Primary DB)  │  │   (Cache +   │
│   - Users       │  │    Sessions) │
│   - Loads       │  │              │
│   - Locations   │  │              │
└─────────────────┘  └──────────────┘
```

### Technology Stack

**Frontend (Mobile App)**
- React Native 0.81.5
- Expo SDK ~54.0
- TypeScript
- React Navigation
- Expo Location (GPS Tracking)
- React Native Maps
- Async Storage

**Backend**
- Node.js v20.x
- Express.js v5.1
- Sequelize ORM
- JWT Authentication
- WebSocket (Socket.io)
- Multer (File uploads)

**Database**
- PostgreSQL 14+ (Primary database)
- Redis 7.x (Caching & real-time data)

**External Services**
- Google Maps API (Navigation)
- OpenStreetMap (Map tiles)
- Leaflet.js (Advanced mapping)

---

## 🚀 Installation Guide

### 1. Prerequisites

#### Install Node.js
```bash
# macOS (using Homebrew)
brew install node@20

# Windows (download from nodejs.org)
# https://nodejs.org/en/download/

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v9.x.x or higher
```

#### Install PostgreSQL
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Windows
# Download installer from: https://www.postgresql.org/download/windows/
```

#### Install Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Windows
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use WSL2 with Ubuntu
```

#### Install Expo CLI
```bash
npm install -g expo-cli

# Verify installation
expo --version
```

#### Install Git
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git

# Windows
# Download from: https://git-scm.com/download/win

# Verify
git --version
```

---

### 2. Database Setup

#### Step 1: Start PostgreSQL
```bash
# Check if PostgreSQL is running
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Start if not running
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql
```

#### Step 2: Create Database and User
```bash
# Access PostgreSQL as superuser
# macOS/Linux
psql postgres

# Windows (as postgres user)
psql -U postgres

# Inside psql, run these commands:
```

```sql
-- Create database
CREATE DATABASE load_management;

-- Create user (change password!)
CREATE USER postgres WITH PASSWORD 'password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE load_management TO postgres;

-- Connect to database
\c load_management

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO postgres;

-- Exit psql
\q
```

#### Step 3: Initialize Database Schema
```bash
# Navigate to project root
cd /path/to/karim

# Run the database migration script
psql -U postgres -d load_management -f normalized-database-schema.sql

# Verify tables were created
psql -U postgres -d load_management -c "\dt"
```

You should see tables like:
- `users`
- `drivers`
- `vendors`
- `admins`
- `loads`
- `driver_locations`
- `approval_logs`
- etc.

#### Step 4: Create Admin User
```bash
# Navigate to backend folder
cd my-expo-backend

# Run the admin password setup script
node set-admin-password.js

# This will create an admin with:
# Username: superadmin
# Password: Admin@123
```

---

### 3. Backend Setup

#### Step 1: Navigate to Backend Directory
```bash
cd /path/to/karim/my-expo-backend
```

#### Step 2: Install Dependencies
```bash
npm install

# This will install:
# - express, cors, helmet (server)
# - sequelize, pg (database)
# - redis (caching)
# - bcryptjs, jsonwebtoken (auth)
# - multer (file uploads)
# - socket.io (websocket)
# - And other dependencies...
```

#### Step 3: Configure Environment Variables
Create a `.env` file in `my-expo-backend/` directory:

```bash
# Create .env file
touch .env

# Edit with your preferred editor
nano .env
# or
code .env
```

Add the following configuration (adjust as needed):

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=load_management
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Google Maps API (Optional - for geocoding)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Session
SESSION_SECRET=your-session-secret-key
```

#### Step 4: Verify Database Connection
```bash
# Test database connectivity
node -e "const { Sequelize } = require('sequelize'); const sequelize = new Sequelize('load_management', 'postgres', 'password', { host: 'localhost', dialect: 'postgres' }); sequelize.authenticate().then(() => console.log('✅ Database connected')).catch(err => console.error('❌ Error:', err));"
```

---

### 4. Mobile App Setup

#### Step 1: Navigate to Mobile App Directory
```bash
cd /path/to/karim/my-expo-app
```

#### Step 2: Install Dependencies
```bash
npm install

# This will install:
# - expo, react-native
# - @react-navigation/* (navigation)
# - expo-location (GPS)
# - react-native-maps (maps)
# - expo-camera (photos)
# - And 40+ other dependencies...

# Note: This may take 5-10 minutes
```

#### Step 3: Install Expo Go on Your Mobile Device

**Android:**
1. Open Google Play Store
2. Search for "Expo Go"
3. Install the app
4. Open Expo Go

**iOS:**
1. Open App Store
2. Search for "Expo Go"
3. Install the app
4. Open Expo Go

---

### 5. Network Configuration

**⚠️ CRITICAL: Your mobile device and computer MUST be on the same WiFi network!**

#### Step 1: Find Your Computer's Local IP Address

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'

# Example output: 192.168.1.14
```

**Windows (Command Prompt):**
```cmd
ipconfig

# Look for "IPv4 Address" under your WiFi adapter
# Example: 192.168.1.14
```

**Linux:**
```bash
hostname -I | awk '{print $1}'

# Example output: 192.168.1.14
```

#### Step 2: Update Backend IP in Mobile App

Edit the file: `my-expo-app/services/api.ts`

**Line 26** - Update with YOUR computer's IP address:

```typescript
// Before (example):
'http://192.168.1.14:3001',  // Current actual IP

// After (replace with YOUR IP):
'http://YOUR_COMPUTER_IP:3001',  // <-- CHANGE THIS
```

**Example:**
If your IP is `192.168.1.50`, change line 26 to:
```typescript
'http://192.168.1.50:3001',  // Your computer's IP
```

**⚠️ IMPORTANT NOTES:**

1. **IP Address Format**: Must be `http://YOUR_IP:3001` (with `http://` prefix)
2. **Port Number**: Keep `:3001` (backend default port)
3. **No HTTPS**: Use `http://` NOT `https://` for local development
4. **Same Network**: Both devices MUST be on the same WiFi
5. **Firewall**: Ensure your firewall allows port 3001

#### Step 3: Verify Network Connectivity

**Test from your computer:**
```bash
# From backend directory
cd my-expo-backend

# Start the server
node server-postgresql-redis.js

# You should see:
# 🚀 LoadConnect Backend Server Started Successfully!
# 📍 Port: 3001
# 🌐 Local: http://localhost:3001
# 📱 Mobile: http://192.168.1.14:3001  <-- Use this IP in your app!
```

The **Mobile** URL is what you need to configure in `api.ts`.

**Test connectivity from your phone:**
1. Ensure your phone is on the same WiFi network
2. Open Safari (iOS) or Chrome (Android)
3. Visit: `http://YOUR_COMPUTER_IP:3001/health`
4. You should see: `{"status":"OK","message":"Server is running"}`

If you **cannot** connect:
- ✅ Verify both devices are on the same WiFi network
- ✅ Check firewall settings (disable temporarily to test)
- ✅ Ensure backend server is running
- ✅ Verify IP address is correct
- ✅ Try restarting WiFi router

---

## 🏃 Running the Application

### Step-by-Step Startup Process

#### Terminal 1: Start Backend Server

```bash
# Navigate to backend directory
cd /path/to/karim/my-expo-backend

# Start the server
node server-postgresql-redis.js

# Expected output:
# ✅ PostgreSQL connected successfully
# 🔴 Redis connected
# 🚀 LoadConnect Backend Server Started Successfully!
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📱 MOBILE APP CONFIGURATION:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📍 Use this URL in your mobile app API configuration:
# 📱 Mobile: http://192.168.1.14:3001
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Keep this terminal running!** Do not close it.

#### Terminal 2: Start Mobile App

```bash
# Navigate to mobile app directory
cd /path/to/karim/my-expo-app

# Start Expo development server
npx expo start --go

# Alternative: npm start

# Expected output:
# Starting Metro Bundler
# 
# › Metro waiting on exp://192.168.1.14:8081
# › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
# 
# › Press a │ open Android
# › Press i │ open iOS simulator
# › Press w │ open web
# › Press r │ reload app
# › Press m │ toggle menu
```

#### Step 3: Connect Your Mobile Device

**Option A: Scan QR Code (Recommended)**

1. Open **Expo Go** app on your phone
2. Tap **"Scan QR Code"**
3. Point your camera at the QR code in the terminal
4. Wait for the app to load (30-60 seconds first time)

**Option B: Manual Entry**

1. Open **Expo Go** app
2. Look for "Recently opened" or "Enter URL manually"
3. Enter: `exp://YOUR_COMPUTER_IP:8081`
4. Tap "Connect"

**iOS Users:**
- You can also use the Camera app to scan the QR code
- It will prompt to open in Expo Go

#### Step 4: Wait for App to Load

First-time load takes longer:
- **First time**: 1-3 minutes (downloading JavaScript bundle)
- **Subsequent loads**: 10-30 seconds

You'll see a loading screen, then the app splash screen, then the login screen.

---

## 🧪 Testing the System

### Quick Health Check

```bash
# Test backend health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"OK","message":"Server is running","timestamp":"2025-10-26T..."}
```

### Test User Credentials

**Pre-created Test Users:**

**Admin User:**
- Username: `superadmin`
- Password: `Admin@123`
- Access: Admin dashboard

**Test Vendor:**
- Phone: `+919876543210`
- OTP: Any 6 digits (e.g., `123456`)
- Status: Pending verification

**Test Driver:**
- Phone: `+918765432109`
- OTP: Any 6 digits
- Status: Pending verification

### Running Automated Tests

```bash
# Navigate to backend directory
cd my-expo-backend

# Run verification system test
node test-verification-system.js

# Expected output:
# ✅ Test 1: Admin login successful
# ✅ Test 2: Vendor GST verification successful
# ✅ Test 3: Vendor GST rejection successful
# ✅ Test 4: Driver license verification successful
# ✅ Test 5: Driver license rejection successful
# ✅ Test 6: Re-verify vendor GST successful
# ✅ Test 7: Re-verify driver license successful
# 
# ═══════════════════════════════════════
# ✅ ALL TESTS PASSED (7/7)
# ═══════════════════════════════════════
```

### Create Test Data

```bash
# Create sample loads for testing
node createSampleLoads.js

# This will create 5-10 test loads with:
# - Random pickup/drop locations
# - Various vehicle types
# - Different load weights
# - Random budgets
```

### End-to-End Flow Test

```bash
# Run complete flow test
node complete-flow-test.js

# This tests:
# 1. Driver registration
# 2. Vendor registration
# 3. Load posting
# 4. Load acceptance
# 5. Trip tracking
# 6. Proof of delivery
# 7. Rating system
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Cannot connect to server" in mobile app

**Symptoms:**
- App shows "Network Error"
- Loading screens hang indefinitely
- API calls fail with timeout

**Solutions:**

1. **Verify same WiFi network:**
   ```bash
   # On computer, check IP:
   ifconfig | grep inet
   
   # On phone, check WiFi settings:
   # Settings > WiFi > [Your Network] > IP Address
   # Should be in same range (e.g., both 192.168.1.x)
   ```

2. **Check IP address in api.ts:**
   ```typescript
   // File: my-expo-app/services/api.ts
   // Line 26 should match your computer's IP
   'http://192.168.1.14:3001',  // Update this!
   ```

3. **Test backend connectivity:**
   ```bash
   # From phone browser, visit:
   http://YOUR_COMPUTER_IP:3001/health
   
   # Should return: {"status":"OK",...}
   ```

4. **Check firewall settings:**
   ```bash
   # macOS - Allow port 3001
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add node
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock node
   
   # Windows - Add firewall rule
   # Control Panel > Firewall > Allow an app
   # Add Node.js
   
   # Linux (Ubuntu)
   sudo ufw allow 3001/tcp
   ```

5. **Restart everything:**
   ```bash
   # Stop backend (Ctrl+C)
   # Stop Expo (Ctrl+C)
   # Close Expo Go app on phone
   # Restart backend
   # Restart Expo
   # Reopen Expo Go
   ```

---

#### Issue 2: Database connection error

**Symptoms:**
- Backend fails to start
- Error: "ECONNREFUSED 127.0.0.1:5432"
- Error: "database does not exist"

**Solutions:**

1. **Check PostgreSQL is running:**
   ```bash
   # macOS
   brew services list | grep postgresql
   # Should show: postgresql@14 started
   
   # If not started:
   brew services start postgresql@14
   
   # Linux
   sudo systemctl status postgresql
   # If not running:
   sudo systemctl start postgresql
   ```

2. **Verify database exists:**
   ```bash
   psql -U postgres -c "\l" | grep load_management
   
   # If not found, create it:
   createdb -U postgres load_management
   ```

3. **Check credentials:**
   ```bash
   # Test login:
   psql -U postgres -d load_management
   
   # If password error, reset password:
   sudo -u postgres psql
   # Then: ALTER USER postgres WITH PASSWORD 'password';
   ```

4. **Re-run schema:**
   ```bash
   psql -U postgres -d load_management -f normalized-database-schema.sql
   ```

---

#### Issue 3: Redis connection error

**Symptoms:**
- Backend starts but shows Redis errors
- Warning: "Redis client is not connected"

**Solutions:**

1. **Start Redis:**
   ```bash
   # macOS
   brew services start redis
   
   # Linux
   sudo systemctl start redis-server
   
   # Verify:
   redis-cli ping
   # Should respond: PONG
   ```

2. **Check Redis port:**
   ```bash
   # Default is 6379
   redis-cli -p 6379 ping
   ```

3. **Redis is optional:**
   - The app will work without Redis
   - Redis is used for caching and performance
   - You can ignore Redis warnings if testing

---

#### Issue 4: Expo Go app crashes or shows blank screen

**Symptoms:**
- App loads then crashes
- White/blank screen
- Error: "Unable to resolve module"

**Solutions:**

1. **Clear Expo cache:**
   ```bash
   # In my-expo-app directory:
   npx expo start -c
   # or
   npx expo start --clear
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Clear phone cache:**
   - Close Expo Go completely
   - On Android: Settings > Apps > Expo Go > Storage > Clear Cache
   - On iOS: Delete and reinstall Expo Go app

4. **Check Expo Go version:**
   - Update Expo Go to latest version from App Store/Play Store
   - Ensure SDK versions match (check `app.json`)

---

#### Issue 5: GPS/Location not working

**Symptoms:**
- "Location permission denied"
- Map doesn't show current location
- Live tracking not updating

**Solutions:**

1. **Grant location permissions:**
   - **Android**: Settings > Apps > Expo Go > Permissions > Location > Allow all the time
   - **iOS**: Settings > Privacy > Location Services > Expo Go > Always

2. **Enable GPS:**
   - Ensure GPS is turned on in phone settings
   - Check "High Accuracy" mode (Android)

3. **Test outdoors:**
   - GPS works better outdoors
   - May not work well indoors or in buildings

---

#### Issue 6: Cannot upload images/documents

**Symptoms:**
- Photo upload fails
- "Permission denied" for camera/gallery
- File upload timeout

**Solutions:**

1. **Grant permissions:**
   - **Android**: Settings > Apps > Expo Go > Permissions
     - Camera: Allow
     - Storage: Allow
   - **iOS**: Settings > Privacy
     - Camera: Expo Go
     - Photos: Expo Go

2. **Check file size:**
   - Maximum file size: 10MB
   - Compress large images before upload

3. **Verify uploads folder:**
   ```bash
   # In my-expo-backend:
   mkdir -p uploads
   chmod 755 uploads
   ```

---

#### Issue 7: OTP not received (development)

**Note:** In development mode, OTP is **not actually sent** via SMS.

**Solutions:**

1. **Use any 6-digit code:**
   ```
   Enter any 6 digits, e.g.: 123456
   All OTPs are accepted in development mode
   ```

2. **Check console logs:**
   ```bash
   # Backend terminal shows the OTP
   # Look for: 📱 OTP for +919876543210: 123456
   ```

---

### Debug Tools

#### Backend Debug Mode

```bash
# Run backend with verbose logging
NODE_ENV=development node server-postgresql-redis.js
```

#### Test Network Connectivity

```bash
# Test from mobile app directory
node test-network.js
```

#### Database Inspection

```bash
# View all users
psql -U postgres -d load_management -c "SELECT id, name, phone, user_type, verified FROM users;"

# View all loads
psql -U postgres -d load_management -c "SELECT id, status, weight, budget FROM loads LIMIT 10;"

# View drivers
psql -U postgres -d load_management -c "SELECT u.name, d.vehicle_type, d.is_available FROM users u JOIN drivers d ON u.id = d.id;"
```

#### Clear Test Data

```bash
# Navigate to backend
cd my-expo-backend

# Run cleanup script
node database-cleanup.js

# This will:
# - Delete all test loads
# - Keep admin users
# - Reset counters
```

---

## 📁 Project Structure

```
karim/
├── my-expo-app/                    # Mobile Application (React Native + Expo)
│   ├── app/                        # App screens (Expo Router)
│   │   ├── (tabs)/                # Tab-based navigation screens
│   │   │   ├── index.tsx          # Home/Dashboard
│   │   │   ├── loads.tsx          # Available loads screen
│   │   │   ├── driver-profile.tsx # Driver profile & settings
│   │   │   ├── profile.tsx        # Vendor profile
│   │   │   ├── post-load.tsx      # Post new load screen
│   │   │   ├── my-loads.tsx       # Vendor's loads list
│   │   │   ├── load-details.tsx   # Load details & tracking
│   │   │   └── trip-tracking.tsx  # Active trip tracking
│   │   ├── auth/                  # Authentication screens
│   │   │   ├── login.tsx          # Phone login with OTP
│   │   │   ├── driver-setup.tsx   # Driver registration
│   │   │   └── vendor-setup.tsx   # Vendor registration
│   │   ├── admin/                 # Admin dashboard screens
│   │   │   ├── dashboard.tsx      # Admin home
│   │   │   ├── pending-users.tsx  # User approvals
│   │   │   └── pending-documents.tsx  # Document verification
│   │   ├── _layout.tsx            # Root layout
│   │   └── index.tsx              # App entry point
│   ├── components/                # Reusable UI components
│   │   ├── MapPicker.tsx          # Interactive map for location selection
│   │   ├── PaymentModal.tsx       # Payment UI component
│   │   ├── RatingModal.tsx        # Rating & review component
│   │   ├── LoadActionButtons.tsx  # Load action buttons
│   │   ├── LiveTracking/          # Live tracking components
│   │   │   └── DriverLocationMap.tsx  # Real-time map
│   │   └── ui/                    # Generic UI components
│   ├── services/                  # API & business logic
│   │   ├── api.ts                 # Main API service (axios wrapper)
│   │   ├── auth.ts                # Authentication service
│   │   ├── load.ts                # Load management service
│   │   ├── location.ts            # GPS & location service
│   │   ├── liveTracking.ts        # Live tracking service
│   │   └── LiveTrackingService.js # Legacy tracking service
│   ├── constants/                 # App constants
│   │   └── theme.ts               # Colors, fonts, spacing
│   ├── hooks/                     # Custom React hooks
│   │   └── use-theme-color.ts     # Theme hook
│   ├── assets/                    # Static assets
│   │   └── images/                # App icons, images
│   ├── android/                   # Android native configuration
│   ├── ios/                       # iOS native configuration
│   ├── app.json                   # Expo configuration
│   ├── package.json               # Dependencies
│   └── tsconfig.json              # TypeScript configuration
│
├── my-expo-backend/               # Backend Server (Node.js + Express)
│   ├── server-postgresql-redis.js # Main server file (4600+ lines)
│   ├── admin-routes.js            # Admin API routes (verification, approvals)
│   ├── registration-routes.js     # User registration routes
│   ├── models-updated.js          # Database models (Sequelize)
│   ├── geocoding-service.js       # Address geocoding service
│   ├── india-geocoding-service.js # India-specific geocoding
│   │
│   ├── Test Scripts/              # Testing utilities
│   │   ├── test-verification-system.js  # Verification tests
│   │   ├── complete-flow-test.js        # End-to-end tests
│   │   ├── test-driver-flow.js          # Driver workflow tests
│   │   ├── e2e-test.js                  # E2E integration tests
│   │   └── createSampleLoads.js         # Generate test data
│   │
│   ├── Admin Scripts/             # Admin utilities
│   │   ├── set-admin-password.js        # Create admin user
│   │   ├── get-test-users.js            # Find test users
│   │   ├── database-cleanup.js          # Clean test data
│   │   └── delete-user.js               # Delete specific user
│   │
│   ├── uploads/                   # File upload directory
│   │   ├── documents/             # User documents
│   │   └── pod/                   # Proof of delivery photos
│   │
│   ├── package.json               # Backend dependencies
│   └── .env                       # Environment variables (create this!)
│
├── Database Files/                # Database schema & migrations
│   ├── normalized-database-schema.sql  # Complete DB schema (400 lines)
│   └── database-migration-script.sql   # Migration scripts
│
├── Documentation/                 # Project documentation
│   ├── README.md                  # This file
│   ├── PROJECT_COMPLETION_ANALYSIS.md  # Feature completion report
│   ├── INTEGRATION_GUIDE.md       # Integration documentation
│   ├── TEST-TRACKING-README.md    # Testing guide
│   └── MOBILE_ADMIN_GUIDE.md      # Admin features guide
│
└── package.json                   # Root package.json
```

### Key Files to Configure

**Must Edit:**
1. ✅ `my-expo-app/services/api.ts` - Line 26 (Your computer IP)
2. ✅ `my-expo-backend/.env` - Database credentials
3. ✅ `my-expo-backend/server-postgresql-redis.js` - Check DB config (lines 23-37)

**Optional:**
- `my-expo-app/app.json` - App name, bundle ID
- `my-expo-app/constants/theme.ts` - App colors, styling

---

## 📡 API Documentation

### Base URL
```
http://YOUR_COMPUTER_IP:3001/api
```

### Authentication

#### POST `/auth/send-otp`
Send OTP for phone verification
```json
{
  "phone": "+919876543210",
  "userType": "driver"
}
```

#### POST `/auth/verify-otp`
Verify OTP and login
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

#### POST `/auth/admin/login`
Admin login
```json
{
  "username": "superadmin",
  "password": "Admin@123"
}
```

### Driver APIs

#### GET `/loads/nearby?lat=12.9716&lng=77.5946&radius=50`
Get nearby loads

#### POST `/loads/:id/accept`
Accept a load

#### POST `/loads/:id/update-status`
Update load status (pickup, in_transit, delivered)

#### POST `/loads/:id/proof-of-delivery`
Upload proof of delivery photo

### Vendor APIs

#### POST `/loads`
Create new load
```json
{
  "pickupLocation": {"lat": 12.9716, "lng": 77.5946, "address": "..."},
  "dropLocation": {"lat": 13.0827, "lng": 80.2707, "address": "..."},
  "weight": 1500,
  "vehicleType": "Large Truck",
  "budget": 25000,
  "description": "Electronics shipment",
  "pickupDate": "2025-10-28"
}
```

#### GET `/loads/vendor/:vendorId`
Get vendor's loads

#### GET `/loads/:id/live-tracking`
Get live tracking data for active load

### Admin APIs

#### GET `/admin/pending-users`
Get users pending approval

#### POST `/admin/vendors/:id/verify-gst`
Verify vendor GST

#### POST `/admin/drivers/:id/verify-license`
Verify driver license

### For complete API documentation:
```bash
# View all routes
grep "app.get\|app.post\|app.put\|app.delete" my-expo-backend/server-postgresql-redis.js
```

---

## 🧪 Testing Checklist

### Before Sharing with Others

- [ ] PostgreSQL database is set up and accessible
- [ ] Redis is running (optional but recommended)
- [ ] Backend starts without errors
- [ ] Health endpoint responds: `http://localhost:3001/health`
- [ ] Mobile app IP address is configured in `api.ts`
- [ ] Admin user is created (`superadmin`/`Admin@123`)
- [ ] Test data is loaded (optional: run `createSampleLoads.js`)
- [ ] Both computer and phone are on same WiFi network
- [ ] Expo Go is installed on test device
- [ ] All verification tests pass: `node test-verification-system.js`

### Manual Testing Flow

1. **Driver Registration:**
   - [ ] Open app, tap "Continue as Driver"
   - [ ] Enter phone number: `+918765432109`
   - [ ] Enter any OTP (e.g., `123456`)
   - [ ] Fill driver details (name, license, vehicle)
   - [ ] Upload license photo (optional)
   - [ ] Complete registration

2. **Vendor Registration:**
   - [ ] Start app, tap "Continue as Vendor"
   - [ ] Enter phone number: `+919876543210`
   - [ ] Enter any OTP
   - [ ] Fill business details (name, GST)
   - [ ] Complete registration

3. **Admin Verification:**
   - [ ] Login as admin (`superadmin`/`Admin@123`)
   - [ ] Approve pending users
   - [ ] Verify documents (GST, license)

4. **Post Load (Vendor):**
   - [ ] Login as vendor
   - [ ] Tap "Post Load"
   - [ ] Select pickup location on map
   - [ ] Select drop location
   - [ ] Fill details (weight, budget, etc.)
   - [ ] Submit load

5. **Accept Load (Driver):**
   - [ ] Login as driver
   - [ ] View nearby loads
   - [ ] Tap on a load
   - [ ] Accept load

6. **Track Trip:**
   - [ ] Driver updates status (pickup → in_transit)
   - [ ] Vendor views live tracking
   - [ ] Driver marks delivered
   - [ ] Driver uploads proof of delivery

7. **Rating:**
   - [ ] Vendor rates driver
   - [ ] Driver rates vendor

---

## 🚀 Production Deployment

### Before Going to Production

1. **Security:**
   - [ ] Change all default passwords
   - [ ] Generate strong JWT secrets
   - [ ] Enable HTTPS/SSL certificates
   - [ ] Configure CORS properly
   - [ ] Rate limiting on all endpoints
   - [ ] Input validation & sanitization

2. **Database:**
   - [ ] Use managed PostgreSQL (AWS RDS, Digital Ocean, etc.)
   - [ ] Enable automated backups
   - [ ] Set up connection pooling
   - [ ] Configure read replicas

3. **Backend:**
   - [ ] Deploy to production server (AWS, Heroku, Digital Ocean)
   - [ ] Set up environment variables
   - [ ] Configure logging (Winston, Morgan)
   - [ ] Set up monitoring (PM2, New Relic)
   - [ ] Configure CDN for file uploads

4. **Mobile App:**
   - [ ] Build production APK/IPA
   - [ ] Update API URLs to production
   - [ ] Configure push notifications (FCM, APNs)
   - [ ] Add error tracking (Sentry)
   - [ ] Publish to Play Store / App Store

5. **Payment Gateway:**
   - [ ] Integrate Razorpay/Stripe
   - [ ] Test in sandbox mode
   - [ ] Configure webhooks
   - [ ] Handle payment failures

6. **Performance:**
   - [ ] Enable Redis caching
   - [ ] Optimize database queries
   - [ ] Implement pagination
   - [ ] Compress API responses
   - [ ] Image optimization

---

## 📞 Support & Contact

### If You Get Stuck

1. **Check the logs:**
   - Backend: Check terminal where `server-postgresql-redis.js` is running
   - Mobile: Shake phone → "Show Dev Menu" → "Remote JS Debugging"

2. **Common log locations:**
   ```bash
   # Backend logs
   tail -f my-expo-backend/logs/app.log
   
   # Database logs
   # macOS
   tail -f /usr/local/var/log/postgresql@14.log
   
   # Linux
   sudo tail -f /var/log/postgresql/postgresql-14-main.log
   ```

3. **Reset everything:**
   ```bash
   # Stop all services
   pkill node
   
   # Restart PostgreSQL
   brew services restart postgresql@14  # macOS
   sudo systemctl restart postgresql    # Linux
   
   # Restart Redis
   brew services restart redis           # macOS
   sudo systemctl restart redis-server  # Linux
   
   # Clear all caches
   cd my-expo-app
   rm -rf node_modules .expo .expo-shared
   npm install
   npx expo start -c
   ```

---

## 🎓 Learning Resources

### React Native & Expo
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)

### Backend Development
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Sequelize ORM](https://sequelize.org/docs/v6/)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/14/tutorial.html)

### Maps & Location
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Leaflet.js](https://leafletjs.com/)

---

## 📝 License

This project is private and proprietary.

---

## 🙏 Acknowledgments

- React Native & Expo teams
- OpenStreetMap contributors
- PostgreSQL & Redis communities
- All open-source library maintainers

---

## 📊 Project Stats

- **Total Files**: 200+
- **Lines of Code**: ~50,000
- **Backend API Endpoints**: 80+
- **Mobile Screens**: 25+
- **Database Tables**: 15+
- **Development Time**: 6+ months
- **Current Version**: 1.0.0
- **Project Completion**: 75-80% (see `PROJECT_COMPLETION_ANALYSIS.md`)

---

## 🔄 Version History

### v1.0.0 (Current)
- ✅ Driver & Vendor registration
- ✅ Load posting & management
- ✅ GPS live tracking
- ✅ Admin verification system
- ✅ Rating & feedback
- ✅ Proof of delivery
- ⚠️ Payment UI (gateway pending)

### Upcoming Features
- 🔜 Real payment gateway (Razorpay)
- 🔜 AI-based driver matching
- 🔜 Push notifications
- 🔜 In-app chat
- 🔜 Advanced analytics

---

**🎉 You're all set! Happy coding!**

For issues or questions, check the [Troubleshooting](#-troubleshooting) section above.

---

**Last Updated**: October 26, 2025  
**Maintained by**: LoadConnect Development Team
