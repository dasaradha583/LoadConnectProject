export type UserType = 'driver' | 'vendor' | 'admin';

export interface User {
  id: string;
  type: UserType;
  phone: string;
  username: string;
  name: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver extends User {
  type: 'driver';
  licenseNumber: string;
  licensePhoto?: string;
  vehicleType: string;
  vehicleCapacity: number;
  vehicleNumber: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  isAvailable: boolean;
  rating: number;
  totalTrips: number;
  completedTrips?: number;
  totalEarnings: number;
}

export interface Vendor extends User {
  type: 'vendor';
  businessName: string;
  gstNumber: string;
  rating: number;
  totalOrders: number;
}

export interface Admin extends User {
  type: 'admin';
  adminLevel?: string;
  department?: string;
  canApproveVendors?: boolean;
  canApproveDrivers?: boolean;
  canSuspendUsers?: boolean;
  canViewFinancials?: boolean;
  canManageAdmins?: boolean;
}

export interface Load {
  id: string;
  vendorId: string;
  driverId?: string;
  status: 'posted' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  weight: number;
  description: string;
  vehicleTypeRequired?: string;
  
  // Location details
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  
  // Enhanced address fields for server compatibility
  pickupAddress?: string;
  dropAddress?: string;
  
  // Driver tracking
  driverCurrentLat?: number;
  driverCurrentLng?: number;
  lastLocationUpdate?: Date;
  isPickedUp?: boolean;
  isDropped?: boolean;
  pickupConfirmedAt?: Date;
  dropConfirmedAt?: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Contact details
  pickupContactName?: string;
  pickupContactPhone?: string;
  dropContactName?: string;
  dropContactPhone?: string;
  
  // Timing
  pickupDate: Date;
  dropDate?: Date;
  
  // Pricing
  budget: number;
  finalPrice?: number;
  
  // Distance and logistics
  estimatedDistance: number;
  actualDistance?: number;
  estimatedDuration?: number;
  
  // Delivery proof
  proofOfDelivery?: string;
  deliveryNotes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Populated relationships
  vendor?: Partial<User>;
  driver?: Partial<User>;
}
