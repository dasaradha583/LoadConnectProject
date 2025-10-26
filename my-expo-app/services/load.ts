// filepath: /Users/dasaradha/Coding/karim/my-expo-app/services/load.ts
import { Load } from '@/types/user';
import { api } from './api';

// Remove unused interface

class LoadService {
  private static instance: LoadService;

  static getInstance(): LoadService {
    if (!LoadService.instance) {
      LoadService.instance = new LoadService();
    }
    return LoadService.instance;
  }

  // Get available loads for drivers with location-based matching
  async getAvailableLoads(
    location: { latitude: number; longitude: number } | null,
    vehicleTypes?: string[],
    radiusKm: number = 50
  ): Promise<{ loads: Load[], hasActiveLoad?: boolean, activeLoad?: any }> {
    try {
      // Use the API service method with location-based matching
      const response = await api.getAvailableLoads(
        location ? { lat: location.latitude, lng: location.longitude } : undefined,
        radiusKm
      );
      
      if (response.success) {
        console.log(`📍 Location-based loads: ${response.data?.length || 0} loads found`);
        if ((response as any).searchInfo) {
          console.log(`🔍 Search info:`, (response as any).searchInfo);
        }
        
        // Check if driver has an active load
        if ((response as any).hasActiveLoad) {
          console.log('⚠️ Driver has an active load');
          return {
            loads: [],
            hasActiveLoad: true,
            activeLoad: (response as any).activeLoad
          };
        }
        
        return {
          loads: this.transformBackendLoads(response.data || []),
          hasActiveLoad: false
        };
      }
      
      throw new Error(response.message || 'Failed to fetch available loads');
    } catch (error) {
      console.error('Error getting available loads:', error);
      throw error;
    }
  }

  // Accept a load
  async acceptLoad(loadId: string, driverId: string): Promise<boolean> {
    try {
      const response = await api.post<any>(`/loads/${loadId}/accept`, {
        driverId,
      });

      if (!response.success) {
        // Throw error with the backend message
        throw new Error(response.message || 'Failed to accept load');
      }

      return true;
    } catch (error: any) {
      console.error('Error accepting load:', error);
      // Re-throw with the error message so the UI can display it
      throw new Error(error.message || 'Failed to accept load. Please try again.');
    }
  }

  // Update load status
  async updateLoadStatus(
    loadId: string,
    status: Load['status'],
    driverId: string,
    additionalData?: any
  ): Promise<boolean> {
    try {
      const response = await api.put(`/loads/${loadId}/status`, {
        status,
        driverId,
        ...additionalData,
      });

      return response.success;
    } catch (error) {
      console.error('Error updating load status:', error);
      return false;
    }
  }

  // Get driver's loads
  async getDriverLoads(driverId: string, statusFilter?: string[]): Promise<Load[]> {
    try {
      let url = `/loads/driver/${driverId}`;
      if (statusFilter && statusFilter.length > 0) {
        url += `?status=${statusFilter.join(',')}`;
      }

      const response = await api.get<any>(url);
      
      if (response.success) {
        return this.transformBackendLoads(response.data || []);
      }
      
      throw new Error(response.message || 'Failed to fetch driver loads');
    } catch (error) {
      console.error('Error getting driver loads:', error);
      throw error;
    }
  }

  // Get vendor's loads
  async getVendorLoads(vendorId: string, statusFilter?: string[]): Promise<Load[]> {
    try {
      console.log(`📱 Frontend: Fetching loads for vendor ID: ${vendorId}`);
      
      let url = `/loads/vendor/${vendorId}`;
      if (statusFilter && statusFilter.length > 0) {
        url += `?status=${statusFilter.join(',')}`;
      }

      const response = await api.get<any>(url);
      
      if (response.success) {
        return this.transformBackendLoads(response.data || []);
      }
      
      throw new Error(response.message || 'Failed to fetch vendor loads');
    } catch (error) {
      console.error('Error getting vendor loads:', error);
      throw error;
    }
  }

  // Alias methods for backward compatibility
  async getLoadsByDriver(driverId: string, statusFilter?: string[]): Promise<Load[]> {
    return this.getDriverLoads(driverId, statusFilter);
  }

