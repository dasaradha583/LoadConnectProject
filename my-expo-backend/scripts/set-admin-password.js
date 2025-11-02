#!/usr/bin/env node

/**
 * Set a known password for the admin user for testing
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'load_management',
  user: 'dasaradha',
  password: 'Kiran@9030'
});

async function setAdminPassword() {
  try {
    const newPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1
      WHERE user_type = 'admin' AND username = 'superadmin'
      RETURNING id, username, phone, name
    `, [hashedPassword]);
    
    if (result.rows.length > 0) {
      console.log('\n✅ Admin password updated successfully!\n');
      console.log('Admin Login Credentials:');
      console.log(`  Username: ${result.rows[0].username}`);
      console.log(`  Password: ${newPassword}`);
      console.log(`  Phone: ${result.rows[0].phone}`);
      console.log(`  Name: ${result.rows[0].name}\n`);
    } else {
      console.log('❌ No admin user found with username "superadmin"');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

setAdminPassword();
