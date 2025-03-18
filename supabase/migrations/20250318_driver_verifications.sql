-- Create driver_verifications table
CREATE TABLE driver_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    review_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alter drivers table to add verification status fields
ALTER TABLE drivers
ADD COLUMN verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
ADD COLUMN verification_submitted_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for driver documents (consolidating into one bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('license-images', 'license-images', false);

-- Remove old individual bucket definitions and use a single 'license-images' bucket
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES 
--     ('driver_licenses', 'driver_licenses', false),
--     ('vehicle_images', 'vehicle_images', false),
--     ('insurance_documents', 'insurance_documents', false),
--     ('driver_profiles', 'driver_profiles', false);

-- Set up security policies for driver_verifications
ALTER TABLE driver_verifications ENABLE ROW LEVEL SECURITY;

-- Drivers can read their own verifications
CREATE POLICY "Drivers can view own verifications"
ON driver_verifications FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- Admin can read and update all verifications
CREATE POLICY "Admins can manage all verifications"
ON driver_verifications FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND role = 'admin'
    )
);

-- Set up storage policies for license-images bucket
CREATE POLICY "Drivers can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'license-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Drivers can view their own documents" 
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'license-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all driver documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'license-images'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND role = 'admin'
    )
);

-- Add additional trigger to update user's is_verified status when driver verification changes
CREATE OR REPLACE FUNCTION update_user_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_status = 'verified' THEN
        UPDATE users SET is_verified = TRUE
        WHERE id = NEW.id;
    ELSE
        UPDATE users SET is_verified = FALSE
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER driver_verification_status_change
AFTER UPDATE OF verification_status ON drivers
FOR EACH ROW
EXECUTE FUNCTION update_user_verification_status();
