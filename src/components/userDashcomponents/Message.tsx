import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPaperPlane, FaSpinner, FaUser } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { supabase, getCurrentUser } from '../../utils/supabase';
import toast from 'react-hot-toast';

interface MessageProps {
  orderId: string;
  recipientId: string;
  isDriver: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

const Message: React.FC<MessageProps> = ({ orderId, recipientId, isDriver, onClose }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  
  // More robust validation of required props
  if (!orderId || !recipientId || orderId.trim() === '' || recipientId.trim() === '') {
    console.error("Message component missing or invalid required props:", { 
      orderId: orderId ?? 'undefined', 
      recipientId: recipientId ?? 'undefined',
      orderId_isEmpty: orderId?.trim() === '',
      recipientId_isEmpty: recipientId?.trim() === ''
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
      try {
        const userSessionStr = localStorage.getItem('userSession');
        if (userSessionStr) {
          try {
            const userSession = JSON.parse(userSessionStr);
            if (userSession && userSession.id) {
              setUserId(userSession.id);
              return;
            }
          } catch (e) {
            console.error("Error parsing localStorage session:", e);
          }
        }

        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
        } else {
          setError(t('common.authError'));
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
      if (!recipientId) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, profile_image')
          .eq('id', recipientId)
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
  }, [recipientId, t]);

  // Fetch existing messages
  useEffect(() => {
    if (!orderId || !userId) return;
    
    async function fetchMessages() {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('order_id', orderId)
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        if (data) {
          setMessages(data);
          
          // Mark messages as read
          const unreadMessages = data.filter(msg => 
            msg.recipient_id === userId && !msg.read
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
        console.error('Error fetching messages:', error);
        setError(t('messages.errorFetching'));
        toast.error(t('messages.errorFetching'));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMessages();
    
    // Subscribe to new messages with a unique channel name per order
    const messageSubscription = supabase
      .channel(`messages-${orderId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        // @ts-ignore
        const newMsg = payload.new as Message;
        if (newMsg.recipient_id === userId || newMsg.sender_id === userId) {
          setMessages(prev => [...prev, newMsg]);
          
          // Mark message as read if we're the recipient
          if (newMsg.recipient_id === userId) {
            supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMsg.id);
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
    if (!newMessage.trim() || !userId || !recipientId || !orderId) return;
    
    try {
      setIsSending(true);
      setError(null);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          order_id: orderId,
          sender_id: userId,
          recipient_id: recipientId,
          content: newMessage.trim(),
          read: false
        });
        
      if (error) throw error;
      
      setNewMessage('');
      toast.success(t('messages.sent'));
    } catch (error) {
      console.error('Error sending message:', error);
      setError(t('messages.errorSending'));
      toast.error(t('messages.errorSending'));
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
                      <p>{message.content}</p>
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

export default Message; 