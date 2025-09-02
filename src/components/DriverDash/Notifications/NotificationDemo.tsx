import React, { useState } from 'react';
import { Bell, DollarSign, Package, MessageCircle, Play, Settings } from 'lucide-react';
import { useNotifications } from '../../../hooks/useNotifications';
import { showNotification } from '../../../utils/notificationUtils';

export const NotificationDemo: React.FC = () => {
  const { addNotification, notifications, unreadCount } = useNotifications();
  const [demoRunning, setDemoRunning] = useState(false);

  const runDemo = async () => {
    setDemoRunning(true);
    
    // Demo wallet notification
    setTimeout(() => {
      addNotification({
        type: 'wallet',
        title: 'Wallet Top-up',
        message: 'Your wallet has been topped up with $25.00',
        data: { amount: 25.00, type: 'deposit' }
      });
      showNotification('Demo: Wallet topped up with $25.00', 'success');
    }, 1000);

    // Demo order notification
    setTimeout(() => {
      addNotification({
        type: 'order',
        title: 'Order Status Update',
        message: 'Order #ABC12345 status changed to delivered',
        data: { orderId: 'ABC12345', status: 'delivered' }
      });
      showNotification('Demo: Order #ABC12345 delivered', 'info');
    }, 3000);

    // Demo message notification
    setTimeout(() => {
      addNotification({
        type: 'message',
        title: 'New Message',
        message: 'You have received a new message from support',
        data: { sender: 'Support Team' }
      });
      showNotification('Demo: New message from support', 'info');
      setDemoRunning(false);
    }, 5000);
  };

  return (
    <div className="p-6 bg-white dark:bg-midnight-800 rounded-lg shadow-lg border border-gray-200 dark:border-stone-700/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Notification System Demo
        </h2>
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-blue-500" />
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Wallet Notification Demo */}
          <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                Wallet Notifications
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400">
              Alerts for earnings and deposits
            </p>
          </div>

          {/* Order Notification Demo */}
          <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Order Notifications
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Status updates for your orders
            </p>
          </div>

          {/* Message Notification Demo */}
          <div className="p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <div className="flex items-center space-x-2 mb-2">
              <MessageCircle className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                Message Notifications
              </span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-400">
              New messages from support/customers
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-4 pt-4">
          <button
            onClick={runDemo}
            disabled={demoRunning}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4" />
            <span>{demoRunning ? 'Running Demo...' : 'Run Notification Demo'}</span>
          </button>
        </div>

        {/* Current Notifications Display */}
        {notifications.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Recent Notifications ({notifications.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    !notification.read
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-midnight-700 dark:border-stone-600'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-1">
                      {notification.type === 'wallet' && <DollarSign className="h-4 w-4 text-green-500" />}
                      {notification.type === 'order' && <Package className="h-4 w-4 text-blue-500" />}
                      {notification.type === 'message' && <MessageCircle className="h-4 w-4 text-purple-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-stone-300">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 dark:bg-midnight-700 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Settings className="h-4 w-4 text-gray-600 dark:text-stone-300" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              How to Use
            </span>
          </div>
          <ul className="text-xs text-gray-600 dark:text-stone-300 space-y-1">
            <li>• Click the bell icon in the navbar to view notifications</li>
            <li>• Use the settings gear to customize notification preferences</li>
            <li>• Notifications include sound alerts and toast messages</li>
            <li>• Real-time updates for wallet, orders, and messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