  async getLoadsByVendor(vendorId: string, statusFilter?: string[]): Promise<Load[]> {
    return this.getVendorLoads(vendorId, statusFilter);
  }

  // Create new load (for vendors) - simplified to let server handle geocoding
  async createLoad(loadData: {
    vendorId: string;
    weight: number;
    description: string;
    vehicleTypeRequired: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    dropLat: number;
    dropLng: number;
    dropAddress: string;
    pickupContactName: string;
    pickupContactPhone: string;
    dropContactName: string;
    dropContactPhone: string;
    pickupDate: Date;
    budget: number;
  }): Promise<Load> {
    try {
      // Send coordinates from map selection
      const payload = {
        vendorId: loadData.vendorId,
        weight: loadData.weight,
        description: loadData.description,
        vehicleTypeRequired: loadData.vehicleTypeRequired,
        // Send coordinates as primary data (required)
        pickupLat: loadData.pickupLat,
        pickupLng: loadData.pickupLng,
        pickupAddress: loadData.pickupAddress,
        dropLat: loadData.dropLat,
        dropLng: loadData.dropLng,
        dropAddress: loadData.dropAddress,
        pickupContactName: loadData.pickupContactName,
        pickupContactPhone: loadData.pickupContactPhone,
        pickupDate: loadData.pickupDate.toISOString(),
        dropContactName: loadData.dropContactName,
        dropContactPhone: loadData.dropContactPhone,
        budget: loadData.budget,
      };

      const response = await api.post<any>('/loads', payload);
      
      if (response.success) {
        return this.transformBackendLoad(response.data);
      }
      
      throw new Error(response.message || 'Failed to create load');
    } catch (error) {
      console.error('Error creating load:', error);
      throw error;
    }
  }

  // Upload proof of delivery
  async uploadProofOfDelivery(
    loadId: string,
    driverId: string,
    proofImageUrl: string,
    deliveryNotes?: string
  ): Promise<boolean> {
    try {
      const response = await api.post<any>(`/loads/${loadId}/proof-of-delivery`, {
        driverId,
        proofImageUrl,
        deliveryNotes,
      });

      return response.success;
    } catch (error) {
      console.error('Error uploading proof of delivery:', error);
      return false;
    }
  }

