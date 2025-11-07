
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('driver', 'vendor', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    suspended_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin-specific information (separate table)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    admin_level VARCHAR(20) DEFAULT 'admin' CHECK (admin_level IN ('super_admin', 'admin', 'moderator')),
    department VARCHAR(50),
    can_approve_vendors BOOLEAN DEFAULT TRUE,
    can_approve_drivers BOOLEAN DEFAULT TRUE,
    can_suspend_users BOOLEAN DEFAULT FALSE,
    can_view_financials BOOLEAN DEFAULT FALSE,
    can_manage_admins BOOLEAN DEFAULT FALSE,
    can_manage_loads BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT TRUE,
    can_verify_documents BOOLEAN DEFAULT TRUE,
    total_approvals_count INTEGER DEFAULT 0,
    total_rejections_count INTEGER DEFAULT 0,
    total_suspensions_count INTEGER DEFAULT 0,
    total_documents_verified INTEGER DEFAULT 0,
    employee_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver-specific information (separate table)
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    license_expiry_date DATE,
    license_verification_status VARCHAR(20) DEFAULT 'pending' CHECK (license_verification_status IN ('pending', 'verified', 'rejected', 'expired')),
    license_verified_at TIMESTAMP WITH TIME ZONE,
    license_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    license_rejection_reason TEXT,
    license_photo_url VARCHAR(500),
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_capacity DECIMAL(8,2) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_make VARCHAR(50),
    vehicle_model VARCHAR(50),
    vehicle_year INTEGER,
    vehicle_color VARCHAR(30),
    vehicle_verification_status VARCHAR(20) DEFAULT 'pending' CHECK (vehicle_verification_status IN ('pending', 'verified', 'rejected')),
    vehicle_verified_at TIMESTAMP WITH TIME ZONE,
    vehicle_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    vehicle_rejection_reason TEXT,
    insurance_number VARCHAR(50),
    insurance_expiry_date DATE,
    insurance_provider VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    current_location_lat DECIMAL(10,8),
    current_location_lng DECIMAL(11,8),
    current_location_address TEXT,
    last_location_update TIMESTAMP WITH TIME ZONE,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    on_time_percentage DECIMAL(5,2) DEFAULT 100.00,
    background_check_status VARCHAR(20) DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'cleared', 'failed')),
    background_check_date DATE,
    background_check_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor-specific information (separate table)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(100) NOT NULL,
    business_type VARCHAR(50),
    year_established INTEGER,
    industry VARCHAR(100),
    business_id VARCHAR(50),
    gst_number VARCHAR(20) UNIQUE,
    gst_verified BOOLEAN DEFAULT FALSE,
    gst_verified_at TIMESTAMP WITH TIME ZONE,
    gst_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    gst_rejection_reason TEXT,
    business_address TEXT,
    registered_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    address_verified BOOLEAN DEFAULT FALSE,
    address_verified_at TIMESTAMP WITH TIME ZONE,
    address_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    business_verification_status VARCHAR(20) DEFAULT 'pending' CHECK (business_verification_status IN ('pending', 'verified', 'rejected')),
    business_verified_at TIMESTAMP WITH TIME ZONE,
    business_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    business_rejection_reason TEXT,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(15),
    location_type VARCHAR(20) CHECK (location_type IN ('pickup', 'drop', 'current', 'waypoint')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(8,2),
    speed DECIMAL(8,2),
    heading DECIMAL(5,2),
    altitude DECIMAL(10,2),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    load_id UUID,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(8,2),
    speed DECIMAL(8,2),
    heading DECIMAL(5,2),
    altitude DECIMAL(10,2),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(20) CHECK (event_type IN ('position_update', 'pickup_start', 'pickup_complete', 'drop_start', 'drop_complete', 'waypoint')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE loads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    -- Load details
    weight DECIMAL(8,2) NOT NULL,
    description TEXT NOT NULL,
    vehicle_type_required VARCHAR(50) DEFAULT 'truck',
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'posted' CHECK (status IN ('posted', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled')),
    
    -- Location references (normalized)
    pickup_location_id UUID NOT NULL REFERENCES locations(id),
    drop_location_id UUID NOT NULL REFERENCES locations(id),
    
    -- Timing
    pickup_date TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    pickup_confirmed_at TIMESTAMP WITH TIME ZONE,
    drop_confirmed_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Financial
    budget DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2),
    
    -- Logistics
    estimated_distance DECIMAL(8,2), -- in kilometers
    actual_distance DECIMAL(8,2),
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER,
    
    -- Status flags
    is_picked_up BOOLEAN DEFAULT FALSE,
    is_dropped BOOLEAN DEFAULT FALSE,
    
    -- Special instructions
    special_instructions TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================== DOCUMENTS TABLE =====================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('driver', 'vendor')),
    document_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    storage_provider VARCHAR(50) DEFAULT 's3',
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    document_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(100),
    is_expired BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================== APPROVAL LOGS TABLE =====================
CREATE TABLE approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_name VARCHAR(100) NOT NULL,
    admin_level VARCHAR(20),
    action VARCHAR(50) NOT NULL,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_type VARCHAR(20),
    target_user_name VARCHAR(100),
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    reason TEXT,
    notes TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    document_type VARCHAR(50),
    load_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================== ADMIN NOTIFICATIONS TABLE =====================
CREATE TABLE admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_name VARCHAR(100),
    target_user_type VARCHAR(20),
    load_id UUID,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    rating_id UUID,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    read_by UUID,
    action_taken VARCHAR(50),
    action_taken_at TIMESTAMP WITH TIME ZONE,
    action_taken_by UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================== PROOF & DOCUMENTATION =====================

-- Proof of delivery/pickup
CREATE TABLE delivery_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id),
    proof_type VARCHAR(20) NOT NULL CHECK (proof_type IN ('pickup', 'delivery', 'damage', 'other')),
    image_url VARCHAR(500) NOT NULL,
    location_id UUID REFERENCES locations(id),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================== RATINGS & FEEDBACK =====================

-- Separate ratings table (many-to-many relationship)
CREATE TABLE load_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    rated_by_id UUID NOT NULL REFERENCES users(id),
    rated_to_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    rating_type VARCHAR(20) CHECK (rating_type IN ('driver_to_vendor', 'vendor_to_driver')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(load_id, rated_by_id, rated_to_id)
);

-- ===================== GEOFENCES =====================

-- Geofence definitions for proximity alerts
CREATE TABLE geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id),
    geofence_type VARCHAR(20) NOT NULL CHECK (geofence_type IN ('pickup', 'drop', 'waypoint', 'restricted')),
    radius_meters INTEGER NOT NULL DEFAULT 500,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Geofence events (when driver enters/exits)
