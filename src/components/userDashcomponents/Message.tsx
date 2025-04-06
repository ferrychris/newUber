import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPaperPlane, FaSpinner, FaUser } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { supabase, getCurrentUser } from '../../utils/supabase';
import toast from 'react-hot-toast';

interface MessageProps {
  orderId: string;
  receiverId: string;
  isDriver: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

const Message: React.FC<MessageProps> = ({ orderId, receiverId, isDriver, onClose }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  
  // More robust validation of required props
  if (!orderId || !receiverId || orderId.trim() === '' || receiverId.trim() === '') {
    console.error("Message component missing or invalid required props:", { 
      orderId: orderId ?? 'undefined', 
      receiverId: receiverId ?? 'undefined',
      orderId_isEmpty: orderId?.trim() === '',
      receiverId_isEmpty: receiverId?.trim() === ''
    });
    // Close the dialog safely after logging the error
    setTimeout(onClose, 0);
    return null;
  }
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recipientInfo, setRecipientInfo] = useState<{ name: string; image?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch current user
  useEffect(() => {
    async function fetchCurrentUser() {
      let fetchedUserId: string | null = null;
      try {
        const userSessionStr = localStorage.getItem('userSession');
        if (userSessionStr) {
          try {
            const userSession = JSON.parse(userSessionStr);
            if (userSession && userSession.id) {
              console.log('User ID from localStorage:', userSession.id);
              fetchedUserId = userSession.id;
              // Optional: Verify this ID is still valid with Supabase auth?
            } else {
               console.log('localStorage session found but no ID');
            }
          } catch (e) {
            console.error("Error parsing localStorage session:", e);
          }
        }

        // If not found or potentially invalid, fetch from Supabase auth
        if (!fetchedUserId) {
          console.log('Fetching user from Supabase auth...');
          const user = await getCurrentUser();
          if (user) {
            console.log('User ID from Supabase auth:', user.id);
            fetchedUserId = user.id;
          } else {
            console.error('Failed to get user from Supabase auth.');
            setError(t('common.authError'));
          }
        }

        if (fetchedUserId) {
          setUserId(fetchedUserId);
        } else {
          console.error('Could not determine valid User ID.');
          // Consider preventing message sending entirely if no valid ID
        }
      } catch (error) {
        console.error("Error getting user session:", error);
        setError(t('common.authError'));
      }
    }
    
    fetchCurrentUser();
  }, [t]);

  // Fetch recipient info
  useEffect(() => {
    async function fetchRecipientInfo() {
      if (!receiverId) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, profile_image')
          .eq('id', receiverId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setRecipientInfo({
            name: data.full_name || 'Unknown User',
            image: data.profile_image
          });
        }
      } catch (error) {
        console.error('Error fetching recipient details:', error);
        toast.error(t('messages.errorFetchingRecipient'));
      }
    }
    
    fetchRecipientInfo();
  }, [receiverId, t]);

