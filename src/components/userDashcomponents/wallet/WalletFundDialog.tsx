import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FaMoneyBillWave, FaCreditCard, FaSpinner, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { createPaymentIntent, processSuccessfulPayment, getUserWallet } from '../../../utils/stripe';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface WalletFundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

// Main dialog component that wraps the Stripe Elements
const WalletFundDialog: React.FC<WalletFundDialogProps> = ({ isOpen, onClose, onSuccess, userId }) => {
  const { t } = useTranslation();
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-midnight-800 rounded-xl shadow-xl w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-midnight-700">
              <div className="flex items-center">
                <FaMoneyBillWave className="text-sunset-500 mr-2" />
                <h2 className="text-xl font-semibold">{t('wallet.addFunds')}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-pearl-300 hover:text-white p-1 rounded-full"
              >
                <FaTimes />
              </button>
            </div>
            
            <Elements stripe={stripePromise}>
              <CheckoutForm userId={userId} onSuccess={onSuccess} onClose={onClose} />
            </Elements>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Checkout form with Stripe integration
const CheckoutForm: React.FC<{
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}> = ({ userId, onSuccess, onClose }) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any | null>(null);
  const [paymentStep, setPaymentStep] = useState<'input' | 'processing' | 'success' | 'error'>('input');

  useEffect(() => {
    async function fetchWallet() {
      if (userId) {
        try {
          const userWallet = await getUserWallet(userId);
          setWallet(userWallet);
        } catch (err) {
          console.error('Error fetching wallet:', err);
        }
      }
    }
    
    fetchWallet();
  }, [userId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !userId || !wallet) {
      return;
    }

    setError(null);
    setIsProcessing(true);
    setPaymentStep('processing');

    try {
      // Create a payment intent with the specified amount (convert to cents)
      const amountInCents = Math.round(amount * 100);
      const clientSecret = await createPaymentIntent(amountInCents, userId);
      setClientSecret(clientSecret);

      // Get the card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm the payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'User Payment',
          },
        },
      });

      if (result.error) {
        // Show error to customer
        setError(result.error.message || 'An error occurred with your payment');
        setPaymentStep('error');
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          // Process the successful payment on the backend
          await processSuccessfulPayment(
            result.paymentIntent.id,
            wallet.id,
            amountInCents
          );
          
          setPaymentStep('success');
          toast.success(t('wallet.fundSuccess'));
          onSuccess();
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment');
      setPaymentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const predefinedAmounts = [10, 25, 50, 100, 200];

  return (
    <div className="p-6">
      {paymentStep === 'input' && (
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-pearl-300 mb-2">{t('wallet.selectAmount')}</label>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {predefinedAmounts.map((predefinedAmount) => (
                <button
                  key={predefinedAmount}
                  type="button"
                  className={`py-2 rounded-lg transition-colors ${
                    amount === predefinedAmount
                      ? 'bg-sunset-500 text-white'
                      : 'bg-midnight-700 text-pearl-300 hover:bg-midnight-600'
                  }`}
                  onClick={() => setAmount(predefinedAmount)}
                >
                  ${predefinedAmount}
                </button>
              ))}
            </div>
            <div className="relative mt-4">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pearl-400">$</span>
              <input
                type="number"
                min="5"
                max="1000"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-3 rounded-lg bg-midnight-700 text-white border border-midnight-600 focus:border-sunset-500 focus:outline-none"
                placeholder="Enter amount"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-pearl-300 mb-2">
              <div className="flex items-center">
                <FaCreditCard className="mr-2 text-sunset-500" />
                {t('wallet.cardDetails')}
              </div>
            </label>
            <div className="bg-midnight-700 rounded-lg p-4 border border-midnight-600">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#FFFFFF',
                      '::placeholder': {
                        color: '#AAAAAA',
                      },
                    },
                    invalid: {
                      color: '#FA5252',
                    },
                  },
                }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!stripe || isProcessing || amount <= 0}
            className="w-full py-3 rounded-lg bg-sunset-500 text-white font-semibold hover:bg-sunset-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <FaSpinner className="animate-spin mr-2" />
                {t('wallet.processing')}
              </span>
            ) : (
              t('wallet.payNow', { amount: `$${amount.toFixed(2)}` })
            )}
          </button>
        </form>
      )}

      {paymentStep === 'processing' && (
        <div className="text-center py-10">
          <FaSpinner className="animate-spin text-sunset-500 text-4xl mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t('wallet.processingPayment')}</h3>
          <p className="text-pearl-400">{t('wallet.dontClosePage')}</p>
        </div>
      )}

      {paymentStep === 'success' && (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('wallet.paymentSuccessful')}</h3>
          <p className="text-pearl-400">{t('wallet.fundsAdded', { amount: `$${amount.toFixed(2)}` })}</p>
        </div>
      )}

      {paymentStep === 'error' && (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('wallet.paymentFailed')}</h3>
          <p className="text-pearl-400">{error || t('wallet.genericError')}</p>
          <button
            onClick={() => setPaymentStep('input')}
            className="mt-4 px-4 py-2 bg-sunset-500 text-white rounded-lg hover:bg-sunset-600 transition-colors"
          >
            {t('wallet.tryAgain')}
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletFundDialog;
