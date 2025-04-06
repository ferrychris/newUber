# Messaging System Setup

This document outlines the setup for the messaging system between drivers and customers in the delivery platform.

## Overview

The messaging system allows:
- Customers to message drivers for their active orders
- Drivers to message customers about order details, delivery issues, etc.
- Real-time message delivery using Supabase's real-time capabilities
- Message read status tracking
- Unread message indicators for each order

## Database Setup

1. Create the messages table in your Supabase project by running the migration script:
   ```
   supabase/migrations/20231115_create_messages_table.sql
   ```

   Alternatively, you can manually create the table with the following SQL:

   ```sql
   CREATE TABLE IF NOT EXISTS public.messages (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
       sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       content TEXT NOT NULL,
       read BOOLEAN NOT NULL DEFAULT FALSE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```

2. Enable Row Level Security for the messages table and set up policies:
   ```sql
   -- Enable RLS
   ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

   -- Create policy for viewing messages
   CREATE POLICY "Users can see their own messages" 
       ON public.messages 
       FOR SELECT 
       USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

   -- Create policy for sending messages
   CREATE POLICY "Users can create messages" 
       ON public.messages 
       FOR INSERT 
       WITH CHECK (auth.uid() = sender_id);

   -- Create policy for updating read status
   CREATE POLICY "Users can update read status on their messages" 
       ON public.messages 
       FOR UPDATE 
       USING (auth.uid() = recipient_id)
       WITH CHECK (auth.uid() = recipient_id AND (
           prev(sender_id) = sender_id AND 
           prev(recipient_id) = recipient_id AND 
           prev(order_id) = order_id AND 
           prev(content) = content
       ));
   ```

3. Create an RPC function to efficiently count unread messages:
   ```sql
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
   ```

4. Enable real-time for the messages table in your Supabase project:
   - Go to Database → Replication
   - Find the "messages" table
   - Enable "INSERT" real-time events

## Component Integration

The messaging system integrates with:

1. `OrderTracker.tsx` - Customer's view of active orders with messaging
2. Driver's view for active orders (to be implemented)

Each component shows a message button when an order has both a customer and a driver assigned. The button includes an unread message counter when there are unread messages.

## Translation Setup

Ensure your i18n translation files include messages-related strings. For English:

```json
{
  "translation": {
    "messages": {
      "chat": "Message",
      "noRecipient": "No recipient available for messaging",
      "orderConversation": "Order Conversation",
      "noMessages": "No messages yet. Start the conversation!",
      "typeMessage": "Type a message...",
      "customer": "Customer",
      "driver": "Driver"
    }
  }
}
```

## Usage Flow

1. A customer places an order
2. Once a driver accepts the order, both parties see a message button
3. Either party can initiate a conversation
4. Messages are delivered in real-time
5. Read status is updated when messages are viewed
6. Unread message counts are shown on the message button
7. Message history is preserved for the lifetime of the order

## Future Improvements

- Push notifications for new messages
- Message attachments (photos, location sharing)
- Message templates for common responses
- Message history export
- Admin message monitoring for dispute resolution 