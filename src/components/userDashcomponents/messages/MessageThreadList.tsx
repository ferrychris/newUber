import React from 'react';
import { FaUser } from 'react-icons/fa';
import { MessageThread } from './types';

interface MessageThreadListProps {
  threads: MessageThread[];
  onSelectThread: (thread: MessageThread) => void;
  isLoading: boolean;
  error: string | null;
}

const MessageThreadList: React.FC<MessageThreadListProps> = ({
  threads,
  onSelectThread,
  isLoading,
  error
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaUser className="text-indigo-600 dark:text-indigo-400 text-2xl" />
        </div>
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
          No Messages
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Your message threads will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-stone-700/20">
      {threads.map((thread) => (
        <div 
          key={thread.order.id}
          onClick={() => onSelectThread(thread)}
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
                    {thread.unreadCount} unread message{thread.unreadCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageThreadList;
