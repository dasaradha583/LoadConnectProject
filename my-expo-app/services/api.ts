// Simple API URL configuration for mobile testing
import Constants from 'expo-constants';

const getAPIBaseURLs = () => {
  // More robust development check
  const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : 
                       process.env.NODE_ENV !== 'production';
  
  console.log(`🔧 Environment Check: isDevelopment=${isDevelopment}`);
  
  if (isDevelopment) {
    // Get Expo's debug server host (this will be your computer's IP)
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':').shift();
    
    // Try multiple URLs to handle different network scenarios
    const developmentURLs = [];
    
    // If we detected the host from Expo, use it first
    if (debuggerHost) {
      developmentURLs.push(`http://${debuggerHost}:3001`);
      console.log(`✅ Detected Expo host: ${debuggerHost}`);
    }
    
    // Fallback IPs - try current network first
    developmentURLs.push(
      'http://192.168.137.4:3001',  // Current actual IP
      'http://localhost:3001',     // Local fallback
    );
    
    console.log(`🔧 Using development URLs:`, developmentURLs);
    return developmentURLs;
  }
  
  // For production, use your production API URL
  const productionURLs = ['https://your-production-api.com'];
  console.log(`🔧 Using production URLs:`, productionURLs);
  return productionURLs;
};

const API_BASE_URLS = getAPIBaseURLs();
const API_BASE_URL = API_BASE_URLS[0] || 'http://192.168.1.14:3001'; // Primary URL

// Ensure we always have valid URLs
if (!API_BASE_URLS || API_BASE_URLS.length === 0 || !API_BASE_URLS[0]) {
  console.error('🚨 WARNING: No valid API URLs configured');
  API_BASE_URLS.push('http://192.168.1.14:3001');
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  type: 'driver' | 'vendor';
  phone: string;
  username: string;
  name: string;
  verified: boolean;
  phoneVerified?: boolean;
  approvalStatus?: string;
  // Vendor fields
  businessName?: string;
  gstNumber?: string;
  // Driver fields
  licenseNumber?: string;
  vehicleType?: string;
  vehicleCapacity?: number;
  vehicleNumber?: string;
  isAvailable?: boolean;
  // Common fields
  rating?: number;
  totalTrips?: number;
  completedTrips?: number;
  totalEarnings?: number;
  totalOrders?: number;
}

class ApiService {
  private static instance: ApiService;
  private accessToken: string | null = null;

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  // Debug authentication status
  getAuthenticationStatus(): { hasToken: boolean; tokenPreview?: string } {
    return {
      hasToken: !!this.accessToken,
      tokenPreview: this.accessToken ? `${this.accessToken.substring(0, 20)}...` : undefined
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Try multiple URLs if the first one fails
    const urls = API_BASE_URLS.map(baseUrl => `${baseUrl}${endpoint}`);
    
    console.log(`🚀 API Request: ${options.method || 'GET'} ${endpoint}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    let lastError: Error | null = null;

    // Try each URL in sequence
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        // Increase timeout to 10s to accommodate slower devices/networks during development
        const timeoutDuration = 10000; // 10 second timeout
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          // Create error with backend message
          const error = new Error(data.message || `HTTP ${response.status}`);
          // For client errors (4xx), throw immediately - these won't be fixed by trying another URL
          if (response.status >= 400 && response.status < 500) {
            console.error(`❌ Client error (${response.status}): ${data.message}`);
            throw error;
          }
          // For server errors (5xx), we can try another URL
          throw error;
        }

        // Success!
        return data;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Log which URL failed for easier debugging on device
        console.warn(`⚠️ Request to ${url} failed: ${lastError.message}`);

        // If error message indicates a client error (4xx), don't try other URLs
        // These errors are about the request/data, not the connection
        if (lastError.message && !lastError.message.includes('Network') && 
            !lastError.message.includes('timeout') && 
            !lastError.message.includes('HTTP 5')) {
          // This is likely a 4xx error with a meaningful message - throw immediately
          throw lastError;
        }

        // If this is not the last URL, continue to next one
        if (i < urls.length - 1) {
          continue;
        }
      }
    }

    // All URLs failed
    console.error(`❌ Network error: ${lastError?.message}`);
    throw lastError || new Error('Connection failed');
  }

  // Auth endpoints
  async sendOTP(phone: string): Promise<ApiResponse<{
    phone: string;
    userExists: boolean;
    isNewUser: boolean;
  }>> {
    return this.makeRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async signIn(phone: string, otp: string): Promise<ApiResponse<{
    user: UserProfile;
    tokens: AuthTokens;
  }>> {
    return this.makeRequest('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async register(userData: {
    phone: string;
    otp: string;
    name: string;
    type: 'driver' | 'vendor';
    [key: string]: any;
  }): Promise<ApiResponse<{
    user: UserProfile;
    tokens: AuthTokens;
  }>> {
    const endpoint = userData.type === 'driver' ? '/auth/register/driver' : '/auth/register/vendor';
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return this.makeRequest('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async signOut(refreshToken?: string): Promise<ApiResponse> {
    return this.makeRequest('/auth/signout', {
      method: 'POST',
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.makeRequest('/health');
  }

  // Network diagnostics
  async networkDiagnostics(): Promise<{
    currentURLs: string[];
    connectivity: { url: string; status: 'success' | 'failed'; error?: string; duration?: number }[];
  }> {
    const results = {
      currentURLs: API_BASE_URLS,
      connectivity: [] as { url: string; status: 'success' | 'failed'; error?: string; duration?: number }[],
    };

    console.log('🔍 Running network diagnostics...');

    for (const baseUrl of API_BASE_URLS) {
      const url = `${baseUrl}/health`;
      const startTime = Date.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          results.connectivity.push({
            url,
            status: 'success',
            duration,
          });
          console.log(`✅ ${url} - Success (${duration}ms)`);
        } else {
          results.connectivity.push({
            url,
            status: 'failed',
            error: `HTTP ${response.status}`,
          });
          console.log(`❌ ${url} - HTTP ${response.status}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.connectivity.push({
          url,
          status: 'failed',
          error: errorMessage,
        });
        console.log(`❌ ${url} - ${errorMessage}`);
      }
    }

    return results;
  }

