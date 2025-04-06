-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subject TEXT,
  status TEXT DEFAULT 'open', -- open, closed, in_progress
  created_at TIMESTAMP DEFAULT now()
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id),
  sender_id UUID REFERENCES auth.users(id),
  message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create table index for better query performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Create RPC for getting unread support messages count
CREATE OR REPLACE FUNCTION get_support_ticket_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  ticket_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO ticket_count
  FROM support_tickets
  WHERE user_id = p_user_id AND status = 'open';
  
  RETURN ticket_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up Row Level Security (RLS)
-- Users can only view their own tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Policy for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own tickets"
  ON support_tickets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy for support_messages
CREATE POLICY "Users can view messages for their own tickets"
  ON support_messages
  FOR SELECT
  USING (ticket_id IN (
    SELECT id FROM support_tickets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages for their own tickets"
  ON support_messages
  FOR INSERT
  WITH CHECK (ticket_id IN (
    SELECT id FROM support_tickets WHERE user_id = auth.uid()
  ) AND sender_id = auth.uid());

-- Admin policies (add these if you have admin role in your app)
CREATE POLICY "Admins can view all tickets"
  ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update any ticket"
  ON support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can view all messages"
  ON support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can create messages for any ticket"
  ON support_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  ); 