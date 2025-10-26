-- Database Migration Script for Enhanced LoadConnect Features
-- Run this to add all missing columns for document verification and tracking

-- ===========================================
-- USERS TABLE ENHANCEMENTS
-- ===========================================

-- Add document verification fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS documentsVerified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verificationStatus VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS licenseImageUrl TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicleRcImageUrl TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS insuranceImageUrl TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadharImageUrl TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS panImageUrl TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bankPassbookImageUrl TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS licenseExpiryDate TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS insuranceExpiryDate TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verificationNotes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verifiedAt TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verifiedBy UUID;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verificationStatus);
CREATE INDEX IF NOT EXISTS idx_users_documents_verified ON users(documentsVerified);

-- ===========================================
-- LOADS TABLE ENHANCEMENTS  
-- ===========================================

-- Add driver tracking fields
ALTER TABLE loads ADD COLUMN IF NOT EXISTS driverCurrentLat NUMERIC(10,8);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS driverCurrentLng NUMERIC(11,8);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS lastLocationUpdate TIMESTAMP WITH TIME ZONE;

-- Add pickup/drop confirmation fields
ALTER TABLE loads ADD COLUMN IF NOT EXISTS isPickedUp BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS isDropped BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickupConfirmedAt TIMESTAMP WITH TIME ZONE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dropConfirmedAt TIMESTAMP WITH TIME ZONE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickupImageUrl TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dropImageUrl TEXT;

-- Add enhanced timing fields
ALTER TABLE loads ADD COLUMN IF NOT EXISTS startedAt TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loads_driver_location ON loads(driverCurrentLat, driverCurrentLng);
CREATE INDEX IF NOT EXISTS idx_loads_pickup_status ON loads(isPickedUp);
CREATE INDEX IF NOT EXISTS idx_loads_drop_status ON loads(isDropped);
CREATE INDEX IF NOT EXISTS idx_loads_last_location_update ON loads(lastLocationUpdate);

-- ===========================================
-- VERIFICATION STATUS ENUM (if not exists)
-- ===========================================

DO $$ BEGIN
    CREATE TYPE verification_status_enum AS ENUM ('pending', 'in_review', 'verified', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update verification status column to use enum
DO $$ BEGIN
    ALTER TABLE users ALTER COLUMN verificationStatus TYPE verification_status_enum USING verificationStatus::verification_status_enum;
EXCEPTION
    WHEN others THEN 
        -- If conversion fails, keep as VARCHAR for now
        RAISE NOTICE 'Could not convert verificationStatus to enum, keeping as VARCHAR';
END $$;

-- ===========================================
-- DATA CONSISTENCY UPDATES
-- ===========================================

-- Ensure all existing users have default verification status
UPDATE users SET 
    documentsVerified = false,
    verificationStatus = 'pending'
WHERE documentsVerified IS NULL OR verificationStatus IS NULL;

-- Ensure all existing loads have default tracking values
UPDATE loads SET 
    isPickedUp = false,
    isDropped = false
WHERE isPickedUp IS NULL OR isDropped IS NULL;

-- ===========================================
-- QUERY VERIFICATION
-- ===========================================

-- Verify Users table structure
SELECT 'Users table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN (
    'documentsVerified', 'verificationStatus', 'licenseImageUrl', 
    'vehicleRcImageUrl', 'insuranceImageUrl', 'aadharImageUrl',
    'panImageUrl', 'bankPassbookImageUrl', 'verifiedAt'
)
ORDER BY column_name;

-- Verify Loads table structure  
SELECT 'Loads table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'loads'
AND column_name IN (
    'driverCurrentLat', 'driverCurrentLng', 'lastLocationUpdate',
    'isPickedUp', 'isDropped', 'pickupConfirmedAt', 'dropConfirmedAt',
    'pickupImageUrl', 'dropImageUrl', 'startedAt'
)
ORDER BY column_name;

COMMIT;
