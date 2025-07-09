import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabaseClient';
import { markOrderMessagesAsRead } from '../../utils/chatUtils';

// Define how the raw message data comes from Supabase
interface RawMessageData {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
  is_system_message: boolean;
  profiles: any; // This can be different shapes depending on the join
}

// Define our cleaned up message model
interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
  sender_name: string;
  is_system_message: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  userId: string;
  driverId?: string;
  driverName?: string;
  orderDetails?: {
    pickup_location: string;
    dropoff_location: string;
    status: string;
  };
}

const ChatModal: React.FC<ChatModalProps> = ({ 
  isOpen, 
  onClose, 
  orderId, 
  userId, 
  driverId,
  driverName,
  orderDetails
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch messages for this order
  useEffect(() => {
    if (!isOpen || !orderId) return;
    
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        // Get messages for this order (without join)
        const { data: messagesData, error } = await supabase
          .from('support_messages')
          .select(`
            id,
            order_id,
            sender_id,
            receiver_id,
            message,
            created_at,
            read,
            is_system_message
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        // Mark messages as read
        await markOrderMessagesAsRead(orderId);
        
        // Create a set of unique sender IDs to fetch their profiles
        const senderIds = Array.from(new Set((messagesData || []).map(msg => msg.sender_id)));
        
        // Fetch profiles separately for all sender IDs
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Continue even if profiles fetch fails
        }
        
        // Create a map of sender IDs to names
        const senderNames: Record<string, string> = {};
        (profilesData || []).forEach(profile => {
          senderNames[profile.id] = profile.full_name || 'Unknown';
        });
        
        // Format messages with sender name
        const formattedMessages = (messagesData || []).map(rawMsg => {
          const rawMessage = rawMsg as RawMessageData;
          
          // Get sender name from the map, or use fallbacks
          const senderName = senderNames[rawMessage.sender_id] || 
            (rawMessage.sender_id === driverId ? (driverName || 'Driver') : 'Customer');
          
          // Create our cleaned up message object
          const message: Message = {
            id: rawMessage.id,
            order_id: rawMessage.order_id,
            sender_id: rawMessage.sender_id,
            receiver_id: rawMessage.receiver_id,
            message: rawMessage.message,
            created_at: rawMessage.created_at,
            read: rawMessage.read,
            is_system_message: rawMessage.is_system_message,
            sender_name: senderName
          };
          
          return message;
        });
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Could not load messages');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel(`chat-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `order_id=eq.${orderId}`,
      }, async (payload) => {
        try {
          const rawMessage = payload.new as RawMessageData;
          
          // Try to get the sender name from profiles if possible
          let senderName = 'Unknown';
          try {
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', rawMessage.sender_id)
              .maybeSingle();
              
            if (senderData?.name) {
              senderName = senderData.name;
            } else {
              // Use fallback names if profile isn't found
              senderName = rawMessage.sender_id === driverId 
                ? (driverName || 'Driver') 
                : 'Customer';
            }
          } catch (profileError) {
            console.warn('Error fetching profile for message:', profileError);
            // Use fallback if profile fetch fails
            senderName = rawMessage.sender_id === driverId 
              ? (driverName || 'Driver') 
              : 'Customer';
          }
          
          // Create a properly typed message
          const newMessage: Message = {
            id: rawMessage.id,
            order_id: rawMessage.order_id,
            sender_id: rawMessage.sender_id,
            receiver_id: rawMessage.receiver_id,
            message: rawMessage.message,
            created_at: rawMessage.created_at,
            read: rawMessage.read,
            is_system_message: rawMessage.is_system_message,
            sender_name: senderName
          };
          
          // Play notification sound if message is from other person
          if (rawMessage.sender_id !== userId) {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Could not play notification sound:', e));
          }
          
          // Add new message to the list
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if from other person
          if (rawMessage.sender_id !== userId) {
            await markOrderMessagesAsRead(orderId);
          }
        } catch (error) {
          console.error('Error processing new message:', error);
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, orderId, userId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !driverId) return;
    
    setIsSending(true);
    try {
      console.log('Sending message with:', {
        orderId,
        senderId: userId,
        receiverId: driverId
      });
      
      // Make sure we have valid IDs
      if (!userId || !driverId) {
        throw new Error('Missing valid sender or receiver ID');
      }
      
      // Send message
      const { error } = await supabase
        .from('support_messages')
        .insert({
          order_id: orderId,
          sender_id: userId,
          receiver_id: driverId,
          message: newMessage.trim(),
          read: false,
          is_system_message: false
        });
        
      if (error) {
        console.error('Insert error details:', error);
        throw error;
      }
      
      // Clear input
      setNewMessage('');
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <motion.div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? '' : 'pointer-events-none'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black ${isOpen ? 'opacity-50' : 'opacity-0'} transition-opacity duration-200`} 
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div 
        className="relative bg-white dark:bg-midnight-900 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: isOpen ? 1 : 0.9, y: isOpen ? 0 : 20 }}
        transition={{ type: "spring", bounce: 0.3 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('Chat')} {driverName ? `- ${driverName}` : ''}
          </h3>
          
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Order details */}
        {orderDetails && (
          <div className="bg-gray-50 dark:bg-midnight-800 p-3 text-xs border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('Status')}: <span className="text-sunset">{t(`Status.${orderDetails.status}`)}</span></p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{t('Pickup')}: {orderDetails.pickup_location}</p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{t('Dropoff')}: {orderDetails.dropoff_location}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sunset"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400">
              {t('No messages yet')}
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`
                    max-w-[80%] rounded-lg px-4 py-2 
                    ${message.sender_id === userId 
                      ? 'bg-sunset text-white' 
                      : 'bg-gray-200 dark:bg-midnight-700 text-gray-900 dark:text-white'
                    }
                    ${message.is_system_message ? 'italic bg-gray-100 dark:bg-midnight-800 text-gray-600 dark:text-gray-400' : ''}
                  `}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {message.sender_id !== userId && message.sender_name}
                    {message.is_system_message && 'System'}
                  </div>
                  <p>{message.message}</p>
                  <div className="text-xs opacity-75 text-right mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t('Type a message...')}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sunset dark:bg-midnight-700 dark:text-white"
              disabled={isSending || !driverId}
            />
            <button
              type="submit"
              className="bg-sunset hover:bg-purple-600 text-white rounded-lg px-4 py-2 transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
              disabled={isSending || !newMessage.trim() || !driverId}
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <FaPaperPlane />
              )}
            </button>
          </div>
          {!driverId && (
            <p className="mt-2 text-xs text-red-500">
              {t('No driver assigned yet. You can send messages once a driver accepts your order.')}
            </p>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ChatModal;
