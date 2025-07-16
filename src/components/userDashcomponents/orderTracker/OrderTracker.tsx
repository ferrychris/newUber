import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaSpinner } from 'react-icons/fa';
import { OrderTrackerProvider, useOrderTracker } from './OrderTrackerContext';
import OrderMapComponent from './OrderMapComponent';
import OrderListComponent from './OrderListComponent';
import OrderDetailsComponent from './OrderDetailsComponent';
import MessageDialogComponent from './MessageDialogComponent';

// Utility function for debouncing
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Inner component that uses the context
const OrderTrackerContent: React.FC = () => {
  const { t } = useTranslation();
  const { isLoading, error } = useOrderTracker();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
        <span className="ml-2 text-gray-700 dark:text-gray-300">{t('common.loading')}</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg text-red-800 dark:text-red-300">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column - Order list */}
      <div className="lg:col-span-1">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('tracking.yourOrders')}
        </h2>
        <OrderListComponent />
      </div>
      
      {/* Right column - Map and order details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Map */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('tracking.liveTracking')}
          </h2>
          <OrderMapComponent />
        </div>
        
        {/* Order details */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('tracking.orderDetails')}
          </h2>
          <OrderDetailsComponent />
        </div>
      </div>
      
      {/* Message dialog */}
      <MessageDialogComponent />
    </div>
  );
};

// Main component that provides the context
const OrderTracker: React.FC = () => {
  return (
    <OrderTrackerProvider>
      <OrderTrackerContent />
    </OrderTrackerProvider>
  );
};

export default OrderTracker;