CREATE TABLE geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id UUID NOT NULL REFERENCES geofences(id),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('enter', 'exit')),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================== INDEXES FOR PERFORMANCE =====================

-- Users indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_is_verified ON users(is_verified);

-- Admin indexes
CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_admin_level ON admins(admin_level);

-- Driver indexes
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_vehicle_type ON drivers(vehicle_type);
CREATE INDEX idx_drivers_is_available ON drivers(is_available);
CREATE INDEX idx_drivers_rating ON drivers(rating);
CREATE INDEX idx_drivers_license_number ON drivers(license_number);
CREATE INDEX idx_drivers_vehicle_number ON drivers(vehicle_number);

-- Vendor indexes
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_business_name ON vendors(business_name);
CREATE INDEX idx_vendors_gst_number ON vendors(gst_number);

-- Document indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_verification_status ON documents(verification_status);
CREATE INDEX idx_documents_user_type ON documents(user_type);

-- Approval log indexes
CREATE INDEX idx_approval_logs_admin_id ON approval_logs(admin_id);
CREATE INDEX idx_approval_logs_target_user_id ON approval_logs(target_user_id);
CREATE INDEX idx_approval_logs_created_at ON approval_logs(created_at);

-- Location indexes (crucial for proximity queries)
CREATE INDEX idx_locations_lat_lng ON locations(latitude, longitude);
CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_driver_locations_driver_active ON driver_locations(driver_id, is_active);
CREATE INDEX idx_driver_locations_coords ON driver_locations(latitude, longitude);
CREATE INDEX idx_driver_locations_created_at ON driver_locations(created_at);

-- Location history indexes
CREATE INDEX idx_location_history_driver_load ON location_history(driver_id, load_id);
CREATE INDEX idx_location_history_timestamp ON location_history(timestamp);
CREATE INDEX idx_location_history_event_type ON location_history(event_type);

-- Load indexes
CREATE INDEX idx_loads_vendor_id ON loads(vendor_id);
CREATE INDEX idx_loads_driver_id ON loads(driver_id);
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_loads_pickup_date ON loads(pickup_date);
CREATE INDEX idx_loads_created_at ON loads(created_at);

-- Geofence indexes
CREATE INDEX idx_geofences_load_active ON geofences(load_id, is_active);
CREATE INDEX idx_geofence_events_timestamp ON geofence_events(timestamp);

