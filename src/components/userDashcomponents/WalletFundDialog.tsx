import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCreditCard, FaMoneyBillWave, FaTimes, FaLock } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-toastify';
import { createPaymentIntent, processSuccessfulPayment, stripePromise } from '../../utils/stripe';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';

interface WalletFundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  onSuccess: () => void;
  currentBalance: number;
  userId: string;
}

// Styling for the Stripe Card Element
const cardStyle = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: 'Arial, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  }
};

const WalletFundDialogContent: React.FC<WalletFundDialogProps> = ({
  isOpen,
  onClose,
  walletId,
  onSuccess,
  currentBalance,
  userId
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Stripe hooks
  const stripe = useStripe();
  const elements = useElements();
  
  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value);
  };

  const handleManualUpdate = async () => {
    if (amount <= 0) {
      toast.error(t('wallet.invalidAmount'));
      return;
    }
    
    try {
      setLoading(true);
      
      // Manual update without payment processing (for bank transfer)
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: currentBalance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId);
      
      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }
      
      // Create transaction record
      await createTransactionRecord();
      
      toast.success(t('wallet.fundsAdded'));
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error(t('wallet.addFundsError'));
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amount <= 0) {
      toast.error(t('wallet.invalidAmount'));
      return;
    }
    
    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      toast.error(t('payment.stripeNotLoaded'));
      return;
    }
    
    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      toast.error(t('payment.cardElementMissing'));
      return;
    }
    
    try {
      setProcessingPayment(true);
      
      // Create a payment intent
      const clientSecret = await createPaymentIntent(amount * 100, userId);
      
      // Confirm the payment
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Anonymous User',
          },
        }
      });
      
      if (paymentError) {
        throw new Error(paymentError.message);
      }
      
      if (paymentIntent.status === 'succeeded') {
        // Process the successful payment
        await processSuccessfulPayment(paymentIntent.id, walletId, amount);
        
        // Create transaction record
        await createTransactionRecord();
        
        toast.success(t('wallet.fundsAdded'));
        onSuccess();
        onClose();
      } else {
        throw new Error(`Payment failed: ${paymentIntent.status}`);
      }
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.error(error.message || t('payment.processingError'));
    } finally {
      setProcessingPayment(false);
    }
  };

  const createTransactionRecord = async () => {
    try {
      // Create transaction record
      const { error: transactionError } = await supabase
        .from('wallet_transaction')
        .insert({
          wallet_id: walletId,
          amount: amount,
          type: 'deposit',
          status: 'completed',
          description: t('wallet.fundDepositDesc'),
          payment_method: paymentMethod,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (transactionError) {
        // If the wallet_transaction table doesn't exist, try wallet_transactions
        if (transactionError.code === '42P01') {
          const { error: txError2 } = await supabase
            .from('wallet_transactions')
            .insert({
              wallet_id: walletId,
              amount: amount,
              type: 'deposit',
              status: 'completed',
              description: t('wallet.fundDepositDesc'),
              payment_method: paymentMethod,
              created_at: new Date().toISOString()
            });
            
          if (txError2 && txError2.code === '42P01') {
            // Try one more table name
            const { error: txError3 } = await supabase
              .from('transactions')
              .insert({
                wallet_id: walletId,
                amount: amount,
                type: 'deposit',
                status: 'completed',
                description: t('wallet.fundDepositDesc'),
                payment_method: paymentMethod,
                created_at: new Date().toISOString()
              });
              
            if (txError3) {
              console.error('Failed to record transaction in any table:', txError3);
            }
          }
        } else {
          console.error('Transaction record failed:', transactionError);
        }
      }
    } catch (error) {
      console.error('Error recording transaction:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'card') {
      handleStripePayment(e);
    } else {
      handleManualUpdate();
    }
  };

  if (processingPayment) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-midnight-800 rounded-xl shadow-xl max-w-md w-full p-8 text-center"
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('wallet.processingPayment')}</h3>
            <p className="text-gray-500 dark:text-stone-400">{t('wallet.doNotClose')}</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-midnight-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden"
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-stone-700/20">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('wallet.addFunds')}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              {t('wallet.selectAmount')}
            </label>
            <div className="flex items-center border-2 border-gray-300 dark:border-stone-600 rounded-lg overflow-hidden focus-within:border-purple-500 dark:focus-within:border-purple-400">
              <span className="px-3 py-2 bg-gray-100 dark:bg-midnight-700 text-gray-500 dark:text-stone-400">$</span>
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                className="w-full p-2 outline-none bg-white dark:bg-midnight-800 text-gray-900 dark:text-white"
                min="1"
                step="0.01"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                type="button"
                onClick={() => handleQuickAmount(10)}
                className="p-2 bg-gray-100 dark:bg-midnight-700 rounded-md text-sm font-medium text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-midnight-600"
              >
                $10
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(50)}
                className="p-2 bg-gray-100 dark:bg-midnight-700 rounded-md text-sm font-medium text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-midnight-600"
              >
                $50
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(100)}
                className="p-2 bg-gray-100 dark:bg-midnight-700 rounded-md text-sm font-medium text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-midnight-600"
              >
                $100
              </button>
            </div>
          </div>
          
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              {t('wallet.paymentMethod')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-lg flex items-center gap-3 border-2 ${
                  paymentMethod === 'card'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-300 dark:border-stone-600 hover:bg-gray-50 dark:hover:bg-midnight-700'
                }`}
              >
                <FaCreditCard className={paymentMethod === 'card' ? 'text-purple-500' : 'text-gray-500 dark:text-stone-400'} />
                <span className="font-medium">{t('wallet.creditCard')}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`p-3 rounded-lg flex items-center gap-3 border-2 ${
                  paymentMethod === 'bank'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-300 dark:border-stone-600 hover:bg-gray-50 dark:hover:bg-midnight-700'
                }`}
              >
                <FaMoneyBillWave className={paymentMethod === 'bank' ? 'text-purple-500' : 'text-gray-500 dark:text-stone-400'} />
                <span className="font-medium">{t('wallet.bankTransfer')}</span>
              </button>
            </div>
          </div>
          
          {paymentMethod === 'card' && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                {t('wallet.cardDetails')}
              </label>
              <div className="border-2 border-gray-300 dark:border-stone-600 rounded-lg p-3 bg-white dark:bg-midnight-800">
                <CardElement options={cardStyle} />
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-stone-400 mt-2">
                <FaLock className="mr-1" />
                <span>{t('wallet.securePayment')}</span>
              </div>
            </div>
          )}
          
          <div className="pt-3 border-t border-gray-200 dark:border-stone-700/20">
            <button
              type="submit"
              disabled={loading || amount <= 0 || (paymentMethod === 'card' && (!stripe || !elements))}
              className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              ) : null}
              {loading 
                ? t('common.processing') 
                : (paymentMethod === 'card' ? t('wallet.confirmPayment') : t('wallet.confirmDeposit'))}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Wrapper component that provides Stripe context
const WalletFundDialog: React.FC<Omit<WalletFundDialogProps, 'userId'> & { userId: string }> = (props) => {
  if (!props.isOpen) return null;
  
  return (
    <Elements stripe={stripePromise}>
      <WalletFundDialogContent {...props} />
    </Elements>
  );
};

export default WalletFundDialog; 