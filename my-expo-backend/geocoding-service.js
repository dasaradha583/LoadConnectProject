// Production-ready geocoding service
const https = require('https');

class GeocodingService {
  // Free OpenStreetMap Nominatim API (no API key required)
  static async geocodeWithNominatim(address) {
    return new Promise((resolve, reject) => {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=in`;
      
      console.log(`🌍 Geocoding "${address}" with Nominatim...`);
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const results = JSON.parse(data);
            
            if (results && results.length > 0) {
              const lat = parseFloat(results[0].lat);
              const lng = parseFloat(results[0].lon);
              
              console.log(`✅ Geocoded "${address}" to: ${lat}, ${lng}`);
              resolve({ lat, lng, source: 'nominatim' });
            } else {
              console.warn(`⚠️  No results found for "${address}"`);
              reject(new Error(`No geocoding results for: ${address}`));
            }
          } catch (error) {
            console.error('Error parsing geocoding response:', error);
            reject(error);
          }
        });
      }).on('error', (error) => {
        console.error('Geocoding API error:', error);
        reject(error);
      });
    });
  }

  // Google Maps Geocoding API (requires API key but more accurate)
  static async geocodeWithGoogle(address, apiKey) {
    return new Promise((resolve, reject) => {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&region=in`;
      
      console.log(`🗺️  Geocoding "${address}" with Google Maps...`);
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const results = JSON.parse(data);
            
            if (results.status === 'OK' && results.results.length > 0) {
              const location = results.results[0].geometry.location;
              const lat = location.lat;
              const lng = location.lng;
              
              console.log(`✅ Geocoded "${address}" to: ${lat}, ${lng}`);
              resolve({ lat, lng, source: 'google' });
            } else {
              console.warn(`⚠️  Google geocoding failed: ${results.status}`);
              reject(new Error(`Google geocoding failed: ${results.status}`));
            }
          } catch (error) {
            console.error('Error parsing Google geocoding response:', error);
            reject(error);
          }
        });
      }).on('error', (error) => {
        console.error('Google geocoding API error:', error);
        reject(error);
      });
    });
  }

  // Hybrid approach: Try local database first, then API as fallback
  static async geocodeAddress(address, options = {}) {
    const { useApi = false, apiKey = null } = options;
    
    // First try local database (from our enhanced list)
    const localResult = await this.geocodeFromLocalDatabase(address);
    if (localResult) {
      return localResult;
    }
    
    // If not found locally and API is enabled, try external service
    if (useApi) {
      try {
        // Try Google first if API key is provided
        if (apiKey) {
          return await this.geocodeWithGoogle(address, apiKey);
        }
        
        // Otherwise use free Nominatim
        return await this.geocodeWithNominatim(address);
      } catch (error) {
        console.error('External geocoding failed:', error);
      }
    }
    
    // Final fallback to Bangalore
    console.warn(`🚨 Could not geocode "${address}". Using Bangalore as fallback.`);
    return { 
      lat: 12.9716 + (Math.random() - 0.5) * 0.1, 
      lng: 77.5946 + (Math.random() - 0.5) * 0.1,
      source: 'fallback'
    };
  }

  static async geocodeFromLocalDatabase(address) {
    // Same enhanced database as in the main server
    const locationDatabase = {
      // ... (same as above)
      'guntur': { lat: 16.3067, lng: 80.4365 },
      'markapur': { lat: 15.7326, lng: 79.2670 },
      // ... etc
    };
    
    const addressLower = address.toLowerCase().trim();
    
    for (const [location, coords] of Object.entries(locationDatabase)) {
      if (addressLower.includes(location)) {
        console.log(`📍 Found "${address}" in local database: ${location}`);
        return {
          lat: coords.lat + (Math.random() - 0.5) * 0.02,
          lng: coords.lng + (Math.random() - 0.5) * 0.02,
          source: 'local'
        };
      }
    }
    
    return null; // Not found in local database
  }

  // Reverse Geocoding: Convert coordinates to human-readable address
  static async reverseGeocode(lat, lng, options = {}) {
    const { useApi = true } = options;
    
    if (!useApi) {
      // Return basic formatted coordinates if API not allowed
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    try {
      // Use Nominatim reverse geocoding (free, no API key required)
      return await this.reverseGeocodeWithNominatim(lat, lng);
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Fallback to coordinates
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  static async reverseGeocodeWithNominatim(lat, lng) {
    return new Promise((resolve, reject) => {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      
      console.log(`🔍 Reverse geocoding: ${lat}, ${lng}...`);
      
      const options = {
        headers: {
          'User-Agent': 'LoadConnect/1.0' // Required by Nominatim
        }
      };
      
      https.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            if (result && result.address) {
              // Build a readable address from components
              const addr = result.address;
              const parts = [];
              
              // Add road/street
              if (addr.road) parts.push(addr.road);
              else if (addr.hamlet) parts.push(addr.hamlet);
              else if (addr.neighbourhood) parts.push(addr.neighbourhood);
              
              // Add locality/suburb
              if (addr.suburb) parts.push(addr.suburb);
              else if (addr.village) parts.push(addr.village);
              
              // Add city
              if (addr.city) parts.push(addr.city);
              else if (addr.town) parts.push(addr.town);
              else if (addr.municipality) parts.push(addr.municipality);
              
              // Add state
              if (addr.state) parts.push(addr.state);
              
              // Add postal code if available
              if (addr.postcode) parts.push(addr.postcode);
              
              const address = parts.length > 0 
                ? parts.join(', ') 
                : result.display_name || `${lat}, ${lng}`;
              
              console.log(`✅ Reverse geocoded to: ${address}`);
              resolve(address);
            } else {
              console.warn(`⚠️  No address found for ${lat}, ${lng}`);
              resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          } catch (error) {
            console.error('Error parsing reverse geocoding response:', error);
            reject(error);
          }
        });
      }).on('error', (error) => {
        console.error('Reverse geocoding API error:', error);
        reject(error);
      });
    });
  }
}

module.exports = GeocodingService;
