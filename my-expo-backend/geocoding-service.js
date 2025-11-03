// A simple geocoding service for India
const axios = require('axios');

// Initial database of major cities with known coordinates
const locationDatabase = {
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'vizag': { lat: 17.6868, lng: 83.2185 },
  'hyd': { lat: 17.3850, lng: 78.4867 },
  'blr': { lat: 12.9716, lng: 77.5946 },
  'madras': { lat: 13.0827, lng: 80.2707 }
};

class GeocodingService {
  static async geocode(address) {
    try {
      const addressLower = address.toLowerCase().trim();
      
      // Check if the address includes any known city
      for (const [location, coords] of Object.entries(locationDatabase)) {
        if (addressLower.includes(location)) {
          console.log(`🗺️  Geocoded "${address}" to ${location}: ${coords.lat}, ${coords.lng}`);

          // Add some randomness to avoid exact same coordinates
          return {
            lat: coords.lat + (Math.random() - 0.5) * 0.02,
            lng: coords.lng + (Math.random() - 0.5) * 0.02
          };
        }
      }

      // If no match found, use Bangalore as default with warning
      console.warn(`⚠️  Location "${address}" not found in database. Using Bangalore as fallback.`);
      return {
        lat: 12.9716 + (Math.random() - 0.5) * 0.1,
        lng: 77.5946 + (Math.random() - 0.5) * 0.1
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  static async reverseGeocode(lat, lng) {
    try {
      // Find the nearest city in our database
      let nearestCity = null;
      let shortestDistance = Infinity;

      for (const [city, coords] of Object.entries(locationDatabase)) {
        const distance = Math.sqrt(
          Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestCity = city;
        }
      }

      if (nearestCity) {
        return `Near ${nearestCity.charAt(0).toUpperCase() + nearestCity.slice(1)}`;
      }

      // If no city found within reasonable distance, return coordinates
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }
}

module.exports = GeocodingService;