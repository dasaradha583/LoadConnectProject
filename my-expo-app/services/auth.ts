import { User, UserType, Driver, Vendor } from '@/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from './api';

class AuthService {
  private static instance: AuthService;
  private currentUser: Driver | Vendor | null = null;
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async getCurrentUser(): Promise<Driver | Vendor | null> {
    if (this.currentUser) return this.currentUser;
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Storage timeout')), 3000)
      );
      
      const userDataPromise = AsyncStorage.getItem('currentUser');
      const accessTokenPromise = AsyncStorage.getItem('accessToken');
      
      const [userData, accessToken] = await Promise.race([
        Promise.all([userDataPromise, accessTokenPromise]),
        timeoutPromise
      ]) as [string | null, string | null];
      
      if (userData && accessToken) {
        const user = JSON.parse(userData);
        if (user.type === 'driver') {
          this.currentUser = user as Driver;
        } else if (user.type === 'vendor') {
          this.currentUser = user as Vendor;
        }
        this.apiService.setAccessToken(accessToken);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      // Return null instead of throwing to prevent app crashes
    }
    return null;
  }

  async setCurrentUser(user: Driver | Vendor): Promise<void> {
    try {
      this.currentUser = user;
      await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
      console.error('Error setting current user:', error);
    }
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      this.apiService.setAccessToken(accessToken);
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  async clearUserData(): Promise<void> {
    try {
      this.currentUser = null;
      await AsyncStorage.multiRemove(['currentUser', 'accessToken', 'refreshToken']);
      this.apiService.setAccessToken(null);
      console.log('User data cleared - will fetch fresh data on next sign-in');
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('AuthService: Starting logout process...');
      
      // Get refresh token before clearing
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      console.log('AuthService: Retrieved refresh token for logout');
      
      // Clear in-memory cache first
      this.currentUser = null;
      console.log('AuthService: Cleared in-memory user cache');
      
      // Call backend signout
      try {
        await this.apiService.signOut(refreshToken || undefined);
        console.log('AuthService: Backend signout successful');
      } catch (apiError) {
        console.warn('AuthService: Backend signout failed, but continuing with local cleanup:', apiError);
      }
      
      // Clear local storage
      await this.clearUserData();
      console.log('AuthService: Local data cleared successfully');
      
    } catch (error) {
      console.error('AuthService: Error during logout:', error);
      // Still clear local storage even if backend call fails
      try {
        await this.clearUserData();
        console.log('AuthService: Emergency local data clear completed');
      } catch (clearError) {
        console.error('AuthService: Failed to clear local data:', clearError);
      }
      throw error;
    }
  }

  async sendOTP(phone: string): Promise<{ userExists: boolean; isNewUser: boolean }> {
    try {
      const response = await this.apiService.sendOTP(phone);
      if (response.success) {
        return response.data!;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  }

  async signInWithOTP(phone: string, otp: string): Promise<User> {
    try {
      console.log('🔐 SignIn: Starting signin for', phone);
      const response = await this.apiService.signIn(phone, otp);
      console.log('🔐 SignIn: Backend response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        const { user, tokens } = response.data!;
        console.log('🔐 SignIn: User data from backend:', user);
        console.log('🔐 SignIn: User type:', user.type);
        
        // Store tokens first
        await this.setTokens(tokens.accessToken, tokens.refreshToken);
        
        // Load full profile to get complete vendor/driver data
        console.log('🔐 SignIn: Loading full profile...');
        const fullProfile = await this.loadFullProfile();
        console.log('🔐 SignIn: Full profile loaded:', fullProfile);
        
        if (!fullProfile) {
          throw new Error('Failed to load full profile');
        }
        
        return fullProfile;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('🔐 SignIn error:', error);
      throw error;
    }
  }

  async registerWithOTP(phone: string, otp: string, userType: UserType, additionalData: any): Promise<User> {
    try {
      const userData = {
        phone,
        otp,
        name: additionalData.name,
        type: userType,
        ...additionalData,
      };

      const response = await this.apiService.register(userData);
      if (response.success) {
        const { user, tokens } = response.data!;
        
        // Backend returns flat user object with vendor/driver fields merged
        // Convert to local User type with all fields
        const localUser: User = {
          id: user.id,
          type: user.type,
          phone: user.phone,
          username: user.username,
          name: user.name,
          verified: user.phoneVerified || user.verified || false,
          createdAt: new Date(),
          updatedAt: new Date(),
          // Include vendor/driver specific fields from response
          ...(userType === 'vendor' ? {
            businessName: user.businessName || additionalData.businessName,
            gstNumber: user.gstNumber || additionalData.gstNumber,
            rating: user.rating || 5.0,
            totalOrders: user.totalOrders || 0
          } : {}),
          ...(userType === 'driver' ? {
            licenseNumber: user.licenseNumber || additionalData.licenseNumber,
            vehicleType: user.vehicleType || additionalData.vehicleType,
            vehicleCapacity: user.vehicleCapacity || additionalData.vehicleCapacity,
            vehicleNumber: user.vehicleNumber || additionalData.vehicleNumber,
            isAvailable: user.isAvailable || false,
            rating: user.rating || 5.0,
            totalTrips: user.totalTrips || 0,
            completedTrips: user.completedTrips || 0,
            totalEarnings: user.totalEarnings || 0
          } : {})
        };

        await this.setCurrentUser(localUser as Driver | Vendor);
        await this.setTokens(tokens.accessToken, tokens.refreshToken);
        
        return localUser;
      }
      throw new Error(response.message);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null && user.verified;
  }

  async forceLogout(): Promise<void> {
    // Force clear everything
    this.currentUser = null;
    await this.clearUserData();
    console.log('Force logout completed');
  }

  async updateProfile(updates: any): Promise<boolean> {
    try {
      if (!this.currentUser) {
        throw new Error('No user logged in');
      }

      // Update the current user object
      this.currentUser = { ...this.currentUser, ...updates };
      
      // Save to storage
      if (this.currentUser) {
        await this.setCurrentUser(this.currentUser);
      }
      
      // In a real app, you would also send this to the backend
      // const response = await this.apiService.put('/user/profile', updates);
      // return response.success;
      
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }

  // Load complete user profile from backend
  async loadFullProfile(): Promise<Driver | Vendor | null> {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        return null;
      }

      const apiService = ApiService.getInstance();
      apiService.setAccessToken(accessToken);
      
      const response = await apiService.getFullProfile();
      
      if (response.success && response.data) {
        const { user, driver, vendor } = response.data;
        
        // Merge user with driver or vendor data
        let mergedUser: Driver | Vendor;
        
        if (user.type === 'driver' && driver) {
          mergedUser = {
            ...user,
            ...driver,
            type: 'driver',
            verified: user.phoneVerified || false,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt)
          } as Driver;
        } else if (user.type === 'vendor' && vendor) {
          mergedUser = {
            ...user,
            ...vendor,
            type: 'vendor',
            verified: user.phoneVerified || false,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt)
          } as Vendor;
        } else {
          return null;
        }
        
        // Store the complete user data
        await AsyncStorage.setItem('currentUser', JSON.stringify(mergedUser));
        this.currentUser = mergedUser;
        
        return this.currentUser;
      }
      
      return null;
    } catch (error) {
      console.error('Load full profile error:', error);
      return null;
    }
  }

  // Update driver profile
  async updateDriverProfile(profileData: {
    name?: string;
    licenseNumber?: string;
    vehicleType?: string;
    vehicleCapacity?: number;
    vehicleNumber?: string;
    isAvailable?: boolean;
  }): Promise<boolean> {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const apiService = ApiService.getInstance();
      apiService.setAccessToken(accessToken);
      
      const response = await apiService.updateDriverProfile(profileData);
      
      if (response.success && response.data) {
        const { user, driver } = response.data;
        
        // Merge user with driver data
        const mergedUser = {
          ...user,
          ...driver,
          type: 'driver',
          verified: user.phoneVerified || false,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        } as Driver;
        
        // Update local storage and current user
        await AsyncStorage.setItem('currentUser', JSON.stringify(mergedUser));
        this.currentUser = mergedUser;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Update driver profile error:', error);
      return false;
    }
  }

  // Update vendor profile
  async updateVendorProfile(profileData: {
    name?: string;
    businessName?: string;
    gstNumber?: string;
  }): Promise<boolean> {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const apiService = ApiService.getInstance();
      apiService.setAccessToken(accessToken);
      
      const response = await apiService.updateVendorProfile(profileData);
      
      if (response.success && response.data) {
        const { user, vendor } = response.data;
        
        // Merge user with vendor data
        const mergedUser = {
          ...user,
          ...vendor,
          type: 'vendor',
          verified: user.phoneVerified || false,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        } as Vendor;
        
        // Update local storage and current user
        await AsyncStorage.setItem('currentUser', JSON.stringify(mergedUser));
        this.currentUser = mergedUser;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Update vendor profile error:', error);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('accessToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Keep old methods for backward compatibility but mark as deprecated
  /** @deprecated Use signInWithOTP instead */
  async registerUser(phone: string, userType: UserType, additionalData: any): Promise<User> {
    // Legacy method - generate mock user for now
    const baseUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      type: userType,
      phone,
      name: additionalData.name,
      username: phone,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add type-specific fields
    const user = userType === 'vendor' 
      ? { ...baseUser, businessName: '', gstNumber: '', rating: 5.0, totalOrders: 0 } as Vendor
      : { ...baseUser, licenseNumber: '', vehicleType: '', vehicleCapacity: 0, vehicleNumber: '', isAvailable: false, rating: 5.0, totalTrips: 0, completedTrips: 0, totalEarnings: 0 } as Driver;

    await this.setCurrentUser(user);
    return user;
  }

  /** @deprecated Use backend OTP verification */
  async verifyUser(verificationCode: string): Promise<boolean> {
    // Legacy method for backward compatibility
    if (verificationCode === '123456') {
      if (this.currentUser) {
        this.currentUser.verified = true;
        await this.setCurrentUser(this.currentUser);
      }
      return true;
    }
    return false;
  }
}

export default AuthService;
