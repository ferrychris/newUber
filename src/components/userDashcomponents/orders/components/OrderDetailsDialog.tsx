import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { OrderFormData } from '../types';
import OrderForm from './OrderForm';
import OrderDetailsView from '../../../shared/OrderDetailsView';
import { useTranslation } from 'react-i18next';

interface OrderDetailsDialogProps {
  service?: any;
  order?: any;
  onClose: () => void;
  onSubmit: (data: OrderFormData) => Promise<void>;
  onAcceptOrder?: (orderId: string) => Promise<void>;
  onCompleteOrder?: (orderId: string) => Promise<void>;
  onCancelOrder?: (orderId: string) => Promise<void>;
  isSubmitting?: boolean;
  viewOnly?: boolean;
  isDriver?: boolean;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  service,
  order,
  onClose,
  onSubmit,
  onAcceptOrder,
  onCompleteOrder,
  onCancelOrder,
  isSubmitting = false,
  viewOnly = false,
  isDriver = false
}) => {
  const { t } = useTranslation();

  const handleSubmit = async (data: OrderFormData) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      // Error handling is managed by the parent component
      console.error('Error handling order:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-midnight-800 rounded-xl shadow-xl overflow-hidden max-w-2xl w-full border border-gray-200 dark:border-stone-600/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-stone-600/10 bg-gradient-to-r from-sunset to-purple-600">
          <h2 className="text-xl font-semibold text-white">
            {viewOnly
              ? t('pages.orders.orderDetails')
              : t('pages.orders.createOrder')
            }
          </h2>
          <button
            className="p-2 text-white/80 hover:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
            onClick={onClose}
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {viewOnly ? (
            <OrderDetailsView
              order={order}
              service={service}
              showUserDetails={isDriver}
              showDriverDetails={!isDriver && !!order.driver_id}
              onAcceptOrder={onAcceptOrder}
              onCompleteOrder={onCompleteOrder}
              onCancelOrder={onCancelOrder}
              isDriver={isDriver}
            />
          ) : (
            <OrderForm
              service={service}
              order={order}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              viewOnly={viewOnly}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsDialog;