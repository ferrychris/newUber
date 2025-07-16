import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { Message as MessageType, ReceiverInfo, DebugInfo } from './types';
import MessageHeader from './MessageHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import DebugPanel from './DebugPanel';

interface MessageProps {
  orderId: string;
  receiverId: string;
  isDriver: boolean;
  onClose: () => void;
}

const Message: React.FC<MessageProps> = ({ orderId, receiverId, isDriver, onClose }) => {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [receiverInfo, setReceiverInfo] = useState<ReceiverInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Debug info
  const debugInfo: DebugInfo = {
    authLoading: !authUser,
    hasAuthUser: !!authUser,
    userId: authUser?.id || null,
    error
  };

  // Fetch receiver info
  const fetchReceiverInfo = useCallback(async () => {
    if (!receiverId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image')
        .eq('id', receiverId)
        .single();

      if (error) throw error;

      if (data) {
        setReceiverInfo({
          name: data.full_name || 'Unknown User',
          image: data.profile_image
        });
      }
    } catch (error) {
      console.error('Error in fetchReceiverInfo:', error);
      toast.error(t('messages.errorFetchingReceiver'));
    }
  }, [receiverId, t]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!orderId || !authUser?.id) {
      setIsLoading(false);
      const errorMsg = t('messages.missingData');
      setError(errorMsg);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data) {
        const validMessages = data.map(item => ({
          ...item,
          read: item.read ?? false
        })) as MessageType[];
        
        setMessages(validMessages);
        
        // Mark unread messages as read
        const unreadMessages = validMessages.filter(msg => 
          msg.receiver_id === authUser.id && !msg.read
        );
        
        if (unreadMessages.length > 0) {
          try {
            const unreadIds = unreadMessages.map(msg => msg.id);
            await supabase
              .from('messages')
              .update({ read: true })
              .in('id', unreadIds);
          } catch (updateError) {
            console.error('Error marking messages as read:', updateError);
            // Continue processing - this is not a critical error
          }
        }
      } else {
        // No messages found is not an error
        setMessages([]);
      }
    } catch (error) {
      const errorMessage = (error as any)?.message || 'Unknown error fetching messages';
      console.error('Error in fetchMessages:', error);
      const displayError = `${t('messages.errorFetching')}: ${errorMessage}`;
      setError(displayError);
      toast.error(displayError);
      // Set empty array to avoid undefined errors in rendering
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, authUser?.id, t]);

  useEffect(() => {
    if (!window.GLOBAL_SUBSCRIPTIONS) {
      window.GLOBAL_SUBSCRIPTIONS = new Map<string, any>();
    }
  }, []);

  useEffect(() => {
    if (!orderId || !authUser?.id) return;
    
    const channelName = `public:messages:order_id=eq.${orderId}`;
    let unsubscribeFn: (() => void) | null = null;
    
    const subscriptionRegistry = window.GLOBAL_SUBSCRIPTIONS;
    
    let existingSubscription = subscriptionRegistry.get(channelName);
    
    if (!existingSubscription) {
      console.log(`Creating new subscription for channel: ${channelName}`);
      
      const channel = supabase.channel(`messages-${orderId}`);
      
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `order_id=eq.${orderId}`
          },
          async (payload) => {
            const newMsg = payload.new as MessageType;
            
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) {
                return prev;
              }
              return [...prev, { ...newMsg, read: newMsg.read ?? false }];
            });
            
            if (newMsg.receiver_id === authUser.id && !newMsg.read) {
              try {
                await supabase
                  .from('messages')
                  .update({ read: true })
                  .eq('id', newMsg.id);
              } catch (error) {
                console.error('Error marking subscribed message as read:', error);
              }
            }
          }
        )
        .subscribe();
      
      existingSubscription = {
        channel,
        refCount: 0,
        unsubscribe: () => {
          channel.unsubscribe();
          subscriptionRegistry.delete(channelName);
          console.log(`Removed subscription for ${channelName}`);
        }
      };
      
      subscriptionRegistry.set(channelName, existingSubscription);
    } else {
      console.log(`Reusing existing subscription for channel: ${channelName}`);
    }
    
    existingSubscription.refCount += 1;
    console.log(`Subscription ref count for ${channelName}: ${existingSubscription.refCount}`);
    
    unsubscribeFn = () => {
      const subscription = subscriptionRegistry.get(channelName);
      if (subscription) {
        subscription.refCount -= 1;
        console.log(`Decreased ref count for ${channelName} to ${subscription.refCount}`);
        
        if (subscription.refCount <= 0) {
          subscription.unsubscribe();
        }
      }
    };
    
    return () => {
      if (unsubscribeFn) unsubscribeFn();
    };
  }, [orderId, authUser?.id, fetchMessages, t]);

  // Handle sending a new message
  const handleSendMessage = async (messageText: string) => {
    if (!authUser?.id || !receiverId || !orderId) {
      const errorMsg = t('messages.errorMissingData');
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    try {
      setIsSending(true);
      setError(null);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          order_id: orderId,
          sender_id: authUser.id,
          receiver_id: receiverId,
          message: messageText,
          read: false
        });
        
      if (error) throw error;
      
      // Only show success toast for UI feedback
      toast.success(t('messages.sent'));
      
      // No need to manually add the message to the state since the subscription will handle it
    } catch (error) {
      const errorMessage = (error as any)?.message || 'Unknown error sending message';
      console.error('Error in handleSendMessage:', error);
      const displayError = `${t('messages.errorSending')}: ${errorMessage}`;
      setError(displayError);
      toast.error(displayError);
    } finally {
      setIsSending(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  // Initial data fetch
  useEffect(() => {
    fetchReceiverInfo();
    fetchMessages();
  }, [fetchReceiverInfo, fetchMessages]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-midnight-800 rounded-xl shadow-xl overflow-hidden max-w-lg w-full border border-gray-200 dark:border-stone-600/10"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageHeader 
            receiverInfo={receiverInfo}
            isDriver={isDriver}
            onClose={onClose}
            onToggleDebug={() => setShowDebug(!showDebug)}
          />
          
          <MessageList 
            messages={messages}
            currentUserId={authUser?.id}
            isLoading={isLoading}
            error={error}
          />
          
          <MessageInput
            onSend={handleSendMessage}
            isSending={isSending}
          />

          {showDebug && (
            <DebugPanel
              onClose={() => setShowDebug(false)}
              debugInfo={debugInfo}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Message;
