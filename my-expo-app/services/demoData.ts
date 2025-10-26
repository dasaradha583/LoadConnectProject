// Demo data for testing the app
import { Driver, Load, Vendor } from '@/types/user';

export const demoDrivers: Driver[] = [
  {
    id: 'driver-1',
    type: 'driver',
    phone: '9876543210',
    username: 'driver1',
    name: 'Rajesh Kumar',
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    licenseNumber: 'DL123456789',
    vehicleType: 'truck',
    vehicleCapacity: 5.0,
    vehicleNumber: 'MH01AB1234',
    currentLocation: {
      latitude: 19.0760,
      longitude: 72.8777
    },
    isAvailable: true,
    rating: 4.5,
    totalTrips: 150,
    completedTrips: 145,
    totalEarnings: 75000
  }
];

export const demoVendors: Vendor[] = [
  {
    id: 'vendor-1',
    type: 'vendor',
    phone: '9876543211',
    username: 'vendor1',
    name: 'Priya Sharma',
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    businessName: 'Mumbai Logistics Pvt Ltd',
    gstNumber: 'GST123456789',
    rating: 4.2,
    totalOrders: 85
  }
];

export const demoLoads: Load[] = [
  {
    id: 'load-1',
    vendorId: 'vendor-1',
    status: 'posted',
    weight: 2.5,
    description: 'Electronics shipment - Handle with care',
    vehicleTypeRequired: 'truck',
    pickupLocation: {
      latitude: 19.0760,
      longitude: 72.8777,
      address: 'Andheri East, Mumbai, Maharashtra 400069'
    },
    dropLocation: {
      latitude: 18.9220,
      longitude: 72.8347,
      address: 'Fort, Mumbai, Maharashtra 400001'
    },
    pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    budget: 2500,
    estimatedDistance: 25.5,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'load-2',
    vendorId: 'vendor-1',
    driverId: 'driver-1',
    status: 'assigned',
    weight: 1.8,
    description: 'Textile goods delivery',
    vehicleTypeRequired: 'truck',
    pickupLocation: {
      latitude: 19.0178,
      longitude: 72.8478,
      address: 'Dadar, Mumbai, Maharashtra 400014'
    },
    dropLocation: {
      latitude: 19.2183,
      longitude: 72.9781,
      address: 'Thane, Maharashtra 400601'
    },
    pickupDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    budget: 1800,
    estimatedDistance: 18.2,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const mockApiResponses = {
  availableLoads: demoLoads.filter(load => load.status === 'posted'),
  driverLoads: demoLoads.filter(load => load.driverId === 'driver-1'),
  vendorLoads: demoLoads.filter(load => load.vendorId === 'vendor-1')
};
