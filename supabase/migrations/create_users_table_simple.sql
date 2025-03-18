-- Drop existing table if it exists
DROP TABLE IF EXISTS users;

-- Create the users table with basic structure
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    fullname TEXT NOT NULL,
    phone_number TEXT,
    type TEXT CHECK (type IN ('Customer', 'Driver')) DEFAULT 'Customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for service role" ON users;

-- Create policies
CREATE POLICY "Users can view own profile" 
    ON users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON users FOR UPDATE 
    USING (auth.uid() = id);

-- Allow inserts from service role (which is what we're using during registration)
CREATE POLICY "Enable insert for service role" 
    ON users FOR INSERT 
    WITH CHECK (true);  -- Allow all inserts, since we're using the service role

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
