import React, { useState } from 'react';
import { Bell, X, Clock, DollarSign, Package, MessageCircle, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { NotificationSettings } from './NotificationSettings';

interface Notification {
  id: string;
  type: 'wallet' | 'order' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'wallet':
      return <DollarSign className="h-5 w-5 text-green-500" />;
    case 'order':
      return <Package className="h-5 w-5 text-blue-500" />;
    case 'message':
      return <MessageCircle className="h-5 w-5 text-purple-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-midnight-800 rounded-lg shadow-lg border border-gray-200 dark:border-stone-700/20 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-stone-700/20">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-midnight-700 rounded"
            title="Notification Settings"
          >
            <Settings className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-midnight-700 rounded"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-stone-400">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-stone-700/20">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-midnight-700 cursor-pointer ${
                  !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <NotificationIcon type={notification.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-stone-300 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-stone-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-stone-700/20">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
            View all notifications
          </button>
        </div>
      )}
      
      <NotificationSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
