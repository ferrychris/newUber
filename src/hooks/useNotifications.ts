import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { playNotificationSound, isTopUpTransaction, showNotification } from '../utils/notificationUtils';
import { shouldShowNotification } from '../utils/notificationPreferences';

interface Notification {
  id: string;
  type: 'wallet' | 'order' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Play notification sound
    playNotificationSound();
    
    return newNotification;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Subscription for wallet transactions (top-ups)
    const walletChannel = supabase
      .channel('wallet_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'wallet_transactions'
      }, async (payload) => {
        const transaction = payload.new;
        
        // Get driver's wallet (using the single wallets table with user_type)
        const { data: driverWallet, error: walletError } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', user.id)
          .eq('user_type', 'driver')
          .single();
          
        if (walletError) {
          console.error('Error fetching driver wallet:', walletError);
          return;
        }
        
        // Check if this transaction is for the driver's wallet and is a top-up
        if (transaction.wallet_id === driverWallet?.id && isTopUpTransaction(transaction as { type: string })) {
          if (shouldShowNotification('wallet')) {
            const amount = Math.abs(parseFloat(transaction.amount || '0')).toFixed(2);
            
            addNotification({
              type: 'wallet',
              title: 'Wallet Top-up',
              message: `Your wallet has been topped up with $${amount}`,
              data: { transaction }
            });
            
            // Show toast notification
            showNotification(`Wallet topped up: $${amount}`, 'success');
          }
        }
      })
      .subscribe();
      
    // Subscription for order status changes
    const orderChannel = supabase
      .channel('order_notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `driver_id=eq.${user?.id}`
      }, async (payload) => {
        const oldRecord = payload.old;
        const newRecord = payload.new;
        
        // Check if status changed
        if (oldRecord.status !== newRecord.status) {
          if (shouldShowNotification('order')) {
            const orderId = newRecord.id.substring(0, 8);
            
            addNotification({
              type: 'order',
              title: 'Order Status Update',
              message: `Order #${orderId} status changed to ${newRecord.status}`,
              data: { order: newRecord, oldStatus: oldRecord.status }
            });
            
            // Show toast notification
            showNotification(`Order #${orderId} status changed to ${newRecord.status}`, 'info');
          }
        }
      })
      .subscribe();

    // Subscription for new messages (using the support_messages table)
    const messageChannel = supabase
      .channel('message_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `receiver_id=eq.${user?.id}`
      }, (payload) => {
        if (shouldShowNotification('message')) {
          const message = payload.new;
          
          addNotification({
            type: 'message',
            title: 'New Message',
            message: message.message || 'You have received a new message',
            data: { message }
          });
        }
      })
      .subscribe();

    return () => {
      walletChannel.unsubscribe();
      orderChannel.unsubscribe();
      messageChannel.unsubscribe();
    };
  }, [user?.id, addNotification]);

  // Update unread count when notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};
