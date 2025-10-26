// Geocoding service to convert addresses to coordinates
class GeocodingService {
  private static instance: GeocodingService;

  static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  // Convert address string to coordinates using a free geocoding service
  async getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // Using Nominatim (OpenStreetMap) - free geocoding service
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=in`,
        {
          headers: {
            'User-Agent': 'LoadConnect-App/1.0',
          },
        }
      );

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Alternative: Use Google Maps Geocoding API (requires API key)
  async getCoordinatesFromAddressGoogle(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
      );

      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Google geocoding error:', error);
      return null;
    }
  }

  // Get address suggestions as user types (for better UX)
  async getAddressSuggestions(query: string): Promise<string[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&countrycodes=in`,
        {
          headers: {
            'User-Agent': 'LoadConnect-App/1.0',
          },
        }
      );

      const data = await response.json();
      
      return data.map((item: any) => item.display_name).slice(0, 5);
    } catch (error) {
      console.error('Address suggestions error:', error);
      return [];
    }
  }
}

export default GeocodingService;
