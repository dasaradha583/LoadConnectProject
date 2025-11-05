
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('driver', 'vendor')),
    verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver-specific information (separate table)
CREATE TABLE drivers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) NOT NULL,
    license_photo_url VARCHAR(500),
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_capacity DECIMAL(8,2) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor-specific information (separate table)
CREATE TABLE vendors (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(100) NOT NULL,
    business_id VARCHAR(50),
    gst_number VARCHAR(20),
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

-- Driver indexes
CREATE INDEX idx_drivers_vehicle_type ON drivers(vehicle_type);
CREATE INDEX idx_drivers_is_available ON drivers(is_available);
CREATE INDEX idx_drivers_rating ON drivers(rating);

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
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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
    u.verified,
    u.is_active,
    u.last_active_at,
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
JOIN drivers d ON u.id = d.id
LEFT JOIN driver_locations dl ON d.id = dl.driver_id AND dl.is_active = TRUE
WHERE u.user_type = 'driver';

-- Complete vendor view
CREATE VIEW vendor_details_view AS
SELECT 
    u.id,
    u.phone,
    u.username,
    u.name,
    u.verified,
    u.is_active,
    v.business_name,
    v.business_id,
    v.gst_number,
    v.rating,
    v.total_orders,
    v.completed_orders,
    v.total_spent
FROM users u
JOIN vendors v ON u.id = v.id
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
COMMENT ON TABLE drivers IS 'Driver-specific information and statistics';
COMMENT ON TABLE vendors IS 'Vendor-specific business information';
COMMENT ON TABLE locations IS 'Normalized location data reusable across the system';
COMMENT ON TABLE driver_locations IS 'Real-time driver location tracking';
COMMENT ON TABLE location_history IS 'Historical location tracking for route analysis';
COMMENT ON TABLE loads IS 'Main load/shipment information with normalized location references';
COMMENT ON TABLE delivery_proofs IS 'Proof of delivery images and documentation';
COMMENT ON TABLE load_ratings IS 'Rating system between drivers and vendors';
COMMENT ON TABLE geofences IS 'Proximity-based alert definitions';
COMMENT ON TABLE geofence_events IS 'Geofence entry/exit event logging';

