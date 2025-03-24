-- Create an RPC function to get unread message counts per order
CREATE OR REPLACE FUNCTION public.get_unread_message_counts(
  user_id UUID,
  order_ids UUID[]
)
RETURNS TABLE (
  order_id UUID,
  count BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT order_id, COUNT(*) as count
  FROM messages
  WHERE recipient_id = user_id
    AND read = false
    AND order_id = ANY(order_ids)
  GROUP BY order_id;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_unread_message_counts TO authenticated; 