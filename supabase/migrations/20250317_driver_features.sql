-- Modify users table to include roles
ALTER TABLE users
ADD COLUMN role TEXT CHECK (role IN ('customer', 'driver')) DEFAULT 'customer',
ADD COLUMN is_verified BOOLEAN DEFAULT false,
ADD COLUMN verification_documents JSONB;

-- Create drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number TEXT UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    vehicle_type TEXT CHECK (vehicle_type IN ('car', 'bike', 'truck')) NOT NULL,
    vehicle_make TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    vehicle_year INTEGER NOT NULL,
    vehicle_color TEXT NOT NULL,
    vehicle_plate TEXT UNIQUE NOT NULL,
    insurance_number TEXT,
    insurance_expiry DATE,
    total_rides INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver_availability table
CREATE TABLE driver_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('available', 'busy', 'offline')) DEFAULT 'offline',
    current_location GEOGRAPHY(POINT),
    last_location_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modify orders table to include driver assignment
ALTER TABLE orders
ADD COLUMN driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
ADD COLUMN pickup_location_coords GEOGRAPHY(POINT),
ADD COLUMN dropoff_location_coords GEOGRAPHY(POINT),
ADD COLUMN driver_assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN pickup_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN dropoff_time TIMESTAMP WITH TIME ZONE,
ALTER COLUMN status TYPE TEXT CHECK (status IN ('pending', 'searching_driver', 'driver_assigned', 'picked_up', 'completed', 'cancelled'));

-- Modify payments table to include driver earnings
ALTER TABLE payments
ADD COLUMN driver_earning DECIMAL(10,2),
ADD COLUMN platform_fee DECIMAL(10,2);

-- Add RLS policies
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_availability ENABLE ROW LEVEL SECURITY;

-- Drivers can read their own records
CREATE POLICY "Drivers can view own data"
ON drivers FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Drivers can update their own availability
CREATE POLICY "Drivers can update own availability"
ON driver_availability FOR ALL
TO authenticated
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);

-- Drivers can view assigned orders
CREATE POLICY "Drivers can view assigned orders"
ON orders FOR SELECT
TO authenticated
USING (driver_id = auth.uid() OR user_id = auth.uid());

-- Drivers can update assigned orders
CREATE POLICY "Drivers can update assigned orders"
ON orders FOR UPDATE
TO authenticated
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());
