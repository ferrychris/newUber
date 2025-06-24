-- Create the order status enum
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending',
        'accepted',
        'en_route',
        'arrived',
        'picked_up',
        'delivered',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
