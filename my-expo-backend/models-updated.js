// ============================================================================
// UPDATED SEQUELIZE MODELS - NORMALIZED SCHEMA WITH ADMIN
// ============================================================================

const { DataTypes } = require('sequelize');

// ===================== ENUMS =====================
const UserType = {
  DRIVER: 'driver',
  VENDOR: 'vendor',
  ADMIN: 'admin'
};

const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
};

const DocumentType = {
  // Driver documents
  DRIVER_LICENSE: 'driver_license',
  VEHICLE_RC: 'vehicle_rc',
  
  // Vendor documents
  GST_CERTIFICATE: 'gst_certificate'
};

const DocumentVerificationStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

// ===================== MODEL DEFINITIONS =====================

function defineModels(sequelize) {
  
  // ===================== USERS TABLE =====================
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      field: 'password_hash',
      allowNull: true
    },
    userType: {
      type: DataTypes.ENUM('driver', 'vendor', 'admin'),
      allowNull: false,
      field: 'user_type'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified'
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'email_verified'
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'phone_verified'
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
      defaultValue: 'pending',
      field: 'approval_status'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'approved_by'
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'approved_at'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason'
    },
    isSuspended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_suspended'
    },
    suspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'suspended_at'
    },
    suspensionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'suspension_reason'
    },
    suspendedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'suspended_by'
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'last_active_at'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at'
    },
    loginCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'login_count'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  }, {
    tableName: 'users',
    underscored: true,
    timestamps: true
  });

  // ===================== ADMINS TABLE =====================
  const Admin = sequelize.define('Admin', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'user_id'
    },
    adminLevel: {
      type: DataTypes.ENUM('super_admin', 'admin', 'moderator'),
      defaultValue: 'admin',
      field: 'admin_level'
    },
    department: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    canApproveVendors: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'can_approve_vendors'
    },
    canApproveDrivers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'can_approve_drivers'
    },
    canSuspendUsers: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'can_suspend_users'
    },
    canViewFinancials: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'can_view_financials'
    },
    canManageAdmins: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'can_manage_admins'
    },
    canManageLoads: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'can_manage_loads'
    },
    canViewAnalytics: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'can_view_analytics'
    },
    canVerifyDocuments: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'can_verify_documents'
    },
    totalApprovalsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_approvals_count'
    },
    totalRejectionsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_rejections_count'
    },
    totalSuspensionsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_suspensions_count'
    },
    totalDocumentsVerified: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_documents_verified'
    },
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'employee_id'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'admins',
    underscored: true,
    timestamps: true
  });

  // ===================== DRIVERS TABLE =====================
  const Driver = sequelize.define('Driver', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'user_id'
    },
    licenseNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'license_number'
    },
    licenseExpiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'license_expiry_date'
    },
    licenseVerificationStatus: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected', 'expired'),
      defaultValue: 'pending',
      field: 'license_verification_status'
    },
    licenseVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'license_verified_at'
    },
    licenseVerifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'license_verified_by'
    },
    licenseRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'license_rejection_reason'
    },
    vehicleType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'vehicle_type'
    },
    vehicleCapacity: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: 'vehicle_capacity'
    },
    vehicleNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'vehicle_number'
    },
    vehicleMake: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'vehicle_make'
    },
    vehicleModel: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'vehicle_model'
    },
    vehicleYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'vehicle_year'
    },
    vehicleColor: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'vehicle_color'
    },
    vehicleVerificationStatus: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending',
      field: 'vehicle_verification_status'
    },
    vehicleVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'vehicle_verified_at'
    },
    vehicleVerifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'vehicle_verified_by'
    },
    vehicleRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'vehicle_rejection_reason'
    },
    insuranceNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'insurance_number'
    },
    insuranceExpiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'insurance_expiry_date'
    },
    insuranceProvider: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'insurance_provider'
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_available'
    },
    currentLocationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'current_location_lat'
    },
    currentLocationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'current_location_lng'
    },
    currentLocationAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'current_location_address'
    },
    lastLocationUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_location_update'
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 5.00
    },
    totalTrips: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_trips'
    },
    completedTrips: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'completed_trips'
    },
    cancelledTrips: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'cancelled_trips'
    },
    totalEarnings: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      field: 'total_earnings'
    },
    onTimePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      field: 'on_time_percentage'
    },
    backgroundCheckStatus: {
      type: DataTypes.ENUM('pending', 'cleared', 'failed'),
      defaultValue: 'pending',
      field: 'background_check_status'
    },
    backgroundCheckDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'background_check_date'
    },
    backgroundCheckNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'background_check_notes'
    }
  }, {
    tableName: 'drivers',
    underscored: true,
    timestamps: true
  });

  // ===================== VENDORS TABLE =====================
  const Vendor = sequelize.define('Vendor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'user_id'
    },
    businessName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'business_name'
    },
    businessType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'business_type'
    },
    yearEstablished: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'year_established'
    },
    industry: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    gstNumber: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
      field: 'gst_number'
    },
    gstVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'gst_verified'
    },
    gstVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'gst_verified_at'
    },
    gstVerifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'gst_verified_by'
    },
    gstRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'gst_rejection_reason'
    },
    businessAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'business_address'
    },
    registeredAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'registered_address'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code'
    },
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'India'
    },
    addressVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'address_verified'
    },
    addressVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'address_verified_at'
    },
    addressVerifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'address_verified_by'
    },
    businessVerificationStatus: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending',
      field: 'business_verification_status'
    },
    businessVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'business_verified_at'
    },
    businessVerifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'business_verified_by'
    },
    businessRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'business_rejection_reason'
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 5.00
    },
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_orders'
    },
    completedOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'completed_orders'
    },
    cancelledOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'cancelled_orders'
    },
    totalSpent: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      field: 'total_spent'
    }
  }, {
    tableName: 'vendors',
    underscored: true,
    timestamps: true
  });

  // ===================== DOCUMENTS TABLE =====================
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    userType: {
      type: DataTypes.ENUM('driver', 'vendor'),
      allowNull: false,
      field: 'user_type'
    },
    documentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'document_type'
    },
    fileUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_url'
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'file_name'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type'
    },
    storageProvider: {
      type: DataTypes.STRING(50),
      defaultValue: 's3',
      field: 'storage_provider'
    },
    verificationStatus: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending',
      field: 'verification_status'
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'verified_by'
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes'
    },
    documentNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'document_number'
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'issue_date'
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'expiry_date'
    },
    issuingAuthority: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'issuing_authority'
    },
    isExpired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_expired'
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at'
    }
  }, {
    tableName: 'documents',
    underscored: true,
    timestamps: true
  });

  // ===================== APPROVAL LOGS TABLE =====================
  const ApprovalLog = sequelize.define('ApprovalLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'admin_id'
    },
    adminName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'admin_name'
    },
    adminLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'admin_level'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'target_user_id'
    },
    targetUserType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'target_user_type'
    },
    targetUserName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'target_user_name'
    },
    previousStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'previous_status'
    },
    newStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'new_status'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'document_id'
    },
    documentType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'document_type'
    },
    loadId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'load_id'
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    },
    requestMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'request_metadata'
    }
  }, {
    tableName: 'approval_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // ===================== ADMIN NOTIFICATIONS TABLE =====================
  const AdminNotification = sequelize.define('AdminNotification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    notificationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'notification_type'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'target_user_id'
    },
    targetUserName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'target_user_name'
    },
    targetUserType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'target_user_type'
    },
    loadId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'load_id'
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'document_id'
    },
    ratingId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'rating_id'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read'
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at'
    },
    readBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'read_by'
    },
    actionTaken: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'action_taken'
    },
    actionTakenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'action_taken_at'
    },
    actionTakenBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'action_taken_by'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'admin_notifications',
    underscored: true,
    timestamps: true
  });

  // ===================== ASSOCIATIONS =====================
  
  // User associations
  User.hasOne(Admin, { foreignKey: 'userId', as: 'adminProfile' });
  User.hasOne(Driver, { foreignKey: 'userId', as: 'driverProfile' });
  User.hasOne(Vendor, { foreignKey: 'userId', as: 'vendorProfile' });
  User.hasMany(Document, { foreignKey: 'userId', as: 'documents' });
  User.hasMany(ApprovalLog, { foreignKey: 'adminId', as: 'actionsPerformed' });
  User.hasMany(ApprovalLog, { foreignKey: 'targetUserId', as: 'actionsReceived' });

  // Admin associations
  Admin.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Admin.hasMany(ApprovalLog, { foreignKey: 'adminId', as: 'approvalLogs' });

  // Driver associations
  Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Vendor associations
  Vendor.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Document associations
  Document.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Document.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' });

  // ApprovalLog associations
  ApprovalLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });
  ApprovalLog.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });
  ApprovalLog.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

  // AdminNotification associations
  AdminNotification.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });
  AdminNotification.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

  return {
    User,
    Admin,
    Driver,
    Vendor,
    Document,
    ApprovalLog,
    AdminNotification,
    UserType,
    ApprovalStatus,
    DocumentType,
    DocumentVerificationStatus
  };
}

module.exports = { defineModels, UserType, ApprovalStatus, DocumentType, DocumentVerificationStatus };