-- ===================== TRIGGERS FOR UPDATED_AT =====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_notifications_updated_at BEFORE UPDATE ON admin_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loads_updated_at BEFORE UPDATE ON loads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================== ADD FOREIGN KEY TO LOCATION_HISTORY =====================
ALTER TABLE location_history ADD CONSTRAINT fk_location_history_load_id FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE SET NULL;

-- ===================== VIEWS FOR EASY QUERYING =====================

-- Complete driver view with current location
CREATE VIEW driver_details_view AS
SELECT 
    u.id,
    u.phone,
    u.username,
    u.name,
    u.is_verified,
    u.is_active,
    u.last_active_at,
    d.id AS driver_profile_id,
    d.license_number,
    d.vehicle_type,
    d.vehicle_capacity,
    d.vehicle_number,
    d.is_available,
    d.rating,
    d.total_trips,
    d.completed_trips,
    d.total_earnings,
    dl.latitude AS current_latitude,
    dl.longitude AS current_longitude,
    dl.address AS current_address,
    dl.speed AS current_speed,
    dl.heading AS current_heading,
    dl.created_at AS location_updated_at
FROM users u
JOIN drivers d ON u.id = d.user_id
LEFT JOIN driver_locations dl ON d.id = dl.driver_id AND dl.is_active = TRUE
WHERE u.user_type = 'driver';

-- Complete vendor view
CREATE VIEW vendor_details_view AS
SELECT 
    u.id,
    u.phone,
    u.username,
    u.name,
    u.is_verified,
    u.is_active,
    v.id AS vendor_profile_id,
    v.business_name,
    v.business_id,
    v.gst_number,
    v.rating,
    v.total_orders,
    v.completed_orders,
    v.total_spent
FROM users u
JOIN vendors v ON u.id = v.user_id
WHERE u.user_type = 'vendor';

-- Complete load view with locations
CREATE VIEW load_details_view AS
SELECT 
    l.id,
    l.vendor_id,
    l.driver_id,
    l.weight,
    l.description,
    l.vehicle_type_required,
    l.priority,
    l.status,
    l.pickup_date,
    l.budget,
    l.estimated_distance,
    l.is_picked_up,
    l.is_dropped,
    
    -- Pickup location details
    pl.latitude AS pickup_latitude,
    pl.longitude AS pickup_longitude,
    pl.address AS pickup_address,
    pl.contact_name AS pickup_contact_name,
    pl.contact_phone AS pickup_contact_phone,
    
    -- Drop location details
    dl.latitude AS drop_latitude,
    dl.longitude AS drop_longitude,
    dl.address AS drop_address,
    dl.contact_name AS drop_contact_name,
    dl.contact_phone AS drop_contact_phone,
    
    -- Driver current location (if assigned)
    dcl.latitude AS driver_current_latitude,
    dcl.longitude AS driver_current_longitude,
    dcl.created_at AS driver_location_updated_at,
    
    l.created_at,
    l.updated_at
FROM loads l
JOIN locations pl ON l.pickup_location_id = pl.id
JOIN locations dl ON l.drop_location_id = dl.id
LEFT JOIN driver_locations dcl ON l.driver_id = dcl.driver_id AND dcl.is_active = TRUE;

-- ===================== COMMENTS FOR DOCUMENTATION =====================

COMMENT ON TABLE users IS 'Base user table containing common user information';
COMMENT ON TABLE admins IS 'Admin-specific information and permissions';
COMMENT ON TABLE drivers IS 'Driver-specific information and statistics';
COMMENT ON TABLE vendors IS 'Vendor-specific business information';
COMMENT ON TABLE documents IS 'Document uploads for verification (licenses, GST certificates, etc.)';
COMMENT ON TABLE approval_logs IS 'Audit trail for admin actions on users and documents';
COMMENT ON TABLE admin_notifications IS 'Notification system for admin dashboard';
COMMENT ON TABLE locations IS 'Normalized location data reusable across the system';
COMMENT ON TABLE driver_locations IS 'Real-time driver location tracking';
COMMENT ON TABLE location_history IS 'Historical location tracking for route analysis';
COMMENT ON TABLE loads IS 'Main load/shipment information with normalized location references';
COMMENT ON TABLE delivery_proofs IS 'Proof of delivery images and documentation';
COMMENT ON TABLE load_ratings IS 'Rating system between drivers and vendors';
COMMENT ON TABLE geofences IS 'Proximity-based alert definitions';
COMMENT ON TABLE geofence_events IS 'Geofence entry/exit event logging';

