import React, { memo } from 'react';
import { Message } from './types';
import { IoInformationCircle } from 'react-icons/io5';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(({ 
  message, 
  isOwnMessage 
}) => {
  // If it's a system message, we apply special styling
  if (message.is_system_message) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg px-4 py-2 max-w-[90%] flex items-center shadow-sm">
          <IoInformationCircle className="text-blue-500 mr-2 text-lg flex-shrink-0" />
          <div>
            <p className="text-sm">{message.message}</p>
            <p className="text-xs mt-1 text-blue-600/70 dark:text-blue-300/70">
              {formatTime(message.created_at)}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Regular message styling
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`rounded-lg px-4 py-2 max-w-[80%] break-words ${
          isOwnMessage
            ? 'bg-purple-500 text-white'
            : 'bg-white dark:bg-midnight-600 text-gray-800 dark:text-white border border-gray-200 dark:border-stone-600/10'
        }`}
      >
        <p>{message.message}</p>
        <p className={`text-xs mt-1 ${
          isOwnMessage
            ? 'text-purple-100'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
});

export default MessageBubble;
