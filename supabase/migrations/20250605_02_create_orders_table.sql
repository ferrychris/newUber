-- Create the orders table
CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    status order_status DEFAULT 'pending' NOT NULL,
    customer_id uuid NOT NULL,
    driver_id uuid,
    pickup_location text NOT NULL,
    dropoff_location text NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
);
