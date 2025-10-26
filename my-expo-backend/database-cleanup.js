const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'load_management',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  logging: false, // Disable logging for cleaner output
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Define Models
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('driver', 'vendor'),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  businessName: DataTypes.STRING(100),
  gstNumber: DataTypes.STRING(20),
  totalOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

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
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
});

async function checkAndClearDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');

    // Check current state
    const loadCount = await Load.count();
    const vendorCount = await User.count({ where: { type: 'vendor' } });
    const driverCount = await User.count({ where: { type: 'driver' } });

    console.log('📊 Current Database State:');
    console.log(`├── Loads: ${loadCount}`);
    console.log(`├── Vendors: ${vendorCount}`);
    console.log(`└── Drivers: ${driverCount}\n`);

    if (loadCount > 0) {
      // Show load details
      const loads = await Load.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{
          model: User,
          as: 'vendor',
          foreignKey: 'vendorId',
          attributes: ['name', 'businessName']
        }]
      });

      console.log('📦 Recent Loads:');
      loads.forEach((load, index) => {
        console.log(`${index + 1}. ${load.description.substring(0, 50)}... (₹${load.budget}) - ${load.status}`);
      });
      console.log('');

      console.log('⚠️  DELETING ALL LOADS...');
      
      // Delete all loads
      const deletedCount = await Load.destroy({
        where: {},
        truncate: true
      });

      console.log(`✅ Successfully deleted ${deletedCount} loads`);
      
      // Reset vendor order counts
      await User.update(
        { totalOrders: 0 },
        { where: { type: 'vendor' } }
      );
      
      console.log('🔄 Reset all vendor order counts to 0');
      console.log('🧹 Database cleanup completed!\n');
      
    } else {
      console.log('ℹ️  No loads found in database - nothing to delete\n');
    }

    // Check vendor data issues
    console.log('🔍 Checking vendor data integrity...');
    const vendorsWithIssues = await User.findAll({
      where: { 
        type: 'vendor',
        [Sequelize.Op.or]: [
          { gstNumber: null },
          { totalOrders: null },
          { businessName: null }
        ]
      }
    });

    if (vendorsWithIssues.length > 0) {
      console.log(`⚠️  Found ${vendorsWithIssues.length} vendors with data issues:`);
      vendorsWithIssues.forEach(vendor => {
        const issues = [];
        if (!vendor.gstNumber) issues.push('missing GST');
        if (vendor.totalOrders === null) issues.push('null totalOrders');
        if (!vendor.businessName) issues.push('missing businessName');
        console.log(`├── ${vendor.name}: ${issues.join(', ')}`);
      });
      
      // Fix the issues
      console.log('\n🔧 Fixing vendor data issues...');
      await User.update(
        { 
          totalOrders: 0,
          gstNumber: Sequelize.fn('COALESCE', Sequelize.col('gstNumber'), 'NOT_PROVIDED'),
        },
        { 
          where: { type: 'vendor' }
        }
      );
      console.log('✅ Fixed vendor data issues');
    } else {
      console.log('✅ All vendor data looks good');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
checkAndClearDatabase();
