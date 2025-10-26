#!/usr/bin/env node

/**
 * Helper script to get vendor and driver user IDs for testing
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'load_management',
  user: 'dasaradha',
  password: 'Kiran@9030'
});

async function getUserIds() {
  console.log('Connecting to database...');
  try {
    // Get a vendor
    console.log('Fetching vendor...');
    const vendorResult = await pool.query(`
      SELECT u.id, u.phone, v.business_name, v.gst_number, 
             v.gst_verified, v.business_verification_status
      FROM users u
      JOIN vendors v ON u.id = v.user_id
      WHERE u.user_type = 'vendor'
      LIMIT 1
    `);
    
    // Get a driver
    console.log('Fetching driver...');
    const driverResult = await pool.query(`
      SELECT u.id, u.phone, d.license_number, d.license_verification_status
      FROM users u
      JOIN drivers d ON u.id = d.user_id
      WHERE u.user_type = 'driver'
      LIMIT 1
    `);
    
    console.log('\n=== TEST USER IDs ===\n');
    
    if (vendorResult.rows.length > 0) {
      const vendor = vendorResult.rows[0];
      console.log('VENDOR:');
      console.log(`  User ID: ${vendor.id}`);
      console.log(`  Phone: ${vendor.phone}`);
      console.log(`  Business: ${vendor.business_name}`);
      console.log(`  GST: ${vendor.gst_number}`);
      console.log(`  GST Verified: ${vendor.gst_verified}`);
      console.log(`  Status: ${vendor.business_verification_status}\n`);
    } else {
      console.log('❌ No vendor found. Please register a vendor first.\n');
    }
    
    if (driverResult.rows.length > 0) {
      const driver = driverResult.rows[0];
      console.log('DRIVER:');
      console.log(`  User ID: ${driver.id}`);
      console.log(`  Phone: ${driver.phone}`);
      console.log(`  License: ${driver.license_number}`);
      console.log(`  License Status: ${driver.license_verification_status}\n`);
    } else {
      console.log('❌ No driver found. Please register a driver first.\n');
    }
    
    console.log('Copy these User IDs into test-verification-system.js\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getUserIds();
