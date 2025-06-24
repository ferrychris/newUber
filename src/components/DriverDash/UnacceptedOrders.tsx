import { useOutletContext } from 'react-router-dom';
import { Order, OrderAction } from './types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Clock, DollarSign, CheckCircle, XCircle, Navigation } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface OutletContextType {
  unacceptedOrders: Order[];
  isLoadingUnacceptedOrders: boolean;
  handleOrderAction: (orderId: string, action: OrderAction) => Promise<void>;
}

const UnacceptedOrders = () => {
  const { t } = useTranslation();
  const { unacceptedOrders, isLoadingUnacceptedOrders, handleOrderAction } = useOutletContext<OutletContextType>();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [processingOrderIds, setProcessingOrderIds] = useState<Set<string>>(new Set());
  
  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };
  
  const handleAccept = async (orderId: string) => {
    // Add this order to processing state
    setProcessingOrderIds(prev => new Set(prev).add(orderId));
    
    try {
      await handleOrderAction(orderId, 'accept');
    } finally {
      // Remove this order from processing state regardless of outcome
      setProcessingOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };
  
  const handleReject = async (orderId: string) => {
    // Add this order to processing state
    setProcessingOrderIds(prev => new Set(prev).add(orderId));
    
    try {
      await handleOrderAction(orderId, 'reject');
    } finally {
      // Remove this order from processing state regardless of outcome
      setProcessingOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };
  
  if (isLoadingUnacceptedOrders) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  if (unacceptedOrders.length === 0) {
    return (
      <div className="text-center p-8 rounded-lg bg-gray-800 text-white">
        <h3 className="font-medium text-xl mb-2">
          {t('driver.noAvailableOrders')}
        </h3>
        <p className="text-gray-400">
          {t('driver.checkBackLater')}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          {t('driver.availableOrders')}
        </h2>
        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">
          {unacceptedOrders.length} {t('driver.available')}
        </span>
      </div>
      
      <AnimatePresence>
        {unacceptedOrders.map(order => {
          const isProcessing = processingOrderIds.has(order.id);
          const isExpanded = expandedOrderId === order.id;
          
          // Calculate how long ago the order was created
          const createdAt = new Date(order.created_at);
          const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
          
          return (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg"
            >
              {/* Order header - always visible */}
              <div 
                onClick={() => toggleOrderDetails(order.id)}
                className="p-4 cursor-pointer flex justify-between items-center hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-green-900 p-2 rounded-full">
                    <Navigation size={16} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{t('driver.newRideRequest')}</h3>
                    <p className="text-sm text-gray-400">{timeAgo}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <span className="text-green-400 font-bold mr-2">
                    ${order.price?.toFixed(2) || '--'}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Expandable details */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 border-t border-gray-700"
                >
                  <div className="space-y-4">
                    {/* Pickup Location */}
                    <div className="flex items-start">
                      <MapPin size={18} className="text-green-500 mr-2 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-400">{t('driver.pickupLocation')}</p>
                        <p className="text-white">{order.pickup_location}</p>
                      </div>
                    </div>
                    
                    {/* Dropoff Location */}
                    <div className="flex items-start">
                      <MapPin size={18} className="text-red-500 mr-2 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-400">{t('driver.dropoffLocation')}</p>
                        <p className="text-white">{order.dropoff_location}</p>
                      </div>
                    </div>
                    
                    {/* Trip Details */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Distance */}
                      <div className="flex items-center">
                        <Navigation size={18} className="text-blue-500 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-400">{t('driver.distance')}</p>
                          <p className="text-white">{order.distance} km</p>
                        </div>
                      </div>
                      
                      {/* Estimated Time */}
                      <div className="flex items-center">
                        <Clock size={18} className="text-yellow-500 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-400">{t('driver.estimatedTime')}</p>
                          <p className="text-white">{order.estimated_time} mins</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Fare */}
                    <div className="flex items-center">
                      <DollarSign size={18} className="text-green-500 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-400">{t('driver.fare')}</p>
                        <p className="text-xl font-bold text-green-400">
                          ${order.price?.toFixed(2) || '--'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-between mt-4 space-x-3">
                      <button
                        onClick={() => handleAccept(order.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <span className="flex items-center">
                            <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                            {t('driver.processing')}
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <CheckCircle size={18} className="mr-2" />
                            {t('driver.accept')}
                          </span>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleReject(order.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <span className="flex items-center">
                            <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                            {t('driver.processing')}
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <XCircle size={18} className="mr-2" />
                            {t('driver.reject')}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default UnacceptedOrders;
