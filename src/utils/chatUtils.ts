import { supabase } from './supabaseClient';

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
      .from('messages')
      .select('id')
      .eq('order_id', orderId)
      .is('read_at', null)
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
    const { error } = await supabase.rpc('mark_order_messages_read', {
      p_order_id: orderId
    });

    if (error) throw error;
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
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${orderId}`
      },
      onNewMessage
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};
