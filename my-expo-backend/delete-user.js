// Script to delete a broken user from the database
const { defineModels } = require('./models-updated');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'loadconnect',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  logging: false
});

async function deleteUser(phone) {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Initialize models
    const models = defineModels(sequelize);
    
    // Find user
    const user = await models.User.findOne({ where: { phone } });
    
    if (!user) {
      console.log(`❌ No user found with phone: ${phone}`);
      return;
    }
    
    console.log(`📱 Found user: ${user.name} (${user.userType})`);
    console.log(`🆔 User ID: ${user.id}`);
    
    // Delete associated records first
    if (user.userType === 'driver') {
      await models.Driver.destroy({ where: { userId: user.id } });
      console.log('🗑️  Deleted driver profile (if existed)');
    } else if (user.userType === 'vendor') {
      await models.Vendor.destroy({ where: { userId: user.id } });
      console.log('🗑️  Deleted vendor profile (if existed)');
    }
    
    // Delete user
    await user.destroy();
    console.log('✅ User deleted successfully!');
    console.log('\n👉 You can now register fresh with this phone number');
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get phone from command line argument
const phone = process.argv[2] || '1234567890';
deleteUser(phone);
