const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('load_management', 'dasaradha', 'password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function truncateLoads() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Truncate loads table
    await sequelize.query('TRUNCATE TABLE loads RESTART IDENTITY CASCADE;');
    
    console.log('✅ Loads table truncated successfully!');
    console.log('📦 All loads have been deleted');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

truncateLoads();
