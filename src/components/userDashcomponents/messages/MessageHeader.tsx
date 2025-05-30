import React, { memo } from 'react';
import { FaTimes, FaBug } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ReceiverInfo } from './types';

interface MessageHeaderProps {
  receiverInfo: ReceiverInfo | null;
  isDriver: boolean;
  onClose: () => void;
  onToggleDebug: () => void;
}

const MessageHeader: React.FC<MessageHeaderProps> = memo(({ 
  receiverInfo, 
  isDriver, 
  onClose, 
  onToggleDebug 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-stone-600/10 bg-purple-600 text-white">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center overflow-hidden">
          {receiverInfo?.image ? (
            <img 
              src={receiverInfo.image} 
              alt={receiverInfo.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="h-5 w-5 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {receiverInfo?.name || (isDriver ? t('messages.customer') : t('messages.driver'))}
          </h2>
          <p className="text-xs text-white/80">
            {t('messages.orderConversation')}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleDebug}
          className="p-2 text-white/80 hover:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
          title="Toggle Debug Panel"
        >
          <FaBug className="w-4 h-4" />
        </button>
        <button 
          className="p-2 text-white/80 hover:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

export default MessageHeader;