  // Get load details
  async getLoadById(loadId: string): Promise<Load | null> {
    try {
      const response = await api.get<any>(`/loads/${loadId}`);
      
      if (response.success) {
        return this.transformBackendLoad(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting load details:', error);
      return null;
    }
  }

  // Get driver earnings
  async getDriverEarnings(driverId: string): Promise<{
    totalEarnings: number;
    completedTrips: number;
    thisMonthEarnings: number;
    thisWeekEarnings: number;
  }> {
    try {
      const response = await api.get<any>(`/loads/driver/${driverId}/earnings`);
      
      if (response.success) {
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to fetch earnings');
    } catch (error) {
      console.error('Error getting driver earnings:', error);
      throw error;
    }
  }

  // Transform backend load data to frontend format
  private transformBackendLoad(backendLoad: any): Load {
    console.log('🔄 Transforming load:', {
      id: backendLoad.id?.substring(0, 8),
      hasPickupLocation: !!backendLoad.pickupLocation,
      pickupLat: backendLoad.pickupLat,
      pickupAddress: backendLoad.pickupAddress?.substring(0, 30)
    });
    
    // Handle both old flat format and new nested format from backend
    const pickupLocation = backendLoad.pickupLocation || {
      latitude: parseFloat(backendLoad.pickupLat),
      longitude: parseFloat(backendLoad.pickupLng),
      address: backendLoad.pickupAddress,
    };
    
    const dropLocation = backendLoad.dropLocation || {
      latitude: parseFloat(backendLoad.dropLat),
      longitude: parseFloat(backendLoad.dropLng),
      address: backendLoad.dropAddress,
    };

    return {
      id: backendLoad.id,
      vendorId: backendLoad.vendorId,
      driverId: backendLoad.driverId,
      status: backendLoad.status,
      weight: parseFloat(backendLoad.weight) || 0,
      description: backendLoad.description,
      vehicleTypeRequired: backendLoad.vehicleTypeRequired,
      pickupLocation: {
        latitude: parseFloat(pickupLocation.latitude),
        longitude: parseFloat(pickupLocation.longitude),
        address: pickupLocation.address || `${pickupLocation.latitude}, ${pickupLocation.longitude}`,
      },
      dropLocation: {
        latitude: parseFloat(dropLocation.latitude),
        longitude: parseFloat(dropLocation.longitude),
        address: dropLocation.address || `${dropLocation.latitude}, ${dropLocation.longitude}`,
      },
      pickupContactName: backendLoad.pickupContactName,
      pickupContactPhone: backendLoad.pickupContactPhone,
      dropContactName: backendLoad.dropContactName,
      dropContactPhone: backendLoad.dropContactPhone,
      pickupDate: new Date(backendLoad.pickupDate),
      dropDate: backendLoad.dropDate ? new Date(backendLoad.dropDate) : undefined,
      budget: parseFloat(backendLoad.budget),
      finalPrice: backendLoad.finalPrice ? parseFloat(backendLoad.finalPrice) : undefined,
      estimatedDistance: parseFloat(backendLoad.estimatedDistance),
      actualDistance: backendLoad.actualDistance ? parseFloat(backendLoad.actualDistance) : undefined,
      estimatedDuration: backendLoad.estimatedDuration,
      proofOfDelivery: backendLoad.proofOfDelivery,
      deliveryNotes: backendLoad.deliveryNotes,
      createdAt: new Date(backendLoad.createdAt),
      updatedAt: new Date(backendLoad.updatedAt),
      vendor: backendLoad.vendor,
      driver: backendLoad.driver,
    };
  }

  // Transform array of backend loads
  private transformBackendLoads(backendLoads: any[]): Load[] {
    return backendLoads.map(load => this.transformBackendLoad(load));
  }

  // Get nearby loads (wrapper for getAvailableLoads)
  async getNearbyLoads(
    location: { latitude: number; longitude: number },
    vehicleTypes?: string[],
    radiusKm: number = 50
  ): Promise<{ loads: Load[], hasActiveLoad?: boolean, activeLoad?: any }> {
    return this.getAvailableLoads(location, vehicleTypes, radiusKm);
  }

  // Assign load to driver (wrapper for acceptLoad)
  async assignLoadToDriver(loadId: string, driverId: string): Promise<boolean> {
    return this.acceptLoad(loadId, driverId);
  }

  // Rate vendor (driver rates vendor after completing load)
  async rateVendor(loadId: string, rating: number, feedback?: string): Promise<{ success: boolean; newRating?: number }> {
    try {
      const response = await api.post<any>(`/loads/${loadId}/rate-vendor`, {
        rating,
        feedback,
      });

      if (response.success) {
        return {
          success: true,
          newRating: parseFloat(response.data.newRating)
        };
      }

      throw new Error(response.message || 'Failed to rate vendor');
    } catch (error) {
      console.error('Error rating vendor:', error);
      return { success: false };
    }
  }

  // Rate driver (vendor rates driver after completing load)
  async rateDriver(
    loadId: string, 
    rating: number, 
    review?: string,
    ratingAspects?: {
      punctuality?: number;
      behavior?: number;
      vehicleCondition?: number;
      careOfGoods?: number;
    }
  ): Promise<{ 
    success: boolean; 
    newAverageRating?: number;
    totalRatings?: number;
    ratingId?: string;
  }> {
    try {
      const response = await api.post<any>(`/loads/${loadId}/rate-driver`, {
        rating,
        review,
        ratingAspects,
      });

      if (response.success) {
        return {
          success: true,
          newAverageRating: response.data.newAverageRating,
          totalRatings: response.data.totalRatings,
          ratingId: response.data.ratingId
        };
      }

      throw new Error(response.message || 'Failed to rate driver');
    } catch (error) {
      console.error('Error rating driver:', error);
      return { success: false };
    }
  }

  // Get driver's ratings history
  async getDriverRatings(driverId: string): Promise<{
    success: boolean;
    data?: {
      averageRating: number;
      totalRatings: number;
      ratingDistribution: { [key: number]: number };
      ratings: any[];
    };
  }> {
    try {
      const response = await api.get<any>(`/drivers/${driverId}/ratings`);
      return response;
    } catch (error) {
      console.error('Error fetching driver ratings:', error);
      return { success: false };
    }
  }
}

export default LoadService;
