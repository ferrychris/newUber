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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
          className="relative w-full max-w-xl p-6 bg-midnight-900/95 border border-stone-800/50 
            rounded-lg shadow-xl backdrop-blur-sm max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {!isSubmitting && (
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-300 
                transition-colors rounded-full hover:bg-stone-800/50"
              aria-label={t('common.close')}
            >
              <FaTimes className="w-4 h-4" />
            </motion.button>
          )}

          {viewOnly && order ? (
            <OrderDetailsView
              order={order}
              service={service}
              showUserDetails={isDriver}
              showDriverDetails={!isDriver && order.driver_id}
              onAcceptOrder={onAcceptOrder}
              onCompleteOrder={onCompleteOrder}
              onCancelOrder={onCancelOrder}
              isDriver={isDriver}
            />
          ) : (
            <>
              <div className="flex items-center space-x-4">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className={`p-3 rounded-lg ${service?.theme.bg} backdrop-blur-sm 
                    border ${service?.theme.border}`}
                >
                  {service?.icon}
                </motion.div>
                <div>
                  <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl font-semibold text-stone-200"
                  >
                    {t('orders.newOrder', { service: t(`services.${service?.type}.title`) })}
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-sm text-stone-400"
                  >
                    {t(`services.${service?.type}.description`)}
                  </motion.p>
                </div>
              </div>

              <OrderForm
                service={service}
                order={order}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                viewOnly={viewOnly}
              />

              {!isSubmitting && !viewOnly && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="mt-4 w-full px-4 py-2 text-sm text-stone-400 hover:text-stone-300 
                    transition-colors border border-stone-800/50 rounded-lg hover:bg-stone-800/20"
                >
                  {t('form.cancel')}
                </motion.button>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderDetailsDialog;