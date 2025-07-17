-- Migration to standardize order status values and add indexes for better performance
-- This will ensure consistent status values for the status bar tracking

-- First, create an enum type for order status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'pending',
      'accepted',
      'en_route',
      'arrived',
      'picked_up',
      'in_transit',
      'delivered',
      'completed',
      'confirmed',
      'cancelled'
    );
  END IF;
END
$$;

-- Add a comment to the order_status type
COMMENT ON TYPE order_status IS 'Valid order status values for tracking order progress';

-- Add a new status_tracking column to store standardized status values
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_tracking VARCHAR(20);

-- Update the status_tracking column based on existing status values
UPDATE orders SET status_tracking = 
  CASE 
    WHEN status = 'active' THEN 'in_transit'
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'accepted' THEN 'accepted'
    WHEN status = 'en_route' THEN 'en_route'
    WHEN status = 'arrived' THEN 'arrived'
    WHEN status = 'picked_up' THEN 'picked_up'
    WHEN status = 'in_transit' THEN 'in_transit'
    WHEN status = 'delivered' THEN 'delivered'
    WHEN status = 'confirmed' THEN 'confirmed'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END;

-- Create a function to update wallet transactions when an order is completed
CREATE OR REPLACE FUNCTION process_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If the order status changed to 'completed' or 'confirmed', process wallet transactions
  IF (NEW.status_tracking = 'completed' OR NEW.status_tracking = 'confirmed') AND 
     (OLD.status_tracking != 'completed' AND OLD.status_tracking != 'confirmed') THEN
    
    -- Call the existing function to process wallet transactions
    PERFORM process_order_wallet_transactions(NEW.id);
    
  END IF;
  
  -- Keep status and status_tracking in sync
  IF NEW.status != NEW.status_tracking THEN
    NEW.status := NEW.status_tracking;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically process wallet transactions when an order is completed
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status_tracking = 'completed' OR NEW.status_tracking = 'confirmed')
EXECUTE FUNCTION process_order_status_change();

-- Add an index on the status_tracking column for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_status_tracking ON orders(status_tracking);

-- Add an index on user_id and status_tracking for faster filtering of user orders by status
CREATE INDEX IF NOT EXISTS idx_orders_user_id_status_tracking ON orders(user_id, status_tracking);

-- Add a comment to the orders table
COMMENT ON TABLE orders IS 'Orders table with standardized status tracking';

-- Add a comment to the status_tracking column
COMMENT ON COLUMN orders.status_tracking IS 'Standardized order status for tracking progress in the UI';

-- Create a function to keep status and status_tracking in sync when status is updated
CREATE OR REPLACE FUNCTION sync_order_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Map the status to a standardized status_tracking value
  NEW.status_tracking := 
    CASE 
      WHEN NEW.status = 'active' THEN 'in_transit'
      WHEN NEW.status = 'completed' THEN 'completed'
      WHEN NEW.status = 'pending' THEN 'pending'
      WHEN NEW.status = 'accepted' THEN 'accepted'
      WHEN NEW.status = 'en_route' THEN 'en_route'
      WHEN NEW.status = 'arrived' THEN 'arrived'
      WHEN NEW.status = 'picked_up' THEN 'picked_up'
      WHEN NEW.status = 'in_transit' THEN 'in_transit'
      WHEN NEW.status = 'delivered' THEN 'delivered'
      WHEN NEW.status = 'confirmed' THEN 'confirmed'
      WHEN NEW.status = 'cancelled' THEN 'cancelled'
      ELSE 'pending'
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically sync status and status_tracking
DROP TRIGGER IF EXISTS sync_order_status_trigger ON orders;
CREATE TRIGGER sync_order_status_trigger
BEFORE UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION sync_order_status();
