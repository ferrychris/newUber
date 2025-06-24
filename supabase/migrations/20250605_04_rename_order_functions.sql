-- Rename the update_order_status function to update_order_status_v2
ALTER FUNCTION public.update_order_status(UUID, order_status) 
RENAME TO update_order_status_v2;

-- Update the grants for the renamed function
REVOKE ALL ON FUNCTION public.update_order_status_v2(UUID, order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_status_v2(UUID, order_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status_v2(UUID, order_status) TO service_role;
