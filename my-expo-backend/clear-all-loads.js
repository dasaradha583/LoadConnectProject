const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'load_management',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  logging: (msg) => console.log(`🗄️  PostgreSQL: ${msg}`),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Define Load Model (simplified version)
const Load = sequelize.define('Load', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vendorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'posted'
  }
});

async function clearAllLoads() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Count existing loads
    const loadCount = await Load.count();
    console.log(`📦 Found ${loadCount} loads in database`);

    if (loadCount === 0) {
      console.log('ℹ️  No loads to delete');
      return;
    }

    // Confirm deletion
    console.log('⚠️  This will DELETE ALL LOADS from the database!');
    
    // Delete all loads
    const deletedCount = await Load.destroy({
      where: {},
      truncate: true // This is more efficient for deleting all records
    });

    console.log(`✅ Successfully deleted ${deletedCount} loads`);
    console.log('🧹 All loads have been cleared from the database');

  } catch (error) {
    console.error('❌ Error clearing loads:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
clearAllLoads();
