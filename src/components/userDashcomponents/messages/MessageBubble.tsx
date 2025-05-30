import React, { memo } from 'react';
import { Message } from './types';

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
