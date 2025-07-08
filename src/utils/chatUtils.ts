import { supabase } from './supabaseClient';

// Default system welcome messages for orders
const WELCOME_MESSAGE_TEMPLATE = 'Your driver has been assigned. You can use this chat to communicate directly regarding your order.';

interface ChatNotification {
  id: string;
  order_id: string;
  message_count: number;
  last_message: string;
  sender_name: string;
  updated_at: string;
}

// Get unread message count for a specific order
export const getUnreadMessageCount = async (orderId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('id')
      .eq('order_id', orderId)
      .eq('read', false) // Use 'read' column instead of 'read_at'
      .not('sender_id', 'eq', (await supabase.auth.getUser()).data.user?.id);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
};

// Mark all messages in an order as read
export const markOrderMessagesAsRead = async (orderId: string): Promise<void> => {
  try {
    // Get the current user ID
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    // Update messages where:  
    // - the order ID matches
    // - the message is sent to the current user (they are the receiver)
    // - the message is currently unread
    const { error } = await supabase
      .from('support_messages')
      .update({ read: true })
      .eq('order_id', orderId)
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) throw error;
    console.log(`Marked messages as read for order ${orderId}`);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Get chat notifications for all orders
export const getChatNotifications = async (): Promise<ChatNotification[]> => {
  try {
    const { data, error } = await supabase.rpc('get_chat_notifications');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting chat notifications:', error);
    return [];
  }
};

// Subscribe to new messages for an order
export const subscribeToMessages = (
  orderId: string,
  onNewMessage: () => void
) => {
  const subscription = supabase
    .channel('support_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `order_id=eq.${orderId}`
      },
      onNewMessage
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

/**
 * Initiates a chat conversation between driver and customer when an order is accepted
 * @param orderId ID of the order
 * @param driverId ID of the driver assigned to the order
 * @param customerId ID of the customer who placed the order
 * @param customMessage Optional custom message (falls back to default template)
 * @returns Promise that resolves to true if successful, false otherwise
 */
export const initiateOrderChat = async (
  orderId: string,
  driverId: string,
  customerId: string,
  customMessage?: string
): Promise<boolean> => {
  try {
    console.log(`Initiating chat for order ${orderId} between driver ${driverId} and customer ${customerId}`);
    
    if (!orderId || !driverId || !customerId) {
      console.error('Missing required parameters for chat initiation:', { orderId, driverId, customerId });
      return false;
    }
    
    // Check if a message already exists for this order to avoid duplicate welcome messages
    const { data: existingMessages, error: checkError } = await supabase
      .from('support_messages')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);

    if (checkError) {
      console.error('Error checking for existing messages:', checkError);
      return false;
    }

    // If messages already exist, don't send a new welcome message
    if (existingMessages && existingMessages.length > 0) {
      console.log('Chat already initiated for this order, skipping welcome message');
      return true; // Success but no action needed
    }

    // Prepare the system welcome message
    const welcomeMessage = customMessage || WELCOME_MESSAGE_TEMPLATE;
    
    // For system-initiated messages (like automatic chat creation when driver accepts an order),
    // we'll use the driver as the sender since they triggered the status change
    const { error: sendError } = await supabase
      .from('support_messages')
      .insert({
        order_id: orderId,
        sender_id: driverId,
        receiver_id: customerId,
        message: welcomeMessage,
        read: false,
        is_system_message: true // Mark as system message since it's automatically generated
      });

    if (sendError) {
      console.error('Error sending welcome message:', sendError);
      return false;
    }

    console.log(`Successfully initiated chat for order ${orderId}`);
    return true;
  } catch (error) {
    console.error('Error initiating order chat:', error);
    return false;
  }
};
