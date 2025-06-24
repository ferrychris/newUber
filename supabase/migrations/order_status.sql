-- 20250605124700_add_order_status_transitions.sql

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the status type enum
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

-- Create or replace the function to get valid next statuses
CREATE OR REPLACE FUNCTION public.get_next_status_options(current_status order_status)
RETURNS order_status[] AS $$
BEGIN
  RETURN CASE current_status::text
    WHEN 'pending' THEN ARRAY['accepted'::order_status, 'cancelled'::order_status]
    WHEN 'accepted' THEN ARRAY['en_route'::order_status, 'cancelled'::order_status]
    WHEN 'en_route' THEN ARRAY['arrived'::order_status, 'cancelled'::order_status]
    WHEN 'arrived' THEN ARRAY['picked_up'::order_status, 'cancelled'::order_status]
    WHEN 'picked_up' THEN ARRAY['delivered'::order_status]
    ELSE ARRAY[]::order_status[]
  END;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the update order status function
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status order_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status order_status;
  v_valid_next_statuses order_status[];
  v_result JSONB;
BEGIN
  -- Get current status of the order
  SELECT status INTO v_current_status
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;
  
  -- Get valid next statuses
  v_valid_next_statuses := get_next_status_options(v_current_status);
  
  -- Check if the new status is valid
  IF NOT p_new_status = ANY(v_valid_next_statuses) THEN
    RETURN jsonb_build_object(
      'error', 'Invalid status transition',
      'current_status', v_current_status,
      'requested_status', p_new_status,
      'valid_next_statuses', v_valid_next_statuses
    );
  END IF;
  
  -- Update the order status
  UPDATE orders
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING 
    jsonb_build_object(
      'order_id', id,
      'new_status', status,
      'updated_at', updated_at
    ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANTE EXECUTE ON FUNCTION public.get_next_status_options(order_status) TO authenticated;
GRANTE EXECUTE ON FUNCTION public.get_next_status_options(order_status) TO service_role;
GRANTE EXECUTE ON FUNCTION public.update_order_status(UUID, order_status) TO authenticated;
GRANTE EXECUTE ON FUNCTION public.update_order_status(UUID, order_status) TO service_role;