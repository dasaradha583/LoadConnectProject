// Enhanced Geocoding Service for India-wide coverage
const fetch = require('node-fetch').default || require('node-fetch');

class IndiaGeocodingService {
  constructor() {
    // Multiple geocoding providers for reliability
    this.providers = [
      {
        name: 'OpenStreetMap',
        url: 'https://nominatim.openstreetmap.org/search',
        free: true,
        dailyLimit: 1000000  // Very generous
      },
      {
        name: 'MapmyIndia',
        url: 'https://apis.mapmyindia.com/advancedmaps/v1/{api_key}/geo_code',
        free: false,
        speciality: 'India-specific, very accurate'
      },
      {
        name: 'Google Maps',
        url: 'https://maps.googleapis.com/maps/api/geocode/json',
        free: false,  // 200 requests/day free
        accuracy: 'highest'
      }
    ];
  }

  // Free OpenStreetMap geocoding (perfect for development/testing)
  async geocodeWithOSM(address) {
    try {
      const query = encodeURIComponent(`${address}, India`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=in`;
      
      console.log(`🌍 Geocoding: "${address}" via OpenStreetMap`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LoadConnect-App/1.0'  // Required by OSM
        }
      });
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const result = {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon),
          address: location.display_name,
          confidence: location.importance || 0.5
        };
        
        console.log(`✅ Found: ${result.address} at (${result.lat}, ${result.lng})`);
        return result;
      }
      
      throw new Error('Location not found');
    } catch (error) {
      console.error(`❌ OSM Geocoding failed for "${address}":`, error.message);
      throw error;
    }
  }

  // Enhanced geocoding with fallbacks
  async geocodeAddress(address) {
    // First try local database for speed
    const localResult = this.checkLocalDatabase(address);
    if (localResult) {
      console.log(`🚀 Found in local cache: ${address}`);
      return localResult;
    }

    // Try OpenStreetMap (free and reliable)
    try {
      const result = await this.geocodeWithOSM(address);
      
      // Cache successful results
      await this.cacheLocation(address, result);
      return result;
      
    } catch (error) {
      console.warn(`🔄 OSM failed, trying fallback for: ${address}`);
      
      // Fallback to approximate location
      return this.getApproximateLocation(address);
    }
  }

  // Local database for common locations (for speed)
  checkLocalDatabase(address) {
    const locationDatabase = {
      // Major cities
      'mumbai': { lat: 19.0760, lng: 72.8777, confidence: 1.0 },
      'delhi': { lat: 28.7041, lng: 77.1025, confidence: 1.0 },
      'bangalore': { lat: 12.9716, lng: 77.5946, confidence: 1.0 },
      'hyderabad': { lat: 17.3850, lng: 78.4867, confidence: 1.0 },
      'ahmedabad': { lat: 23.0225, lng: 72.5714, confidence: 1.0 },
      'chennai': { lat: 13.0827, lng: 80.2707, confidence: 1.0 },
      'kolkata': { lat: 22.5726, lng: 88.3639, confidence: 1.0 },
      'surat': { lat: 21.1702, lng: 72.8311, confidence: 1.0 },
      'pune': { lat: 18.5204, lng: 73.8567, confidence: 1.0 },
      'jaipur': { lat: 26.9124, lng: 75.7873, confidence: 1.0 },
      
      // Andhra Pradesh & Telangana
      'guntur': { lat: 16.3067, lng: 80.4365, confidence: 1.0 },
      'markapur': { lat: 15.7326, lng: 79.2670, confidence: 1.0 },
      'vijayawada': { lat: 16.5062, lng: 80.6480, confidence: 1.0 },
      'tirupati': { lat: 13.6288, lng: 79.4192, confidence: 1.0 },
      'nellore': { lat: 14.4426, lng: 79.9865, confidence: 1.0 },
      'kurnool': { lat: 15.8281, lng: 78.0373, confidence: 1.0 },
      'rajahmundry': { lat: 17.0005, lng: 81.8040, confidence: 1.0 },
      'kakinada': { lat: 16.9891, lng: 82.2475, confidence: 1.0 },
      'anantapur': { lat: 14.6819, lng: 77.6006, confidence: 1.0 },
      'chittoor': { lat: 13.2172, lng: 79.1003, confidence: 1.0 },
      'eluru': { lat: 16.7107, lng: 81.0958, confidence: 1.0 },
      'ongole': { lat: 15.5057, lng: 80.0499, confidence: 1.0 },
      'nizamabad': { lat: 18.6725, lng: 78.0941, confidence: 1.0 },
      'karimnagar': { lat: 18.4386, lng: 79.1288, confidence: 1.0 },
      'warangal': { lat: 17.9689, lng: 79.5941, confidence: 1.0 },
      'khammam': { lat: 17.2473, lng: 80.1514, confidence: 1.0 },
      'mahbubnagar': { lat: 16.7302, lng: 77.9777, confidence: 1.0 },
      'adilabad': { lat: 19.6715, lng: 78.5311, confidence: 1.0 },

      // Tamil Nadu
      'coimbatore': { lat: 11.0168, lng: 76.9558, confidence: 1.0 },
      'madurai': { lat: 9.9252, lng: 78.1198, confidence: 1.0 },
      'salem': { lat: 11.6643, lng: 78.1460, confidence: 1.0 },
      'tiruchirappalli': { lat: 10.7905, lng: 78.7047, confidence: 1.0 },
      'erode': { lat: 11.3410, lng: 77.7172, confidence: 1.0 },
      'vellore': { lat: 12.9165, lng: 79.1325, confidence: 1.0 },

      // Maharashtra
      'nagpur': { lat: 21.1458, lng: 79.0882, confidence: 1.0 },
      'nashik': { lat: 19.9975, lng: 73.7898, confidence: 1.0 },
      'aurangabad': { lat: 19.8762, lng: 75.3433, confidence: 1.0 },
      'solapur': { lat: 17.6599, lng: 75.9064, confidence: 1.0 },
      
      // Gujarat
      'vadodara': { lat: 22.3072, lng: 73.1812, confidence: 1.0 },
      'rajkot': { lat: 22.3039, lng: 70.8022, confidence: 1.0 },
      'bhavnagar': { lat: 21.7645, lng: 72.1519, confidence: 1.0 },
      
      // Kerala
      'kochi': { lat: 9.9312, lng: 76.2673, confidence: 1.0 },
      'thiruvananthapuram': { lat: 8.5241, lng: 76.9366, confidence: 1.0 },
      'kozhikode': { lat: 11.2588, lng: 75.7804, confidence: 1.0 },
      
      // And many more...
    };

    const addressLower = address.toLowerCase().trim();
    
    // Direct match
    if (locationDatabase[addressLower]) {
      return locationDatabase[addressLower];
    }
    
    // Partial match
    for (const [location, coords] of Object.entries(locationDatabase)) {
      if (addressLower.includes(location) || location.includes(addressLower)) {
        return coords;
      }
    }
    
    return null;
  }

  // Cache successful geocoding results
  async cacheLocation(address, coordinates) {
    // In production, store in Redis or database
    // For now, just log
    console.log(`💾 Caching: ${address} → (${coordinates.lat}, ${coordinates.lng})`);
  }

  // Fallback for unknown locations
  getApproximateLocation(address) {
    const addressLower = address.toLowerCase();
    
    // State-based approximation
    const stateApproximations = {
      'andhra pradesh': { lat: 15.9129, lng: 79.7400 },
      'telangana': { lat: 18.1124, lng: 79.0193 },
      'tamil nadu': { lat: 11.1271, lng: 78.6569 },
      'karnataka': { lat: 15.3173, lng: 75.7139 },
      'kerala': { lat: 10.8505, lng: 76.2711 },
      'maharashtra': { lat: 19.7515, lng: 75.7139 },
      'gujarat': { lat: 22.2587, lng: 71.1924 },
      'rajasthan': { lat: 27.0238, lng: 74.2179 },
      'punjab': { lat: 31.1471, lng: 75.3412 },
      'haryana': { lat: 29.0588, lng: 76.0856 },
      'uttar pradesh': { lat: 26.8467, lng: 80.9462 },
      'bihar': { lat: 25.0961, lng: 85.3131 },
      'west bengal': { lat: 22.9868, lng: 87.8550 },
      'odisha': { lat: 20.9517, lng: 85.0985 },
      'madhya pradesh': { lat: 22.9734, lng: 78.6569 },
      'chhattisgarh': { lat: 21.2787, lng: 81.8661 },
      'jharkhand': { lat: 23.6102, lng: 85.2799 },
    };
    
    for (const [state, coords] of Object.entries(stateApproximations)) {
      if (addressLower.includes(state)) {
        console.log(`📍 Using state approximation for: ${address} → ${state}`);
        return {
          ...coords,
          address: address,
          confidence: 0.3  // Lower confidence for approximation
        };
      }
    }
    
    // Ultimate fallback - center of India
    console.warn(`⚠️ Using India center for unknown location: ${address}`);
    return {
      lat: 20.5937,   // Geographic center of India
      lng: 78.9629,
      address: address,
      confidence: 0.1
    };
  }

  // Test the service
  async testService() {
    const testLocations = [
      'Guntur, Andhra Pradesh',
      'Markapur, Prakasam District',
      'Kothagudem, Telangana',
      'Tiruvallur, Tamil Nadu',
      'Some Unknown Village, Rajasthan'
    ];

    console.log('🧪 Testing India Geocoding Service...\n');

    for (const location of testLocations) {
      try {
        const result = await this.geocodeAddress(location);
        console.log(`✅ ${location} → (${result.lat}, ${result.lng}) [Confidence: ${result.confidence}]`);
      } catch (error) {
        console.log(`❌ ${location} → Failed: ${error.message}`);
      }
      console.log('');
    }
  }
}

module.exports = IndiaGeocodingService;

// Test the service
if (require.main === module) {
  const service = new IndiaGeocodingService();
  service.testService();
}