  // Profile management endpoints
  async getFullProfile(): Promise<ApiResponse<UserProfile & any>> {
    return this.makeRequest('/auth/profile');
  }

  async updateDriverProfile(profileData: {
    name?: string;
    licenseNumber?: string;
    vehicleType?: string;
    vehicleCapacity?: number;
    vehicleNumber?: string;
  }): Promise<ApiResponse<UserProfile & any>> {
    return this.makeRequest('/auth/profile/driver', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async updateVendorProfile(profileData: {
    name?: string;
    businessName?: string;
    gstNumber?: string;
  }): Promise<ApiResponse<UserProfile & any>> {
    return this.makeRequest('/auth/profile/vendor', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Load management endpoints
  async getAvailableLoads(driverLocation?: { lat: number; lng: number }, radius?: number): Promise<ApiResponse<any[]>> {
    let endpoint = '/loads/available';
    const params = new URLSearchParams();
    
    if (driverLocation) {
      params.append('lat', driverLocation.lat.toString());
      params.append('lng', driverLocation.lng.toString());
      if (radius) {
        params.append('radius', radius.toString());
      }
    }
    
    if (params.toString()) {
      endpoint += '?' + params.toString();
    }
    
    return this.makeRequest(endpoint);
  }

  async acceptLoad(loadId: string): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/accept`, {
      method: 'POST',
    });
  }

  async updateLoadStatus(loadId: string, status: string): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async createLoad(loadData: any): Promise<ApiResponse> {
    return this.makeRequest('/loads', {
      method: 'POST',
      body: JSON.stringify(loadData),
    });
  }

  async getVendorLoads(vendorId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/loads/vendor/${vendorId}`);
  }

  async getDriverLoads(driverId: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(`/loads/driver/${driverId}`);
  }

  async getLoadDetails(loadId: string): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/details`);
  }

  // Location tracking endpoints
  async updateLocation(locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    address?: string;
    loadId?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('/location/update', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  async updateLoadLocation(loadId: string, locationData: {
    latitude: number;
    longitude: number;
  }): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/update-location`, {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  async getDriverLocation(loadId: string): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/driver-location`);
  }

  async getCurrentDriverLocation(driverId: string): Promise<ApiResponse> {
    return this.makeRequest(`/drivers/${driverId}/current-location`);
  }

  // Live tracking endpoints
  async streamLocation(loadId: string, locationData: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    timestamp?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/stream-location`, {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  async getLiveTracking(loadId: string): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/live-tracking`);
  }

  async getLocationHistory(loadId: string, options?: {
    limit?: number;
    from?: string;
    to?: string;
  }): Promise<ApiResponse> {
    let endpoint = `/loads/${loadId}/location-history`;
    if (options) {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.from) params.append('from', options.from);
      if (options.to) params.append('to', options.to);
      if (params.toString()) endpoint += '?' + params.toString();
    }
    return this.makeRequest(endpoint);
  }

  // Pickup/Drop confirmation endpoints
  async confirmPickup(loadId: string, notes?: string): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/confirm-pickup`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async confirmDrop(loadId: string, notes?: string): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/confirm-drop`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // Driver status update with location
  async updateDriverStatus(loadId: string, status: 'picked_up' | 'in_transit' | 'delivered', location?: {
    latitude: number;
    longitude: number;
  }): Promise<ApiResponse> {
    return this.makeRequest(`/loads/${loadId}/driver-status-update`, {
      method: 'POST',
      body: JSON.stringify({ status, location }),
    });
  }

  // Geocoding debug endpoint
  async testGeocode(address: string): Promise<ApiResponse> {
    return this.makeRequest('/debug/geocode', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }
}

// Export both the class and a singleton instance for convenience
const apiInstance = ApiService.getInstance();
export { ApiService, apiInstance as api, API_BASE_URL };
export default ApiService;
