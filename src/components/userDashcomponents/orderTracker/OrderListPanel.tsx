import React, { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { FaTruck, FaShoppingBag, FaSpinner, FaUser, FaPhoneAlt, FaWallet, FaMoneyBill } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../../utils/i18n';
import { getStatusConfig } from '../orders/utils';

interface OrderListPanelProps {
  orders: any[];
  isLoading: boolean; // Combined initial loading state
  isLoadingOrders: boolean;
  error: string | null;
  selectedOrder: any | null;
  driverDetails: any | null;
  handleSelectOrder: (order: any) => void;
}

// Create a memoized Order item component to prevent unnecessary re-renders
const OrderItem = memo(({ 
  order, 
  isSelected, 
  onSelect, 
  getOrderStatus 
}: { 
  order: any; 
  isSelected: boolean; 
  onSelect: () => void; 
  getOrderStatus: (status: string) => JSX.Element;
}) => {
  const { t } = useTranslation();
  
  return (
    <div
      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors ${
        isSelected ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${order.services?.name === 'Shopping' ? 'bg-sunset-500/10' : order.services?.name === 'Parcels' ? 'bg-blue-500/10' : 'bg-teal-500/10'}`}>
            {order.services?.name === 'Shopping' ? (
              <FaShoppingBag className={`w-4 h-4 ${order.services?.name === 'Shopping' ? 'text-sunset-500' : order.services?.name === 'Parcels' ? 'text-blue-500' : 'text-teal-500'}`} />
            ) : (
              <FaTruck className={`w-4 h-4 ${order.services?.name === 'Shopping' ? 'text-sunset-500' : order.services?.name === 'Parcels' ? 'text-blue-500' : 'text-teal-500'}`} />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {order.services?.name || 'Delivery'}
            </p>
            <div className="mt-1">
              {getOrderStatus(order.status)}
            </div>
            <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
              {formatDate(new Date(order.created_at).toISOString().split('T')[0])}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {formatCurrency(order.estimated_price)}
          </p>
          <div className="flex items-center text-xs mt-1 text-gray-500">
            {order.payment_method === 'wallet' ? (
              <>
                <FaWallet className="w-3 h-3 text-purple-500 mr-1" />
                <span>{t('payment.wallet')}</span>
              </>
            ) : (
              <>
                <FaMoneyBill className="w-3 h-3 text-green-500 mr-1" />
                <span>{t('payment.cash')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Use memo to prevent unnecessary re-renders of OrderListPanel
const OrderListPanel: React.FC<OrderListPanelProps> = memo(({ 
  orders,
  isLoading,
  isLoadingOrders,
  error,
  selectedOrder,
  driverDetails,
  handleSelectOrder,
}) => {
  const { t } = useTranslation();
  const [visibleOrders, setVisibleOrders] = useState(10); // Initially display 10 orders

  // Moved getOrderStatus here for encapsulation
  const getOrderStatus = useCallback((status: string) => {
    const statusConfig = getStatusConfig(status);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
        {t(`status.${status}`)}
      </span>
    );
  }, [t]);

  // Function to load more orders (pagination)
  const loadMoreOrders = () => {
    setVisibleOrders(prev => Math.min(prev + 10, orders.length));
  };

  // Get only the visible portion of orders
  const displayedOrders = orders.slice(0, visibleOrders);

  return (
    <div className="lg:col-span-1">
      <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-stone-700/20">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('tracking.activeOrders')}
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-stone-700/20 max-h-[400px] overflow-y-auto">
          {/* Loading indicator for order list */}
          {isLoadingOrders && (
            <div className="flex justify-center items-center py-4">
              <FaSpinner className="animate-spin text-purple-500 h-6 w-6" />
            </div>
          )}

          {/* Error message */}
          {error && !isLoadingOrders && (
             <div className="text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
               {error}
             </div>
          )}

          {/* Order list or empty state */}
          {!isLoading && !isLoadingOrders && orders.length === 0 && !error && (
            <div className="text-center text-gray-500 dark:text-gray-400 p-6">
              <FaShoppingBag className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm">{t('tracking.noOrders')}</p>
              <p className="text-xs text-gray-400 dark:text-stone-500">{t('tracking.noOrdersMessageList')}</p>
            </div>
          )}
          
          {!isLoadingOrders && displayedOrders.length > 0 && (
            <div className="flex-1">
              {displayedOrders.map((order) => (
                <OrderItem
                  key={order.id}
                  order={order}
                  isSelected={selectedOrder?.id === order.id}
                  onSelect={() => handleSelectOrder(order)}
                  getOrderStatus={getOrderStatus}
                />
              ))}
              
              {/* Load more button - only show if there are more orders to load */}
              {visibleOrders < orders.length && (
                <div className="p-3 text-center">
                  <button 
                    onClick={loadMoreOrders}
                    className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium"
                  >
                    {t('common.loadMore')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Driver info - kept within this panel as it relates to the selected order */} 
      {selectedOrder && driverDetails && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-4"
        >
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            {t('tracking.driverInfo')}
          </h3>
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-midnight-700 flex items-center justify-center overflow-hidden">
              {driverDetails.profile_image ? (
                <img 
                  src={driverDetails.profile_image} 
                  alt={driverDetails.full_name}
                  className="h-full w-full object-cover"
                  loading="lazy" // Add lazy loading for images
                />
              ) : (
                <FaUser className="h-6 w-6 text-gray-400 dark:text-gray-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {driverDetails.full_name}
              </p>
              <div className="flex items-center text-sm text-gray-500 dark:text-stone-400 mt-1">
                <FaPhoneAlt className="w-3 h-3 mr-1" />
                {driverDetails.phone || t('common.notAvailable')}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});

// Add display name for better debugging
OrderListPanel.displayName = 'OrderListPanel';
OrderItem.displayName = 'OrderItem';

export default OrderListPanel;