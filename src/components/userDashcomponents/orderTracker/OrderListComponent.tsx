import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaSpinner } from 'react-icons/fa';
import { useOrderTracker } from './OrderTrackerContext';
import { motion } from 'framer-motion';

const OrderListComponent: React.FC = () => {
  const { t } = useTranslation();
  const {
    orders,
    selectedOrder,
    selectOrder,
    isLoadingOrders,
    error,
    unreadMessageCounts
  } = useOrderTracker();

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status badge color based on order status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Render loading state
  if (isLoadingOrders) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-800 dark:text-red-300">
        <p>{error}</p>
      </div>
    );
  }

  // Render empty state
  if (orders.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-300">{t('tracking.noOrders')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {orders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all ${
              selectedOrder?.id === order.id 
                ? 'bg-indigo-100 dark:bg-indigo-900/40 border-l-4 border-indigo-500 dark:border-indigo-400 shadow-sm' 
                : ''
            }`}
            onClick={() => selectOrder(order)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(order.status)} ${selectedOrder?.id === order.id ? 'font-bold scale-105 transform' : ''}`}>
                    {formatStatus(order.status)}
                  </span>
                  
                  {/* Delivery confirmed indicator */}
                  {order.delivery_confirmed && (
                    <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {t('tracking.deliveryConfirmed')}
                    </span>
                  )}
                  
                  {/* Unread message indicator */}
                  {unreadMessageCounts[order.id] && unreadMessageCounts[order.id] > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {unreadMessageCounts[order.id]}
                    </span>
                  )}
                </div>
                
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {order.services?.name || t('tracking.orderTitle')} #{order.id.substring(0, 8)}
                </h3>
                
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(order.created_at)}
                </div>
                
                {/* Price display removed - min_price field doesn't exist in the database */}
              </div>
              
              {/* Service image removed as it doesn't exist in the database */}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default OrderListComponent;
