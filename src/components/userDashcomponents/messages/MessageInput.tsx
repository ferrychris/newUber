import React, { memo, useState } from 'react';
import { FaPaperPlane, FaSpinner } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface MessageInputProps {
  onSend: (message: string) => void;
  isSending: boolean;
}

const MessageInput: React.FC<MessageInputProps> = memo(({ 
  onSend, 
  isSending 
}) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-stone-600/10">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 p-2 rounded-full border border-gray-300 dark:border-stone-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-midnight-700 dark:text-white"
          placeholder={t('messages.typeMessage')}
          disabled={isSending}
        />
        <button
          type="submit"
          className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!message.trim() || isSending}
        >
          {isSending ? (
            <FaSpinner className="animate-spin h-5 w-5" />
          ) : (
            <FaPaperPlane className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );
});

export default MessageInput;