  // Fetch existing messages
  useEffect(() => {
    if (!orderId || !userId) return;
    
    async function fetchMessages() {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('messages')
          .select('id, order_id, sender_id, receiver_id, message, created_at, read')
          .eq('order_id', orderId)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: true });
          
        if (error) {
          console.error('Supabase fetch error:', error);
          throw error;
        }
        
        if (data) {
          const validMessages = data.map(item => ({
            ...item,
            read: item.read ?? false
          })) as Message[];
          setMessages(validMessages);
          
          const unreadMessages = validMessages.filter(msg => 
            msg.receiver_id === userId && !msg.read
          );
          
          if (unreadMessages.length > 0) {
            const unreadIds = unreadMessages.map(msg => msg.id);
            const { error: updateError } = await supabase
              .from('messages')
              .update({ read: true })
              .in('id', unreadIds);
              
            if (updateError) {
              console.error('Error marking messages as read:', updateError);
            }
          }
        }
      } catch (error) {
        const errorMessage = (error as any)?.message || 'Unknown error fetching messages';
        console.error('Error fetching messages:', errorMessage);
        setError(t('messages.errorFetching'));
        toast.error(`${t('messages.errorFetching')}: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMessages();
    
    const messageSubscription = supabase
      .channel(`messages-${orderId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg && newMsg.receiver_id && (newMsg.receiver_id === userId || newMsg.sender_id === userId)) {
          setMessages(prev => [...prev, { ...newMsg, read: newMsg.read ?? false }]);
          
          if (newMsg.receiver_id === userId) {
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMsg.id)
              .then(({ error }) => {
                 if (error) console.error('Error marking subscribed message as read:', error);
              });
          }
        }
      })
      .subscribe();
      
    return () => {
      messageSubscription.unsubscribe();
    };
  }, [orderId, userId, t]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    // Log the state right before attempting to send
    console.log('Attempting to send message with:', {
      newMessage: newMessage.trim(),
      userId, // Current sender ID state
      receiverId,
      orderId,
    });
    
    // Explicit check for userId before proceeding
    if (!newMessage.trim() || !userId || !receiverId || !orderId) {
      console.error('Cannot send message, missing required data.', {
         hasMessage: !!newMessage.trim(),
         hasUserId: !!userId,
         hasReceiverId: !!receiverId,
         hasOrderId: !!orderId,
      });
      toast.error(t('messages.errorMissingData')); // Add a translation key for this
      return;
    }
    
    try {
      setIsSending(true);
      setError(null);
      
      const messageData = {
        order_id: orderId,
        sender_id: userId, // This is the crucial value
        receiver_id: receiverId,
        message: newMessage.trim(),
        read: false
      };
      console.log('Inserting message data:', messageData);

      const { error } = await supabase
        .from('messages')
        .insert(messageData);
        
      if (error) throw error;
      
      setNewMessage('');
      toast.success(t('messages.sent'));
    } catch (error) {
      const errorMessage = (error as any)?.message || 'Unknown error sending message';
      console.error('Error sending message:', error); // Log the full error object
      setError(t('messages.errorSending'));
      toast.error(`${t('messages.errorSending')}: ${errorMessage}`);
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

  // Format date
  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-stone-600/10 bg-purple-600 text-white">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center overflow-hidden">
                {recipientInfo?.image ? (
                  <img 
                    src={recipientInfo.image} 
                    alt={recipientInfo.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaUser className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {recipientInfo?.name || (isDriver ? t('messages.customer') : t('messages.driver'))}
                </h2>
                <p className="text-xs text-white/80">
                  {t('messages.orderConversation')}
                </p>
              </div>
            </div>
            <button 
              className="p-2 text-white/80 hover:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
              onClick={onClose}
              aria-label="Close"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {/* Messages */}
          <div className="p-4 h-80 overflow-y-auto bg-gray-50 dark:bg-midnight-700/30">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <FaSpinner className="animate-spin text-purple-500 h-8 w-8" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400 text-center">
                <p>{t('messages.noMessages')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] break-words ${
                        message.sender_id === userId
                          ? 'bg-purple-500 text-white'
                          : 'bg-white dark:bg-midnight-600 text-gray-800 dark:text-white border border-gray-200 dark:border-stone-600/10'
                      }`}
                    >
                      <p>{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === userId
                          ? 'text-purple-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatMessageDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-stone-600/10">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                className="flex-1 p-2 rounded-full border border-gray-300 dark:border-stone-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-midnight-700 dark:text-white"
                placeholder={t('messages.typeMessage')}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
              />
              <button
                className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
                  <FaSpinner className="animate-spin h-5 w-5" />
                ) : (
                  <FaPaperPlane className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Create a MessagePage wrapper component for the dashboard route
const MessagePage: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [messageThreads, setMessageThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMessageThreads();
  }, []);

  const fetchMessageThreads = async () => {
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
        .select('order_id, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messageError) throw messageError;

      if (messageData && messageData.length > 0) {
        // Get unique order IDs
        const uniqueOrderIds = [...new Set(messageData.map(msg => msg.order_id))];
        
        // Fetch order details for each order with messages
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*, services(*)')
          .in('id', uniqueOrderIds)
          .order('created_at', { ascending: false });
          
        if (orderError) throw orderError;
        
        if (orderData) {
          // Fetch unread message counts - using a different approach without groupBy
          const { data: unreadData, error: unreadError } = await supabase
            .from('messages')
            .select('id, order_id')
            .eq('receiver_id', user.id)
            .eq('read', false)
            .in('order_id', uniqueOrderIds);
            
          const unreadCounts: {[key: string]: number} = {};
          
          if (!unreadError && unreadData) {
            // Process the data in JavaScript to count by order_id
            unreadData.forEach((message: any) => {
              if (!unreadCounts[message.order_id]) {
                unreadCounts[message.order_id] = 0;
              }
              unreadCounts[message.order_id]++;
            });
          }
          
          // Fetch the other participant's info for each thread
          const threads = await Promise.all(orderData.map(async (order) => {
            // Determine if this user is the customer or driver
            const isCustomer = order.user_id === user.id;
            const otherParticipantId = isCustomer ? order.driver_id : order.user_id;
            
            let otherParticipant = { full_name: 'Unknown User' };
            
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
            
            // Find the latest message for this order
            const latestMessage = messageData
              .filter(msg => msg.order_id === order.id)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            
            return {
              order,
              otherParticipant,
              latestMessage,
              unreadCount: unreadCounts[order.id] || 0
            };
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
  };

  const handleCloseMessage = () => {
    setSelectedThread(null);
    // Refresh the message threads to get updated unread counts
    fetchMessageThreads();
  };

  // If a specific thread is selected, show the message component
  if (selectedThread) {
    return (
      <Message
        orderId={selectedThread.order.id}
        receiverId={selectedThread.otherParticipant.id}
        isDriver={false}
        onClose={handleCloseMessage}
      />
    );
  }

  return (
    <div className="container mx-auto pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center mb-4">
          <FaUser className="text-xl mr-2 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('messages.title')}
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {t('messages.subtitle')}
        </p>
      </motion.div>

      {/* Main Content */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : messageThreads.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaUser className="text-indigo-600 dark:text-indigo-400 text-2xl" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              {t('messages.noMessages')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {t('messages.noMessagesDescription')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-stone-700/20">
            {messageThreads.map((thread, index) => (
              <div 
                key={thread.order.id}
                onClick={() => setSelectedThread(thread)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-midnight-700/30 cursor-pointer transition-colors duration-300"
              >
                <div className="flex items-start">
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-midnight-700 flex items-center justify-center overflow-hidden mr-4">
                    {thread.otherParticipant.profile_image ? (
                      <img 
                        src={thread.otherParticipant.profile_image} 
                        alt={thread.otherParticipant.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FaUser className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {thread.otherParticipant.full_name}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(thread.latestMessage.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                      Order: {thread.order.services?.name || 'Delivery'} - {thread.order.id.slice(0, 8)}
                    </p>
                    
                    {thread.unreadCount > 0 && (
                      <div className="mt-1 flex items-center">
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {thread.unreadCount}
                        </span>
                        <span className="ml-2 text-sm text-red-600 dark:text-red-400">
                          {t('messages.unreadMessages')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Update the export to use MessagePage for the dashboard route
export { MessagePage };
export default Message; 