-- Create function to get messages for a specific order
CREATE OR REPLACE FUNCTION public.get_order_messages(p_order_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  sender_id UUID,
  receiver_id UUID,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  sender_name TEXT,
  receiver_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark messages as read when fetched by receiver
  UPDATE public.messages
  SET read = true
  WHERE order_id = p_order_id
    AND receiver_id = auth.uid()
    AND read = false;
    
  -- Return messages with sender and receiver names
  RETURN QUERY
  SELECT 
    m.id,
    m.message as content,
    m.sender_id,
    m.receiver_id,
    m.created_at,
    CASE WHEN m.read THEN m.updated_at ELSE NULL END as read_at,
    COALESCE(sender_profile.full_name, 'Unknown User') as sender_name,
    COALESCE(receiver_profile.full_name, 'Unknown User') as receiver_name
  FROM 
    public.messages m
  LEFT JOIN 
    public.profiles sender_profile ON m.sender_id = sender_profile.id
  LEFT JOIN 
    public.profiles receiver_profile ON m.receiver_id = receiver_profile.id
  WHERE 
    m.order_id = p_order_id
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  ORDER BY 
    m.created_at ASC;
END;
$$;

-- Create function to send a message
CREATE OR REPLACE FUNCTION public.send_message(
  p_order_id UUID,
  p_receiver_id UUID,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Verify the user is allowed to send messages for this order
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
    AND (
      -- User is either the customer or the driver for this order
      o.user_id = auth.uid() OR o.driver_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'You are not authorized to send messages for this order';
  END IF;
  
  -- Verify the receiver is the other party in this order
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
    AND (
      -- Receiver is either the customer or the driver
      (o.user_id = p_receiver_id AND o.driver_id = auth.uid()) OR
      (o.driver_id = p_receiver_id AND o.user_id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Invalid message recipient';
  END IF;

  -- Insert the message
  INSERT INTO public.messages (
    order_id,
    sender_id,
    receiver_id,
    message
  ) VALUES (
    p_order_id,
    auth.uid(),
    p_receiver_id,
    p_content
  )
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- Create function to mark all messages in an order as read
CREATE OR REPLACE FUNCTION public.mark_order_messages_read(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET read = true, updated_at = NOW()
  WHERE order_id = p_order_id
    AND receiver_id = auth.uid()
    AND read = false;
END;
$$;

-- Create function to get chat notifications
CREATE OR REPLACE FUNCTION public.get_chat_notifications()
RETURNS TABLE (
  id UUID,
  order_id UUID,
  message_count BIGINT,
  last_message TEXT,
  sender_name TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH unread_counts AS (
    SELECT
      m.order_id,
      COUNT(*) as count,
      MAX(m.created_at) as latest_time,
      (SELECT message FROM messages 
       WHERE order_id = m.order_id 
       ORDER BY created_at DESC LIMIT 1) as last_msg,
      (SELECT p.full_name FROM profiles p 
       JOIN messages msg ON p.id = msg.sender_id
       WHERE msg.order_id = m.order_id
       ORDER BY msg.created_at DESC LIMIT 1) as sender
    FROM
      messages m
    WHERE
      m.receiver_id = auth.uid() AND
      m.read = false
    GROUP BY
      m.order_id
  )
  SELECT
    gen_random_uuid() as id,
    uc.order_id,
    uc.count as message_count,
    uc.last_msg as last_message,
    uc.sender as sender_name,
    uc.latest_time as updated_at
  FROM
    unread_counts uc
  ORDER BY
    uc.latest_time DESC;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_order_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_notifications TO authenticated;
