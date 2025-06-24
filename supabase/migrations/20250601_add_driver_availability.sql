-- Add availability column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability TEXT CHECK (availability IN ('online', 'offline')) DEFAULT 'offline';

-- Update driver verifications table to store document URLs
ALTER TABLE driver_verifications ADD COLUMN IF NOT EXISTS license_url TEXT;
ALTER TABLE driver_verifications ADD COLUMN IF NOT EXISTS vehicle_url TEXT;
ALTER TABLE driver_verifications ADD COLUMN IF NOT EXISTS insurance_url TEXT;
