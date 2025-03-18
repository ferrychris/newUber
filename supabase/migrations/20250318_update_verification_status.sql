-- Update the driver_verifications status to include 'in_progress' as a valid status value
ALTER TABLE driver_verifications 
DROP CONSTRAINT driver_verifications_status_check,
ADD CONSTRAINT driver_verifications_status_check 
CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected')),
ALTER COLUMN status SET DEFAULT 'pending';

-- Also update the drivers verification_status field to match
ALTER TABLE drivers 
DROP CONSTRAINT drivers_verification_status_check,
ADD CONSTRAINT drivers_verification_status_check 
CHECK (verification_status IN ('none', 'pending', 'in_progress', 'verified', 'rejected')),
ALTER COLUMN verification_status SET DEFAULT 'none';

-- Add a column to track who started the verification process, if applicable
ALTER TABLE driver_verifications 
ADD COLUMN verifier_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN verification_started_at TIMESTAMP WITH TIME ZONE;

-- Update the trigger function to handle the new status
CREATE OR REPLACE FUNCTION update_driver_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a verification record is created or updated
    -- Update the corresponding driver's verification status
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
        UPDATE drivers
        SET 
            verification_status = CASE 
                WHEN NEW.status = 'approved' THEN 'verified'
                WHEN NEW.status = 'in_progress' THEN 'in_progress'
                ELSE NEW.status
            END,
            updated_at = NOW()
        WHERE id = NEW.driver_id;
    END IF;
    
    -- If verification is now in progress, record who started it and when
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'in_progress') THEN
        NEW.verifier_id = NEW.reviewer_id;
        NEW.verification_started_at = NOW();
    END IF;
    
    -- If verification is complete (approved or rejected), record review details
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND (NEW.status = 'approved' OR NEW.status = 'rejected')) THEN
        NEW.review_date = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist, or replace if it does
DROP TRIGGER IF EXISTS verification_status_change ON driver_verifications;

CREATE TRIGGER verification_status_change
AFTER INSERT OR UPDATE OF status ON driver_verifications
FOR EACH ROW
EXECUTE FUNCTION update_driver_verification_status();

-- Add a new index to speed up common lookups
CREATE INDEX IF NOT EXISTS idx_driver_verifications_status ON driver_verifications(status);
CREATE INDEX IF NOT EXISTS idx_drivers_verification_status ON drivers(verification_status);
