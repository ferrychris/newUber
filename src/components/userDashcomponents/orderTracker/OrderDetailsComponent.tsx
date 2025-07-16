import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaUser, FaPhone, FaCommentAlt, FaSpinner } from 'react-icons/fa';
import { useOrderTracker } from './OrderTrackerContext';
import ConfirmationDialog from './ConfirmationDialog';

const OrderDetailsComponent: React.FC = () => {
  const { t } = useTranslation();
  const {
    selectedOrder,
    driverDetails,
    setShowMessageDialog,
    setMessageReceiverId,
    showOrderDetailsDialog,
    setShowOrderDetailsDialog,
    isCancelling,
    setIsCancelling,
    isConfirmingDelivery,
    confirmDelivery
  } = useOrderTracker();
  const [showConfirmDeliveryDialog, setShowConfirmDeliveryDialog] = useState(false);

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Handle messaging with driver
  const handleMessageDriver = () => {
    if (selectedOrder?.driver_id) {
      setMessageReceiverId(selectedOrder.driver_id);
      setShowMessageDialog(true);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    
    setIsCancelling(true);
    
    try {
      // Implementation for order cancellation would go here
      // This would typically involve a call to your backend API
      
      // For now, we'll just show a success message after a delay
      setTimeout(() => {
        setIsCancelling(false);
        setShowOrderDetailsDialog(false);
        // You would typically refresh orders here
      }, 1000);
    } catch (error) {
      console.error('Error cancelling order:', error);
      setIsCancelling(false);
    }
  };

  // If no order is selected, show a placeholder
  if (!selectedOrder) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-300">{t('tracking.selectOrder')}</p>
      </div>
    );
  }

  useEffect(() => {
    if (!isConfirmingDelivery && showConfirmDeliveryDialog) {
      setShowConfirmDeliveryDialog(false);
    }
  }, [isConfirmingDelivery, showConfirmDeliveryDialog]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
      >
        {/* Order header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedOrder.services?.name || t('tracking.orderDetails')}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            #{selectedOrder.id.substring(0, 8)}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatDate(selectedOrder.created_at)}
        </p>
      </div>

      {/* Order status */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('tracking.status')}
        </h3>
        <div className="flex items-center">
          <span className={`px-2 py-1 text-xs rounded-full ${
            selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
            selectedOrder.status === 'accepted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
            selectedOrder.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' :
            selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
          }`}>
            {selectedOrder.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
      </div>

      {/* Service details */}
      {selectedOrder.services && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('tracking.serviceDetails')}
          </h3>
          <div className="flex items-start">
            {/* Service image removed as it doesn't exist in the database */}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedOrder.services.name}
              </p>
              {selectedOrder.services.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedOrder.services.description}
                </p>
              )}
              {/* Price display removed - min_price field doesn't exist in the database */}
            </div>
          </div>
        </div>
      )}

      {/* Driver details */}
      {driverDetails && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('tracking.driverDetails')}
          </h3>
          <div className="flex items-center">
            {driverDetails.profile_image ? (
              <img 
                src={driverDetails.profile_image} 
                alt={driverDetails.full_name} 
                className="w-12 h-12 rounded-full object-cover mr-3"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                <FaUser className="text-gray-500 dark:text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {driverDetails.full_name}
              </p>
              {driverDetails.phone && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <FaPhone className="mr-1 text-xs" />
                  <span>{driverDetails.phone}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Message button */}
          <button
            onClick={handleMessageDriver}
            className="mt-3 flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
          >
            <FaCommentAlt className="mr-1" />
            {t('tracking.messageDriver')}
          </button>
        </div>
      )}

      {/* Locations */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('tracking.locations')}
        </h3>
        
        {/* Pickup location */}
        <div className="mb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('tracking.pickup')}
          </p>
          <p className="text-sm text-gray-900 dark:text-gray-100">
            {typeof selectedOrder.pickup_location === 'string' 
              ? selectedOrder.pickup_location 
              : t('tracking.locationCoordinates')}
          </p>
        </div>
        
        {/* Destination location */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('tracking.destination')}
          </p>
          <p className="text-sm text-gray-900 dark:text-gray-100">
            {typeof selectedOrder.destination_location === 'string' 
              ? selectedOrder.destination_location 
              : t('tracking.locationCoordinates')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        {selectedOrder.status === 'pending' && (
          <button
            onClick={() => setShowOrderDetailsDialog(true)}
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            {t('tracking.cancelOrder')}
          </button>
        )}
        
        {selectedOrder.status === 'delivered' && !selectedOrder.delivery_confirmed && (
          <button
            onClick={() => setShowConfirmDeliveryDialog(true)}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center justify-center"
          >
            {t('tracking.confirmDelivery')}
          </button>
        )}
        
        {selectedOrder.delivery_confirmed && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-md">
            <p className="text-green-800 dark:text-green-200 text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t('tracking.deliveryConfirmed')}
            </p>
            {selectedOrder.confirmed_at && (
              <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-7">
                {formatDate(selectedOrder.confirmed_at)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Order details dialog */}
      {showOrderDetailsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('tracking.cancelConfirmation')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('tracking.cancelWarning')}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowOrderDetailsDialog(false)}
                className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCancelOrder}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center"
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    {t('common.processing')}
                  </>
                ) : (
                  t('tracking.confirmCancel')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </motion.div>

      {/* Delivery Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDeliveryDialog}
        title={t('tracking.confirmDelivery')}
        message={t('tracking.confirmDeliveryMessage')}
        confirmText={t('tracking.yesConfirmDelivery')}
        cancelText={t('common.cancel')}
        isProcessing={isConfirmingDelivery}
        onConfirm={() => {
          if (selectedOrder?.id) {
            confirmDelivery(selectedOrder.id);
          }
        }}
        onCancel={() => setShowConfirmDeliveryDialog(false)}
      />
    </>
  );
};

export default OrderDetailsComponent;
