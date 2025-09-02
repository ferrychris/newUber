import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBug, FaSpinner, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

// Import components
import MessageHeader from './messages/MessageHeader';
import MessageInput from './messages/MessageInput';
import MessageList from './messages/MessageList';
import MessageThreadList from './messages/MessageThreadList';
import DebugPanel from './messages/DebugPanel';

// Import types with alias to avoid naming conflict
import { Message as MessageType, MessageProps, MessageThread } from './messages/types';

// Re-export types
export type { Message as MessageType } from './messages/types';

type DebugInfo = {
  authLoading: boolean;
  hasAuthUser: boolean;
  userId: string | null;
  error: string | null;
};

/**
 * Main Message component that composes together all the modular message components.
 */
const MessageComponent: React.FC<MessageProps> = ({
  orderId,
  receiverId,
  isDriver,
  onClose
}) => {
  const { t } = useTranslation();
  const { user: authUser, loading: authLoading } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const toggleDebug = () => {
    setShowDebug(prev => !prev);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || !authUser?.id || !orderId || !receiverId) {
      console.warn('Cannot send message - missing required data');
      return;
    }

    try {
      setIsSending(true);

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          order_id: orderId,
          sender_id: authUser.id,
          receiver_id: receiverId,
          message: messageText,
          read: false,
        }])
        .select();

      if (error) throw error;

      // The MessageList component will handle the new message via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('messages.errorSendingMessage'));
    } finally {
      setIsSending(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  // Initialize threads and messages with empty arrays to prevent undefined errors
  const threads: any[] = [];
  const messages: any[] = [];
  const isLoading = false;
  const error = null;
  
  // Placeholder functions
  const handleSelectThread = (thread: MessageThread) => {
    // Implement thread selection logic here
    console.log('Selected thread:', thread.order.id);
  };

  // Debug info
  const debugInfo: DebugInfo = {
    authLoading: authLoading || false,
    hasAuthUser: !!authUser,
    userId: authUser?.id || null,
    error: null,
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-stone-900 text-gray-800 dark:text-gray-200">
      {/* Debug toggle button */}
      <button
        onClick={toggleDebug}
        className="fixed bottom-4 right-4 z-50 p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Toggle debug panel"
      >
        <FaBug />
      </button>

      {/* Debug panel */}
      {showDebug && (
        <DebugPanel
          onClose={() => setShowDebug(false)}
          debugInfo={debugInfo}
        />
      )}

      <MessageHeader 
        onClose={onClose} 
        receiverInfo={{ name: 'Receiver Name' }} // Replace with actual receiver info
        isDriver={isDriver}
        onToggleDebug={toggleDebug}
      />

      <div className="flex-1 overflow-hidden flex">
        {/* Thread list */}
        <MessageThreadList
          threads={threads}
          onSelectThread={handleSelectThread}
          isLoading={isLoading}
          error={error}
        />

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
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
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};

export default MessageComponent;
