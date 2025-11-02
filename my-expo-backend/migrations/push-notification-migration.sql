-- Push Notification Support Migration
-- Add Expo Push Token field to users table

-- Add expoPushToken column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255);

-- Add index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_users_expo_push_token ON users(expo_push_token) WHERE expo_push_token IS NOT NULL;

-- Add timestamp for when token was last updated
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMP WITH TIME ZONE;

-- Add device info for better notification targeting
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_type VARCHAR(20); -- 'ios' or 'android'
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_model VARCHAR(100);

-- Create notification_logs table to track sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'new_load', 'load_assigned', 'payment_received', etc.
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB, -- Additional notification data
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
    error_message TEXT,
    expo_receipt_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);

-- Comments for documentation
COMMENT ON COLUMN users.expo_push_token IS 'Expo push notification token for sending push notifications';
COMMENT ON COLUMN users.push_token_updated_at IS 'Timestamp when the push token was last updated';
COMMENT ON COLUMN users.device_type IS 'Device type: ios or android';
COMMENT ON COLUMN users.device_model IS 'Device model information';
COMMENT ON TABLE notification_logs IS 'Logs all push notifications sent to users';

-- Sample query to check active drivers with push tokens
-- SELECT id, name, phone, user_type, expo_push_token, device_type FROM users WHERE user_type = 'driver' AND expo_push_token IS NOT NULL;
