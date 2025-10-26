# Load Management Backend API

## Overview
Backend API for the Load Management Application that connects drivers and vendors for efficient cargo transportation.

## Features
- **Authentication & Authorization** - JWT-based auth with role-based access
- **Real-time Communication** - Socket.IO for live updates
- **Load Management** - CRUD operations for load requests
- **Smart Matching** - AI-powered driver-load matching algorithm
- **GPS Tracking** - Real-time location tracking and route optimization
- **File Upload** - Image upload for proof of delivery
- **Notifications** - Push notifications for load updates
- **Analytics** - Earnings tracking and performance metrics

## Tech Stack
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose** ODM
- **Socket.IO** for real-time features
- **JWT** for authentication
- **Cloudinary** for image storage
- **TypeScript** for type safety

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify` - Phone verification
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/location` - Update user location

### Loads
- `GET /api/loads` - Get loads (with filtering)
- `POST /api/loads` - Create new load
- `GET /api/loads/:id` - Get load details
- `PUT /api/loads/:id` - Update load
- `DELETE /api/loads/:id` - Delete load
- `POST /api/loads/:id/assign` - Assign load to driver
- `POST /api/loads/:id/status` - Update load status

### Matching
- `GET /api/matching/recommendations/:driverId` - Get personalized load recommendations
- `POST /api/matching/notify` - Notify drivers about new loads

### Tracking
- `POST /api/tracking/location` - Update driver location
- `GET /api/tracking/route/:loadId` - Get route history
- `POST /api/tracking/proof` - Upload proof of delivery

### Analytics
- `GET /api/analytics/earnings/:driverId` - Get driver earnings
- `GET /api/analytics/performance/:vendorId` - Get vendor performance

## Environment Variables
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/load-management
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Installation & Setup
```bash
npm install
npm run dev
```

## Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/         # MongoDB models
├── routes/         # API routes
├── services/       # Business logic services
├── socket/         # Socket.IO handlers
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── server.ts       # Main server file
```
