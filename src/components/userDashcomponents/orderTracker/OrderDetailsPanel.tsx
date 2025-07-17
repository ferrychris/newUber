import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  FaInfoCircle, FaCalendarAlt, FaClock, FaCheck, 
  FaWallet, FaMoneyBill, FaComments, FaSpinner, FaTimes, FaCommentDots,
  FaBox, FaFlag, FaCar,
  FaMapMarkerAlt, FaCheckCircle
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../../utils/i18n';

// Import a custom Order type that matches what we're using in OrderTracker
interface Order {
  id: string;
  status: string;
  user_id: string;
  driver_id?: string;
  created_at: string;
  pickup_location?: string | [number, number];
  destination_location?: string | [number, number];
  services?: {
    id: string;
    name: string;
    type?: string;
    description?: string;
    image?: string;
  };
  estimated_price?: number;
  actual_price?: number;
  payment_method?: 'wallet' | 'cash';
}

interface OrderDetailsPanelProps {
  selectedOrder: Order;
  unreadMessageCounts: {[key: string]: number};
  handleOpenOrderDetails: () => void;
  handleOpenMessageDialog: () => void;
  handleCancelOrder: (orderId: string) => void;
  isCancelling: boolean;
}

// Create memoized sub-components to prevent unnecessary re-renders
const OrderHeader = memo(({ 
  handleOpenOrderDetails, 
  handleOpenMessageDialog, 
  selectedOrder, 
  unreadMessageCounts 
}: { 
  handleOpenOrderDetails: () => void; 
  handleOpenMessageDialog: () => void; 
  selectedOrder: Order; 
  unreadMessageCounts: {[key: string]: number}; 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-md font-medium text-gray-900 dark:text-white">
        {t('tracking.orderDetails')}
      </h3>
      
      <div className="flex space-x-2">
        <button
          onClick={handleOpenOrderDetails}
          className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
        >
          <FaInfoCircle className="mr-1" /> {t('orders.viewDetails')}
        </button>
        
        {/* Message button - only show if we have a driver for the order */}
        {selectedOrder && selectedOrder.driver_id && (
          <button
            onClick={handleOpenMessageDialog}
            className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
          >
            <FaComments className="mr-1" /> 
            {t('messages.chat')}
            {unreadMessageCounts[selectedOrder.id] > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadMessageCounts[selectedOrder.id]}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
});

const OrderInfo = memo(({ selectedOrder }: { selectedOrder: any }) => {
  const { t } = useTranslation();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
          <FaCalendarAlt className="w-4 h-4 text-gray-500 dark:text-stone-400" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-stone-400">{t('orders.orderId')}</p>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{selectedOrder.id?.slice(0, 8)}</p>
        </div>
      </div>
      
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
          <FaClock className="w-4 h-4 text-gray-500 dark:text-stone-400" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-stone-400">{t('CreatedAt')}</p>
          <p className="text-sm text-gray-900 dark:text-white">
            {formatDate(new Date(selectedOrder.created_at).toISOString().split('T')[0])}
          </p>
        </div>
      </div>
    </div>
  );
});

const LocationInfo = memo(({ selectedOrder }: { selectedOrder: any }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-start">
        <div className="min-w-10 pt-1 flex justify-center">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-stone-400">{t('location.pickup')}</p>
          <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedOrder.pickup_location}</p>
        </div>
      </div>
      
      <div className="flex items-center ml-5">
        <div className="border-l-2 border-dashed border-gray-300 dark:border-stone-600 h-8"></div>
      </div>
      
      <div className="flex items-start">
        <div className="min-w-10 pt-1 flex justify-center">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-stone-400">{t('location.destination')}</p>
          <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedOrder.dropoff_location}</p>
        </div>
      </div>
    </div>
  );
});

