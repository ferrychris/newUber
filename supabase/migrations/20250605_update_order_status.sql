-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.update_order_status_v2;

-- Create the updated function
CREATE OR REPLACE FUNCTION public.update_order_status_v2(
  p_order_id uuid,
  p_new_status text,
  p_notes text DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL,
  p_location_lat numeric DEFAULT NULL,
  p_location_lng numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status text;
  v_result json;
BEGIN
  -- Get the current status
  SELECT status INTO v_old_status
  FROM orders
  WHERE id = p_order_id;

  -- Update the order status
  UPDATE orders
  SET 
    status = p_new_status::order_status,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING json_build_object(
    'id', id,
    'status', status,
    'updated_at', updated_at
  ) INTO v_result;

  -- Insert into status history
  INSERT INTO order_status_history (
    order_id,
    old_status,
    new_status,
    notes,
    updated_by,
    location_lat,
    location_lng
  ) VALUES (
    p_order_id,
    v_old_status,
    p_new_status,
    p_notes,
    p_updated_by,
    p_location_lat,
    p_location_lng
  );

  RETURN v_result;
END;
$$;
