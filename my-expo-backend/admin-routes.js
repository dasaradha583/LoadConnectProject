// ============================================================================
// ADMIN AUTHENTICATION & DOCUMENT ENDPOINTS
// ============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDF files are allowed!'));
    }
  }
});

function createAdminRoutes(models, JWT_SECRET, redisClient) {
  const router = express.Router();
  const { User, Admin, Driver, Vendor, Document, ApprovalLog, AdminNotification } = models;

  // ===================== ADMIN MIDDLEWARE =====================
  const authenticateAdmin = async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      // Check if token is blacklisted
      const isBlacklisted = await redisClient.get(`blacklisted_token:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Fetch user with admin profile
      const user = await User.findByPk(decoded.userId, {
        include: [{
          model: Admin,
          as: 'adminProfile',
          required: true
        }]
      });

      if (!user || user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      if (!user.isActive || user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: 'Admin account is inactive or suspended'
        });
      }

      req.user = decoded;
      req.admin = user;
      req.adminProfile = user.adminProfile;
      next();

    } catch (error) {
      console.error('Admin authentication error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  };

  // Permission check middleware
  const checkPermission = (permission) => {
    return (req, res, next) => {
      if (!req.adminProfile[permission] && req.adminProfile.adminLevel !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
      next();
    };
  };

  // ===================== ADMIN AUTHENTICATION =====================
  
  // Admin Login
  router.post('/auth/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Find admin user
      const user = await User.findOne({
        where: {
          username,
          userType: 'admin'
        },
        include: [{
          model: Admin,
          as: 'adminProfile'
        }]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is active
      if (!user.isActive || user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: 'Admin account is inactive or suspended'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update login stats
      await user.update({
        lastLoginAt: new Date(),
        loginCount: user.loginCount + 1
      });

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, userType: user.userType },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, userType: user.userType },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Store tokens in Redis
      await redisClient.set(`admin_access_token:${user.id}`, accessToken, {
        EX: 24 * 60 * 60
      });
      await redisClient.set(`admin_refresh_token:${user.id}`, refreshToken, {
        EX: 7 * 24 * 60 * 60
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            name: user.name,

            userType: user.userType,
            adminLevel: user.adminProfile.adminLevel,
            department: user.adminProfile.department,
            permissions: {
              canApproveVendors: user.adminProfile.canApproveVendors,
              canApproveDrivers: user.adminProfile.canApproveDrivers,
              canSuspendUsers: user.adminProfile.canSuspendUsers,
              canViewFinancials: user.adminProfile.canViewFinancials,
              canManageAdmins: user.adminProfile.canManageAdmins,
              canManageLoads: user.adminProfile.canManageLoads,
              canViewAnalytics: user.adminProfile.canViewAnalytics,
              canVerifyDocuments: user.adminProfile.canVerifyDocuments
            }
          },
          tokens: {
            accessToken,
            refreshToken
          }
        },
        message: 'Admin login successful'
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Admin Logout
  router.post('/auth/admin/logout', authenticateAdmin, async (req, res) => {
    try {
      const token = req.headers['authorization'].split(' ')[1];
      
      // Blacklist token
      await redisClient.set(`blacklisted_token:${token}`, 'true', {
        EX: 24 * 60 * 60
      });

      // Remove from Redis
      await redisClient.del(`admin_access_token:${req.user.userId}`);
      await redisClient.del(`admin_refresh_token:${req.user.userId}`);

      res.json({
        success: true,
        message: 'Admin logout successful'
      });

    } catch (error) {
      console.error('Admin logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // ===================== PENDING APPROVALS =====================
  
  // Get Pending Users
  router.get('/admin/pending-users', authenticateAdmin, async (req, res) => {
    try {
      const { type, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = {
        approvalStatus: 'pending',
        userType: type || ['driver', 'vendor']
      };

      const users = await User.findAndCountAll({
        where,
        include: [
          {
            model: Driver,
            as: 'driverProfile',
            required: false
          },
          {
            model: Vendor,
            as: 'vendorProfile',
            required: false
          },
          {
            model: Document,
            as: 'documents',
            required: false
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'ASC']]
      });

      // Format response
      const formattedUsers = users.rows.map(user => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        userType: user.userType,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt,
        profile: user.userType === 'driver' ? user.driverProfile : user.vendorProfile,
        documents: user.documents,
        documentStats: {
          total: user.documents.length,
          pending: user.documents.filter(d => d.verificationStatus === 'pending').length,
          verified: user.documents.filter(d => d.verificationStatus === 'verified').length,
          rejected: user.documents.filter(d => d.verificationStatus === 'rejected').length
        }
      }));

      res.json({
        success: true,
        data: {
          users: formattedUsers,
          pagination: {
            total: users.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(users.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get pending users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Get Pending Documents
  router.get('/admin/pending-documents', authenticateAdmin, checkPermission('canVerifyDocuments'), async (req, res) => {
    try {
      const { userType, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = {
        verificationStatus: 'pending'
      };

      if (userType) {
        where.userType = userType;
      }

      const documents = await Document.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'user',
          include: [
            {
              model: Driver,
              as: 'driverProfile',
              required: false
            },
            {
              model: Vendor,
              as: 'vendorProfile',
              required: false
            }
          ]
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['uploadedAt', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          documents: documents.rows,
          pagination: {
            total: documents.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(documents.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get pending documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // ===================== APPROVAL ACTIONS =====================
  
  // Approve User
  router.post('/admin/approve-user/:userId', 
    authenticateAdmin, 
    async (req, res) => {
      try {
        const { userId } = req.params;
        const { notes } = req.body;

        const user = await User.findByPk(userId, {
          include: [
            { model: Driver, as: 'driverProfile', required: false },
            { model: Vendor, as: 'vendorProfile', required: false }
          ]
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // Check permission
        if (user.userType === 'driver' && !req.adminProfile.canApproveDrivers) {
          return res.status(403).json({
            success: false,
            message: 'No permission to approve drivers'
          });
        }

        if (user.userType === 'vendor' && !req.adminProfile.canApproveVendors) {
          return res.status(403).json({
            success: false,
            message: 'No permission to approve vendors'
          });
        }

        const previousStatus = user.approvalStatus;

        // Update user approval status
        await user.update({
          approvalStatus: 'approved',
          approvedBy: req.admin.id,
          approvedAt: new Date(),
          isVerified: true,
          is_verified: true
        });

        // Create approval log
        await ApprovalLog.create({
          adminId: req.admin.id,
          adminName: req.admin.name,
          adminLevel: req.adminProfile.adminLevel,
          action: 'user_approved',
          targetUserId: user.id,
          targetUserType: user.userType,
          targetUserName: user.name,
          previousStatus,
          newStatus: 'approved',
          notes,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        // Update admin stats
        await req.adminProfile.increment('totalApprovalsCount');

        res.json({
          success: true,
          data: { user },
          message: `${user.userType} approved successfully`
        });

      } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  );

  // Reject User
  router.post('/admin/reject-user/:userId', 
    authenticateAdmin, 
    async (req, res) => {
      try {
        const { userId } = req.params;
        const { reason, notes } = req.body;

        if (!reason) {
          return res.status(400).json({
            success: false,
            message: 'Rejection reason is required'
          });
        }

        const user = await User.findByPk(userId);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // Check permission
        if (user.userType === 'driver' && !req.adminProfile.canApproveDrivers) {
          return res.status(403).json({
            success: false,
            message: 'No permission to reject drivers'
          });
        }

        if (user.userType === 'vendor' && !req.adminProfile.canApproveVendors) {
          return res.status(403).json({
            success: false,
            message: 'No permission to reject vendors'
          });
        }

        const previousStatus = user.approvalStatus;

        // Update user
        await user.update({
          approvalStatus: 'rejected',
          rejectionReason: reason,
          approvedBy: req.admin.id,
          approvedAt: new Date()
        });

        // Create approval log
        await ApprovalLog.create({
          adminId: req.admin.id,
          adminName: req.admin.name,
          adminLevel: req.adminProfile.adminLevel,
          action: 'user_rejected',
          targetUserId: user.id,
          targetUserType: user.userType,
          targetUserName: user.name,
          previousStatus,
          newStatus: 'rejected',
          reason,
          notes,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        // Update admin stats
        await req.adminProfile.increment('totalRejectionsCount');

        res.json({
          success: true,
          data: { user },
          message: `${user.userType} rejected`
        });

      } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  );

  // ===================== DOCUMENT VERIFICATION =====================
  
  // Verify Document
  router.post('/admin/verify-document/:documentId', 
    authenticateAdmin, 
    checkPermission('canVerifyDocuments'),
    async (req, res) => {
      try {
        const { documentId } = req.params;
        const { notes } = req.body;

        const document = await Document.findByPk(documentId, {
          include: [{
            model: User,
            as: 'user',
            include: [
              { model: Driver, as: 'driverProfile', required: false },
              { model: Vendor, as: 'vendorProfile', required: false }
            ]
          }]
        });

        if (!document) {
          return res.status(404).json({
            success: false,
            message: 'Document not found'
          });
        }

        // Update document
        await document.update({
          verificationStatus: 'verified',
          verifiedBy: req.admin.id,
          verifiedAt: new Date(),
          adminNotes: notes
        });

        // Update user's profile verification status based on document type
        if (document.userType === 'driver' && document.user.driverProfile) {
          if (document.documentType === 'driver_license') {
            await document.user.driverProfile.update({
              licenseVerificationStatus: 'verified',
              licenseVerifiedBy: req.admin.id,
              licenseVerifiedAt: new Date()
            });
          } else if (document.documentType === 'vehicle_rc') {
            await document.user.driverProfile.update({
              vehicleVerificationStatus: 'verified',
              vehicleVerifiedBy: req.admin.id,
              vehicleVerifiedAt: new Date()
            });
          }
        } else if (document.userType === 'vendor' && document.user.vendorProfile) {
          if (document.documentType === 'gst_certificate') {
            await document.user.vendorProfile.update({
              gstVerified: true,
              gstVerifiedBy: req.admin.id,
              gstVerifiedAt: new Date()
            });
          }
        }

        // Create approval log
        await ApprovalLog.create({
          adminId: req.admin.id,
          adminName: req.admin.name,
          adminLevel: req.adminProfile.adminLevel,
          action: 'document_verified',
          targetUserId: document.userId,
          targetUserType: document.userType,
          targetUserName: document.user.name,
          documentId: document.id,
          documentType: document.documentType,
          previousStatus: 'pending',
          newStatus: 'verified',
          notes,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        // Update admin stats
        await req.adminProfile.increment('totalDocumentsVerified');

        res.json({
          success: true,
          data: { document },
          message: 'Document verified successfully'
        });

      } catch (error) {
        console.error('Verify document error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  );

  // Reject Document
  router.post('/admin/reject-document/:documentId', 
    authenticateAdmin, 
    checkPermission('canVerifyDocuments'),
    async (req, res) => {
      try {
        const { documentId } = req.params;
        const { reason, notes } = req.body;

        if (!reason) {
          return res.status(400).json({
            success: false,
            message: 'Rejection reason is required'
          });
        }

        const document = await Document.findByPk(documentId, {
          include: [{ model: User, as: 'user' }]
        });

        if (!document) {
          return res.status(404).json({
            success: false,
            message: 'Document not found'
          });
        }

        // Update document
        await document.update({
          verificationStatus: 'rejected',
          verifiedBy: req.admin.id,
          verifiedAt: new Date(),
          rejectionReason: reason,
          adminNotes: notes
        });

        // Create approval log
        await ApprovalLog.create({
          adminId: req.admin.id,
          adminName: req.admin.name,
          adminLevel: req.adminProfile.adminLevel,
          action: 'document_rejected',
          targetUserId: document.userId,
          targetUserType: document.userType,
          targetUserName: document.user.name,
          documentId: document.id,
          documentType: document.documentType,
          previousStatus: 'pending',
          newStatus: 'rejected',
          reason,
          notes,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        res.json({
          success: true,
          data: { document },
          message: 'Document rejected'
        });

      } catch (error) {
        console.error('Reject document error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  );

  // ===================== DOCUMENT UPLOAD (FOR USERS) =====================
  
  // Upload Document
  router.post('/documents/upload', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { userId, documentType, documentNumber, issueDate, expiryDate } = req.body;

      if (!userId || !documentType) {
        // Delete uploaded file
        await fs.unlink(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'userId and documentType are required'
        });
      }

      // Verify user exists
      const user = await User.findByPk(userId);
      if (!user) {
        await fs.unlink(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Create file URL (in production, upload to S3/Cloudinary)
      const fileUrl = `/uploads/documents/${req.file.filename}`;

      // Create document record
      const document = await Document.create({
        userId,
        userType: user.userType,
        documentType,
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        storageProvider: 'local',
        verificationStatus: 'pending',
        documentNumber,
        issueDate,
        expiryDate,
        uploadedAt: new Date()
      });

      // Create admin notification
      await AdminNotification.create({
        notificationType: 'document_uploaded',
        title: 'New Document Uploaded',
        message: `${user.userType} ${user.name} has uploaded a ${documentType}`,
        targetUserId: user.id,
        targetUserName: user.name,
        targetUserType: user.userType,
        documentId: document.id,
        priority: 'normal'
      });

      res.status(201).json({
        success: true,
        data: { document },
        message: 'Document uploaded successfully'
      });

    } catch (error) {
      console.error('Document upload error:', error);
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Get User Documents
  router.get('/documents/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const documents = await Document.findAll({
        where: {
          userId,
          isDeleted: false
        },
        order: [['uploadedAt', 'DESC']]
      });

      res.json({
        success: true,
        data: { documents }
      });

    } catch (error) {
      console.error('Get user documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // ===================== DASHBOARD STATS =====================
  
  // Get Admin Dashboard Stats
  router.get('/admin/dashboard-stats', authenticateAdmin, async (req, res) => {
    try {
      const stats = {
        pendingDrivers: await User.count({
          where: { userType: 'driver', approvalStatus: 'pending' }
        }),
        pendingVendors: await User.count({
          where: { userType: 'vendor', approvalStatus: 'pending' }
        }),
        pendingDocuments: await Document.count({
          where: { verificationStatus: 'pending' }
        }),
        unreadNotifications: await AdminNotification.count({
          where: { isRead: false }
        }),
        activeDrivers: await User.count({
          where: { userType: 'driver', approvalStatus: 'approved', isActive: true }
        }),
        activeVendors: await User.count({
          where: { userType: 'vendor', approvalStatus: 'approved', isActive: true }
        }),
        totalUsers: await User.count({
          where: { userType: ['driver', 'vendor'] }
        }),
        suspendedUsers: await User.count({
          where: { isSuspended: true }
        })
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Get Approval Logs
  router.get('/admin/approval-logs', authenticateAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const logs = await ApprovalLog.findAndCountAll({
        include: [
          { model: User, as: 'admin', attributes: ['id', 'name', 'username'] },
          { model: User, as: 'targetUser', attributes: ['id', 'name', 'phone', 'userType'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          logs: logs.rows,
          pagination: {
            total: logs.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(logs.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get approval logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // ============================================================================
  // VENDOR GST VERIFICATION ENDPOINTS
  // ============================================================================

  // Verify Vendor GST
  router.post('/admin/vendors/:id/verify-gst', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.userId;
      const adminName = req.admin.name;

      // Find vendor
      const vendor = await Vendor.findOne({ where: { userId: id } });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Update verification status
      await vendor.update({
        gstVerified: true,
        gstVerifiedAt: new Date(),
        gstVerifiedBy: adminId,
        businessVerificationStatus: 'verified',
        businessVerifiedAt: new Date(),
        businessVerifiedBy: adminId,
        gstRejectionReason: null
      });

      // Create approval log
      await ApprovalLog.create({
        adminId: adminId,
        adminName: adminName,
        targetUserId: id,
        action: 'verify_gst',
        entityType: 'vendor',
        entityId: vendor.id,
        previousStatus: 'pending',
        newStatus: 'verified',
        reason: 'GST verified by admin'
      });

      // Get updated vendor with user details
      const updatedVendor = await Vendor.findOne({
        where: { userId: id },
        include: [{ 
          model: User, 
          as: 'user',
          attributes: ['id', 'name', 'phone']
        }]
      });

      console.log(`✅ Admin ${adminId} verified GST for vendor ${id}`);

      res.json({
        success: true,
        message: 'GST verified successfully',
        data: updatedVendor
      });

    } catch (error) {
      console.error('Verify GST error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify GST'
      });
    }
  });

  // Reject Vendor GST
  router.post('/admin/vendors/:id/reject-gst', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.userId;
      const adminName = req.admin.name;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      // Find vendor
      const vendor = await Vendor.findOne({ where: { userId: id } });
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Update verification status
      await vendor.update({
        gstVerified: false,
        gstVerifiedAt: null,
        gstVerifiedBy: null,
        businessVerificationStatus: 'rejected',
        gstRejectionReason: reason
      });

      // Create approval log
      await ApprovalLog.create({
        adminId: adminId,
        adminName: adminName,
        targetUserId: id,
        action: 'reject_gst',
        entityType: 'vendor',
        entityId: vendor.id,
        previousStatus: 'pending',
        newStatus: 'rejected',
        reason: reason
      });

      console.log(`❌ Admin ${adminId} rejected GST for vendor ${id}: ${reason}`);

      res.json({
        success: true,
        message: 'GST rejected',
        data: { reason }
      });

    } catch (error) {
      console.error('Reject GST error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject GST'
      });
    }
  });

  // ============================================================================
  // DRIVER LICENSE VERIFICATION ENDPOINTS
  // ============================================================================

  // Verify Driver License
  router.post('/admin/drivers/:id/verify-license', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.userId;
      const adminName = req.admin.name;

      // Find driver
      const driver = await Driver.findOne({ where: { userId: id } });
      
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
      }

      // Update verification status
      await driver.update({
        licenseVerificationStatus: 'verified',
        licenseVerifiedAt: new Date(),
        licenseVerifiedBy: adminId,
        licenseRejectionReason: null
      });

      // Create approval log
      await ApprovalLog.create({
        adminId: adminId,
        adminName: adminName,
        targetUserId: id,
        action: 'verify_license',
        entityType: 'driver',
        entityId: driver.id,
        previousStatus: 'pending',
        newStatus: 'verified',
        reason: 'License verified by admin'
      });

      // Get updated driver with user details
      const updatedDriver = await Driver.findOne({
        where: { userId: id },
        include: [{ 
          model: User, 
          as: 'user',
          attributes: ['id', 'name', 'phone']
        }]
      });

      console.log(`✅ Admin ${adminId} verified license for driver ${id}`);

      res.json({
        success: true,
        message: 'License verified successfully',
        data: updatedDriver
      });

    } catch (error) {
      console.error('Verify license error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify license'
      });
    }
  });

  // Reject Driver License
  router.post('/admin/drivers/:id/reject-license', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.userId;
      const adminName = req.admin.name;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      // Find driver
      const driver = await Driver.findOne({ where: { userId: id } });
      
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
      }

      // Update verification status
      await driver.update({
        licenseVerificationStatus: 'rejected',
        licenseVerifiedAt: null,
        licenseVerifiedBy: null,
        licenseRejectionReason: reason
      });

      // Create approval log
      await ApprovalLog.create({
        adminId: adminId,
        adminName: adminName,
        targetUserId: id,
        action: 'reject_license',
        entityType: 'driver',
        entityId: driver.id,
        previousStatus: 'pending',
        newStatus: 'rejected',
        reason: reason
      });

      console.log(`❌ Admin ${adminId} rejected license for driver ${id}: ${reason}`);

      res.json({
        success: true,
        message: 'License rejected',
        data: { reason }
      });

    } catch (error) {
      console.error('Reject license error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject license'
      });
    }
  });

  return router;
}

module.exports = { createAdminRoutes, upload };
