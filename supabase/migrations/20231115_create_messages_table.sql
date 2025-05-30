-- Create a messages table for chat functionality between drivers and customers
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy for messages - users can only see messages they sent or received
CREATE POLICY "Users can see their own messages" 
    ON public.messages 
    FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create policy to allow users to create messages
CREATE POLICY "Users can create messages" 
    ON public.messages 
    FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

-- Create policy to allow users to update read status on their received messages
CREATE POLICY "Users can update read status on their messages" 
    ON public.messages 
    FOR UPDATE 
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id AND (
        -- Only allow updating the read field
        prev(sender_id) = sender_id AND 
        prev(receiver_id) = receiver_id AND 
        prev(order_id) = order_id AND 
        prev(message) = message
    ));

-- Create index on order_id for faster queries
CREATE INDEX IF NOT EXISTS messages_order_id_idx ON public.messages(order_id);

-- Create index on sender_id for faster queries
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);

-- Create index on receiver_id for faster queries
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);

-- Create index on read status for faster queries
CREATE INDEX IF NOT EXISTS messages_read_idx ON public.messages(read);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); 