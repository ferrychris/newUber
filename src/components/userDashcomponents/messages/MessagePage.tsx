import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaUser } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabaseClient';
import { Message as MessageType, MessageThread } from './types';
import Message from './Message';
import MessageThreadList from './MessageThreadList';

interface OrderData {
  id: string;
  user_id: string;
  driver_id: string;
  services: {
    name: string;
  };
  created_at: string;
}

interface UnreadMessage {
  id: string;
  order_id: string;
}

interface Profile {
  id: string;
  full_name: string;
  profile_image?: string;
}

interface MessagePageProps {
  isDriver?: boolean;
}

const MessagePage: React.FC<MessagePageProps> = ({ isDriver = false }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessageThreads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError(t('common.authError'));
        return;
      }

      // Fetch orders with messages
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messageError) throw messageError;

      if (messageData && messageData.length > 0) {
        // Get unique order IDs
        const uniqueOrderIds = [...new Set(messageData.map((msg: MessageType) => msg.order_id))];
        
        // Fetch order details for each order with messages
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*, services(*)')
          .in('id', uniqueOrderIds)
          .order('created_at', { ascending: false });
          
        if (orderError) throw orderError;
        
        if (orderData) {
          // Fetch unread message counts
          const { data: unreadData } = await supabase
            .from('messages')
            .select('id, order_id')
            .eq('receiver_id', user.id)
            .eq('read', false)
            .in('order_id', uniqueOrderIds);
            
          const unreadCounts: {[key: string]: number} = {};
          
          if (unreadData) {
            unreadData.forEach((message: UnreadMessage) => {
              if (!unreadCounts[message.order_id]) {
                unreadCounts[message.order_id] = 0;
              }
              unreadCounts[message.order_id]++;
            });
          }
          
          // Fetch the other participant's info for each thread
          const threads = await Promise.all(orderData.map(async (order: OrderData) => {
            const isCustomer = order.user_id === user.id;
            const otherParticipantId = isCustomer ? order.driver_id : order.user_id;
            
            let otherParticipant: Profile = { id: '', full_name: 'Unknown User' };
            
            if (otherParticipantId) {
              const { data: userData } = await supabase
                .from('users')
                .select('id, full_name, profile_image')
                .eq('id', otherParticipantId)
                .single();
                
              if (userData) {
                otherParticipant = userData;
              }
            }
            
            const messages = messageData as MessageType[];
            const latestMessage = messages
              .filter(msg => msg.order_id === order.id)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            
            return {
              order: {
                id: order.id,
                services: order.services,
                created_at: order.created_at
              },
              otherParticipant,
              latestMessage: {
                created_at: latestMessage?.created_at || order.created_at
              },
              unreadCount: unreadCounts[order.id] || 0
            } as MessageThread;
          }));
          
          setMessageThreads(threads);
        }
      }
    } catch (error) {
      console.error('Error fetching message threads:', error);
      setError(t('messages.errorFetching'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMessageThreads();
  }, [fetchMessageThreads]);

  const handleCloseMessage = useCallback(() => {
    setSelectedThread(null);
    fetchMessageThreads();
  }, [fetchMessageThreads]);

  if (selectedThread) {
    return (
      <Message
        orderId={selectedThread.order.id}
        receiverId={selectedThread.otherParticipant.id}
        isDriver={isDriver}
        onClose={handleCloseMessage}
      />
    );
  }

  return (
    <div className="container mx-auto pb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center mb-4">
          <FaUser className="text-xl mr-2 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('Messages')}
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {t('sub')}
        </p>
      </motion.div>

      <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden">
        <MessageThreadList 
          threads={messageThreads}
          onSelectThread={setSelectedThread}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
};

export default MessagePage;
