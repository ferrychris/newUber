-- Drop the existing function
DROP FUNCTION IF EXISTS public.update_order_status_v2(UUID, order_status);

-- Recreate with named parameters in the correct order
CREATE OR REPLACE FUNCTION public.update_order_status_v2(
  p_new_status text,
  p_order_id UUID
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
  IF NOT (p_new_status::order_status) = ANY(v_valid_next_statuses) THEN
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
    status = p_new_status::order_status,
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

-- Update the grants for the function
REVOKE ALL ON FUNCTION public.update_order_status_v2(text, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_status_v2(text, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status_v2(text, UUID) TO service_role;