const PaymentInfo = memo(({ selectedOrder }: { selectedOrder: any }) => {
  const { t } = useTranslation();
  
  return (
    <div className="mt-4 p-3 bg-gray-50 dark:bg-midnight-700/30 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500 dark:text-stone-400">{t('orders.estimatedPrice')}</p>
          <p className="text-md font-medium text-gray-900 dark:text-white">{formatCurrency(selectedOrder.estimated_price)}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-500 dark:text-stone-400">{t('payment.method')}:</p>
          <div className="flex items-center">
            {selectedOrder.payment_method === 'wallet' ? (
              <>
                <FaWallet className="w-4 h-4 text-purple-500 mr-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('payment.wallet')}</span>
              </>
            ) : (
              <>
                <FaMoneyBill className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('payment.cash')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const DeliveryStatus = memo(({ selectedOrder }: { selectedOrder: any }) => {
  const { t } = useTranslation();
  
  // Define the order of statuses for the progress bar
  // Only include statuses that are valid in the database's order_status enum
  const statusOrder = [
    'pending',
    'accepted',
    'en_route',
    'arrived',
    'picked_up',
    'delivered',
    'completed'
  ];
  
  // Map status to a standardized value
  const standardizeStatus = (status: string): string => {
    // Handle legacy 'active' status
    if (status === 'active') return 'accepted';
    return status;
  };
  
  const currentStatus = standardizeStatus(selectedOrder.status);
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  // Helper function to determine if a status is active or completed
  const getStatusState = (checkStatus: string) => {
    const checkIndex = statusOrder.indexOf(checkStatus);
    if (checkIndex === -1) return 'inactive';
    if (checkIndex < currentIndex) return 'completed';
    if (checkIndex === currentIndex) return 'active';
    return 'inactive';
  };

  return (
    <div className="mt-6 border-t border-gray-100 dark:border-stone-700/20 pt-4">
      <div className="flex items-center space-x-2 mb-3">
        <FaInfoCircle className="text-indigo-500 dark:text-indigo-400" />
        <h4 className="text-md font-medium text-gray-900 dark:text-white">
          {t('tracking.deliveryStatus')}
        </h4>
      </div>
      
      <div className="relative">
        {/* Order Accepted */}
        <div className="flex items-center mb-6">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getStatusState('accepted') === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : getStatusState('accepted') === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
            <FaCheck className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900 dark:text-white">
              {t('tracking.orderAccepted')}
            </p>
            <p className="text-sm text-gray-500 dark:text-stone-400">
              {currentStatus === 'pending' 
                ? t('tracking.waitingAcceptance')
                : t('tracking.driverAssigned')}
            </p>
          </div>
        </div>
        
        {/* Connecting line */}
        <div className="absolute top-8 left-4 h-16 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
        
        {/* Driver En Route */}
        <div className="flex items-center mb-6">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getStatusState('en_route') === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : getStatusState('en_route') === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
            <FaCar className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900 dark:text-white">
              {t('tracking.driverEnRoute')}
            </p>
            <p className="text-sm text-gray-500 dark:text-stone-400">
              {currentStatus === 'en_route' ? t('tracking.driverEnRoute') : ''}
            </p>
          </div>
        </div>
        
        {/* Connecting line */}
        <div className="absolute top-24 left-4 h-16 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
        
        {/* Driver Arrived */}
        <div className="flex items-center mb-6">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getStatusState('arrived') === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : getStatusState('arrived') === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
            <FaMapMarkerAlt className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900 dark:text-white">
              {t('tracking.driverArrived')}
            </p>
            <p className="text-sm text-gray-500 dark:text-stone-400">
              {currentStatus === 'arrived' ? t('tracking.waitingPickup') : ''}
            </p>
          </div>
        </div>
        
        {/* Connecting line */}
        <div className="absolute top-40 left-4 h-16 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
        
        {/* Order Picked Up */}
        <div className="flex items-center mb-6">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getStatusState('picked_up') === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : getStatusState('picked_up') === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
            <FaBox className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900 dark:text-white">
              {t('tracking.orderPickedUp')}
            </p>
            <p className="text-sm text-gray-500 dark:text-stone-400">
              {currentStatus === 'picked_up' ? t('tracking.itemInTransit') : ''}
            </p>
          </div>
        </div>
        
        {/* Connecting line */}
        <div className="absolute top-56 left-4 h-16 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
        
        {/* Delivered */}
        <div className="flex items-center mb-6">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getStatusState('delivered') === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : getStatusState('delivered') === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
            <FaCheckCircle className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900 dark:text-white">
              {t('tracking.delivered')}
            </p>
            <p className="text-sm text-gray-500 dark:text-stone-400">
              {currentStatus === 'delivered' ? t('tracking.orderDelivered') : ''}
            </p>
          </div>
        </div>
        
        {/* Connecting line */}
        <div className="absolute top-88 left-4 h-16 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
        
        {/* Completed */}
        <div className="flex items-center">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getStatusState('completed') === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : getStatusState('completed') === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
            <FaFlag className="h-4 w-4" />
          </div>
          <div className="ml-4">
            <p className="font-medium text-gray-900 dark:text-white">
              {t('orders.status.completed')}
            </p>
            <p className="text-sm text-gray-500 dark:text-stone-400">
              {currentStatus === 'completed' || currentStatus === 'confirmed' 
                ? t('tracking.orderCompleted') 
                : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

const ActionButtons = memo(({ 
  selectedOrder, 
  handleCancelOrder, 
  handleOpenMessageDialog, 
  isCancelling 
}: { 
  selectedOrder: any; 
  handleCancelOrder: (orderId: string) => void; 
  handleOpenMessageDialog: () => void; 
  isCancelling: boolean; 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="mt-6 flex flex-col sm:flex-row gap-3">
      {selectedOrder.status === 'pending' && (
        <button
          onClick={() => handleCancelOrder(selectedOrder.id)}
          className="btn btn-danger flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm"
          disabled={isCancelling}
        >
          {isCancelling ? <FaSpinner className="animate-spin" /> : <FaTimes />}
          {t('order.cancelOrder')}
        </button>
      )}
      <button
        onClick={handleOpenMessageDialog}
        className={`btn btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm ${!selectedOrder.driver_id ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={!selectedOrder.driver_id}
        title={!selectedOrder.driver_id ? t('messages.noDriverAssigned') : t('messages.contactDriver')}
      >
        <FaCommentDots />
        {t('messages.messageDriver')}
      </button>
    </div>
  );
});

// Add display names for better debugging
OrderHeader.displayName = 'OrderHeader';
OrderInfo.displayName = 'OrderInfo';
LocationInfo.displayName = 'LocationInfo';
PaymentInfo.displayName = 'PaymentInfo';
DeliveryStatus.displayName = 'DeliveryStatus';
ActionButtons.displayName = 'ActionButtons';

// Main component - also memoized
const OrderDetailsPanel: React.FC<OrderDetailsPanelProps> = memo((props) => {
  // For the main component, we'll destructure props inside to optimize performance
  const { selectedOrder, unreadMessageCounts, handleOpenOrderDetails, handleOpenMessageDialog, handleCancelOrder, isCancelling } = props;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 sm:mt-6 bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-3 sm:p-4"
    >
      <OrderHeader 
        handleOpenOrderDetails={handleOpenOrderDetails}
        handleOpenMessageDialog={handleOpenMessageDialog}
        selectedOrder={selectedOrder}
        unreadMessageCounts={unreadMessageCounts}
      />
      
      <div className="space-y-3 sm:space-y-4">
        {/* Order info */}
        <OrderInfo selectedOrder={selectedOrder} />
        
        {/* Locations */}
        <LocationInfo selectedOrder={selectedOrder} />
        
        {/* Payment details */}
        <PaymentInfo selectedOrder={selectedOrder} />
      </div>
      
      {/* Delivery status */}
      <DeliveryStatus selectedOrder={selectedOrder} />

      {/* Action Buttons */}
      <ActionButtons 
        selectedOrder={selectedOrder}
        handleCancelOrder={handleCancelOrder}
        handleOpenMessageDialog={handleOpenMessageDialog}
        isCancelling={isCancelling}
      />
    </motion.div>
  );
});

// Add display name for better debugging
OrderDetailsPanel.displayName = 'OrderDetailsPanel';

export default OrderDetailsPanel; 