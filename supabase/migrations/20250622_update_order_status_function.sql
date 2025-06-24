-- First, save the current data
CREATE TEMP TABLE orders_backup AS SELECT * FROM orders;

-- Drop existing objects for clean slate
DROP TRIGGER IF EXISTS order_status_update ON orders;
DROP FUNCTION IF EXISTS process_order_status_update() CASCADE;
DROP FUNCTION IF EXISTS update_order_status(text, text);
DROP TYPE IF EXISTS order_status CASCADE;

-- Create the enum type for order status
CREATE TYPE order_status AS ENUM (
  'pending',
  'accepted',
  'en_route',
  'arrived',
  'picked_up',
  'delivered',
  'cancelled'
);

-- Create a new orders table with the enum type
CREATE TABLE orders_new (
  LIKE orders
);

-- Alter the status column to use the enum type
ALTER TABLE orders_new 
  ALTER COLUMN status TYPE order_status USING status::order_status;

-- Copy data from backup to new table
INSERT INTO orders_new 
SELECT * FROM orders_backup;

-- Drop the old table and rename the new one
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

-- Drop the backup table
DROP TABLE orders_backup;

-- Create the function to update order status
CREATE OR REPLACE FUNCTION update_order_status(p_order_id text, p_new_status text)
RETURNS void AS $$
BEGIN
  -- Update the order directly - the type cast will validate the status
  UPDATE orders
  SET 
    status = p_new_status::order_status,
    updated_at = NOW()
  WHERE id = p_order_id::uuid;

  -- Check if the update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found', p_order_id;
  END IF;

EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION 'Invalid order status: %. Valid values are: pending, accepted, en_route, arrived, picked_up, delivered, cancelled', p_new_status;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_order_status(text, text) TO authenticated;
