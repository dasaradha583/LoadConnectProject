const GeocodingService = require('./geocoding-service.js');

// Update the specific load with proper addresses
async function updateLoadAddresses() {
  const pickupLat = 16.31635230;
  const pickupLng = 80.43284600;
  const dropLat = 16.491472;
  const dropLng = 80.390906;

  console.log('🔄 Fetching addresses for coordinates...\n');

  try {
    // Add delay to respect API rate limits
    const pickupAddress = await GeocodingService.reverseGeocode(pickupLat, pickupLng, { useApi: true });
    console.log(`📍 Pickup Address: ${pickupAddress}\n`);
    
    // Wait 1 second between requests (Nominatim rate limit)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const dropAddress = await GeocodingService.reverseGeocode(dropLat, dropLng, { useApi: true });
    console.log(`📍 Drop Address: ${dropAddress}\n`);

    console.log('\n✅ Addresses fetched successfully!');
    console.log('\n📋 SQL to update the load:');
    console.log(`\nUPDATE loads SET pickup_address = '${pickupAddress}', drop_address = '${dropAddress}' WHERE id = 'bbe61b70-dc96-49df-aca2-f3cced6198a5';`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateLoadAddresses();
