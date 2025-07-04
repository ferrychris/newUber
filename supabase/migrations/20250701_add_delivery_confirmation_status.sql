-- Add new status to order_status enum
-- First, create a temporary type with the new value
CREATE TYPE order_status_new AS ENUM(
  'pending', 
  'accepted', 
  'en_route', 
  'arrived', 
  'picked_up', 
  'delivered', 
  'confirmed',  -- New status for customer confirmation
  'cancelled'
);

-- Convert columns using the old type to the new type
ALTER TABLE orders 
  ALTER COLUMN status TYPE order_status_new 
  USING (
    CASE
      WHEN status::text = 'delivered' THEN 'delivered'::order_status_new
      ELSE status::text::order_status_new
    END
  );

-- Drop old type and rename new type to the old name
DROP TYPE order_status;
ALTER TYPE order_status_new RENAME TO order_status;

-- Update the get_next_status_options function to include the new status transition
CREATE OR REPLACE FUNCTION public.get_next_status_options(current_status order_status)
RETURNS order_status[] AS $$
BEGIN
  RETURN CASE current_status
    WHEN 'pending' THEN ARRAY['accepted'::order_status, 'cancelled'::order_status]
    WHEN 'accepted' THEN ARRAY['en_route'::order_status, 'cancelled'::order_status]
    WHEN 'en_route' THEN ARRAY['arrived'::order_status, 'cancelled'::order_status]
    WHEN 'arrived' THEN ARRAY['picked_up'::order_status, 'cancelled'::order_status]
    WHEN 'picked_up' THEN ARRAY['delivered'::order_status]
    WHEN 'delivered' THEN ARRAY['confirmed'::order_status] -- Add transition from delivered to confirmed
    ELSE ARRAY[]::order_status[]
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update any other related functions or triggers if necessary
-- Add a new function to allow customers to confirm delivery
CREATE OR REPLACE FUNCTION public.confirm_delivery(
  p_order_id UUID,
  p_customer_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order_exists BOOLEAN;
  v_is_customer BOOLEAN;
  v_current_status order_status;
BEGIN
  -- Check if order exists and belongs to the customer
  SELECT 
    EXISTS(SELECT 1 FROM orders WHERE id = p_order_id) INTO v_order_exists,
    EXISTS(SELECT 1 FROM orders WHERE id = p_order_id AND customer_id = p_customer_id) INTO v_is_customer,
    status INTO v_current_status
  FROM orders 
  WHERE id = p_order_id;
  
  -- Validate order exists
  IF NOT v_order_exists THEN
    RAISE EXCEPTION 'Order not found';
    RETURN FALSE;
  END IF;
  
  -- Validate customer owns order
  IF NOT v_is_customer THEN
    RAISE EXCEPTION 'Not authorized to confirm this delivery';
    RETURN FALSE;
  END IF;
  
  -- Validate current status is 'delivered'
  IF v_current_status != 'delivered' THEN
    RAISE EXCEPTION 'Order is not in delivered status';
    RETURN FALSE;
  END IF;
  
  -- Update order status to confirmed
  UPDATE orders
  SET 
    status = 'confirmed',
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Add entry to order_status_history
  INSERT INTO order_status_history (
    order_id, 
    previous_status, 
    new_status, 
    updated_by, 
    created_at
  ) VALUES (
    p_order_id,
    'delivered',
    'confirmed',
    p_customer_id,
    now()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
REVOKE ALL ON FUNCTION public.confirm_delivery(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_delivery(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_delivery(UUID, UUID) TO service_role;
