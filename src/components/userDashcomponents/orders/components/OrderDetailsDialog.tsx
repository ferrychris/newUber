import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { OrderFormData } from '../types';
import OrderForm from './OrderForm';
import OrderDetailsView from '../../../shared/OrderDetailsView';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../utils/supabase';

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
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Fetch wallet balance when dialog opens
  useEffect(() => {
    if (user && !viewOnly) {
      fetchWalletBalance();
    }
  }, [user, viewOnly]);

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    try {
      setIsLoadingWallet(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching wallet balance:', error);
      } else {
        setWalletBalance(data?.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const handleSubmit = async (data: OrderFormData) => {
    try {
      // Include wallet balance in the form data for validation
      const enrichedData = {
        ...data,
        walletBalance: walletBalance || 0
      };
      
      await onSubmit(enrichedData);
      onClose();
    } catch (error) {
      // Error handling is managed by the parent component
      console.error('Error handling order:', error);
    }
  };

  const handleCloseOrder = () => {
    onClose();
  };

  // Close on escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-midnight-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Dialog header */}
          <div className="p-4 border-b border-gray-200 dark:border-stone-700/20 flex justify-between items-center sticky top-0 bg-white dark:bg-midnight-800 z-10">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {viewOnly 
                ? t('View Details') 
                : t('Create Order', { service: service?.name || t('Service') })}
            </h2>
            <button
              onClick={handleCloseOrder}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-midnight-700 transition-colors"
            >
              <FaTimes />
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
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                viewOnly={viewOnly}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderDetailsDialog; 