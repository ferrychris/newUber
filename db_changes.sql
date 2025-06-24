-- Update the orders table status enum
ALTER TYPE order_status DROP VALUE IF EXISTS 'completed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'en_route' AFTER 'accepted';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'arrived' AFTER 'en_route';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up' AFTER 'arrived';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivered' AFTER 'picked_up';

-- Create order_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    updated_by UUID REFERENCES users(id),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_timestamp ON order_status_history(timestamp);

-- Add RLS (Row Level Security) policies
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Policy for inserting status updates (drivers and admins)
CREATE POLICY "Allow status updates for assigned drivers and admins" ON order_status_history
    FOR INSERT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_status_history.order_id
            AND (o.driver_id = auth.uid() OR auth.user_has_role('admin'))
        )
    );

-- Policy for viewing status updates
CREATE POLICY "Allow viewing status updates for involved parties" ON order_status_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_status_history.order_id
            AND (
                o.user_id = auth.uid() OR
                o.driver_id = auth.uid() OR
                auth.user_has_role('admin')
            )
        )
    );
