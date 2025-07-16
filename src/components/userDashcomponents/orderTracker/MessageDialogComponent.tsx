import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSpinner, FaPaperPlane, FaTimes } from 'react-icons/fa';
import { supabase } from '../../../utils/supabase';
import { useOrderTracker } from './OrderTrackerContext';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read: boolean;
}

const MessageDialogComponent: React.FC = () => {
  const { t } = useTranslation();
  const {
    userId,
    showMessageDialog,
    setShowMessageDialog,
    messageReceiverId,
    selectedOrder,
    unreadMessageCounts,
    setUnreadMessageCounts
  } = useOrderTracker();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch messages when dialog opens
  useEffect(() => {
    if (showMessageDialog && userId && messageReceiverId) {
      fetchMessages();
      
      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id === messageReceiverId) {
            setMessages(prevMessages => [...prevMessages, newMessage]);
            markMessageAsRead(newMessage.id);
          }
        })
        .subscribe();
      
      // Clean up subscription
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [showMessageDialog, userId, messageReceiverId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Fetch messages between user and receiver
  const fetchMessages = async () => {
    if (!userId || !messageReceiverId) return;
    
    setIsLoading(true);
    
    try {
      // Fetch messages where user is sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .or(`sender_id.eq.${messageReceiverId},receiver_id.eq.${messageReceiverId}`)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        setIsLoading(false);
        return;
      }
      
      if (data) {
        // Filter messages to only include those between the user and receiver
        const filteredMessages = data.filter(msg => 
          (msg.sender_id === userId && msg.receiver_id === messageReceiverId) ||
          (msg.sender_id === messageReceiverId && msg.receiver_id === userId)
        );
        
        setMessages(filteredMessages);
        
        // Mark unread messages as read
        const unreadMessages = filteredMessages.filter(
          msg => msg.receiver_id === userId && !msg.read
        );
        
        if (unreadMessages.length > 0) {
          unreadMessages.forEach(msg => markMessageAsRead(msg.id));
          
          // Update unread message counts
          if (selectedOrder) {
            const newCounts = { ...unreadMessageCounts };
            newCounts[selectedOrder.id] = 0;
            setUnreadMessageCounts(newCounts);
          }
        }
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error in fetchMessages:', err);
      setIsLoading(false);
    }
  };
  
  // Mark a message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };
  
  // Send a new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !userId || !messageReceiverId) return;
    
    setIsSending(true);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: userId,
          receiver_id: messageReceiverId,
          read: false,
          order_id: selectedOrder?.id
        })
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        setIsSending(false);
        return;
      }
      
      if (data && data.length > 0) {
        setMessages(prevMessages => [...prevMessages, data[0] as Message]);
        setNewMessage('');
      }
      
      setIsSending(false);
    } catch (err) {
      console.error('Error in sendMessage:', err);
      setIsSending(false);
    }
  };
  
  // Format message timestamp
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <>
      {showMessageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
            {/* Dialog header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('messages.title')}
              </h3>
              <button
                onClick={() => setShowMessageDialog(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('messages.noMessages')}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.sender_id === userId
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === userId
                          ? 'text-indigo-200'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('messages.typePlaceholder')}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 flex items-center justify-center disabled:opacity-50"
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaPaperPlane />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageDialogComponent;
