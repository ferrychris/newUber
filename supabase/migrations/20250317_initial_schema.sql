-- Drop existing tables if they exist
DROP TABLE IF EXISTS ratings_reviews;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    password TEXT NOT NULL,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Create vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('car', 'bike', 'truck')),
    brand TEXT,
    model TEXT,
    plate_number TEXT UNIQUE NOT NULL,
    color TEXT,
    capacity INT,
    created_at TIMESTAMP DEFAULT now()
);

-- Create services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL CHECK (name IN ('Carpooling', 'Parcels', 'Shopping', 'Meals', 'Large Items')),
    description TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    estimated_price DECIMAL(10,2),
    actual_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT now()
);

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
    payment_method TEXT CHECK (payment_method IN ('card', 'mobile_money', 'cash')),
    created_at TIMESTAMP DEFAULT now()
);

-- Create ratings_reviews table
CREATE TABLE ratings_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings_reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for service role" ON users
    FOR INSERT WITH CHECK (true);

-- Vehicles policies
CREATE POLICY "Users can view their own vehicles" ON vehicles
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own vehicles" ON vehicles
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own vehicles" ON vehicles
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own vehicles" ON vehicles
    FOR DELETE USING (auth.uid() = owner_id);

-- Services policies (viewable by all authenticated users)
CREATE POLICY "Anyone can view services" ON services
    FOR SELECT USING (true);

-- Orders policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ratings policies
CREATE POLICY "Anyone can view ratings" ON ratings_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own ratings" ON ratings_reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own ratings" ON ratings_reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Create initial services
INSERT INTO services (name, description) VALUES
    ('Carpooling', 'Share rides with other passengers'),
    ('Parcels', 'Send and receive packages'),
    ('Shopping', 'Get your shopping delivered'),
    ('Meals', 'Food delivery service'),
    ('Large Items', 'Transport large items and furniture');
