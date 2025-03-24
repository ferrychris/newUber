import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FaMoneyBillWave, FaCreditCard, FaSpinner, FaTimes, FaWallet, FaCheck } from 'react-icons/fa';
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
                <FaWallet className="text-purple-600 dark:text-purple-400 mr-2" />
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
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentMethods] = useState([
    { id: 'card', name: 'Credit Card', icon: <FaCreditCard className="text-purple-600 dark:text-purple-400" /> },
    { id: 'bank', name: 'Bank Transfer', icon: <FaMoneyBillWave className="text-purple-600 dark:text-purple-400" /> },
  ]);

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

  // Function to handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || amount <= 0 || !selectedMethod) {
      setError('Please select a payment method and enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create a payment intent on the server
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          walletId: wallet?.id,
          userId,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setIsProcessing(false);
        return;
      }

      // Confirm card payment
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        setError('Card element not found');
        setIsProcessing(false);
        return;
      }

      const paymentResult = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: userId, // Use actual email if available
          },
        },
      });

      if (paymentResult.error) {
        setError(paymentResult.error.message || 'Payment failed');
        setPaymentStep('error');
      } else if (paymentResult.paymentIntent.status === 'succeeded') {
        setPaymentStep('success');
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An error occurred while processing your payment');
      setPaymentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Amount selector component
  const AmountSelector: React.FC<{
    selectedAmount: number;
    onSelect: (amount: number) => void;
  }> = ({ selectedAmount, onSelect }) => {
    const amounts = [10, 25, 50, 100, 250, 500];
    
    return (
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          {amounts.map((amount) => (
            <button
              key={amount}
              type="button"
              className={`py-2 px-4 rounded-lg text-center ${
                selectedAmount === amount
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700'
              }`}
              onClick={() => onSelect(amount)}
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaWallet className="text-purple-600 dark:text-purple-400 text-xl" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('wallet.addFunds')}
        </h2>
      </div>

      {paymentStep === 'input' && (
        <>
          {/* Amount Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              {t('wallet.selectAmount')}
            </label>
            <AmountSelector selectedAmount={amount} onSelect={setAmount} />
            
            <div className="relative mt-4">
              <div className="flex items-center">
                <span className="text-gray-500 dark:text-stone-400 absolute left-3">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-gray-900 dark:text-white focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400"
                />
              </div>
            </div>
          </div>
          
          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              {t('price.paymentMethod')}
            </label>
            
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethod(method.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg ${
                    selectedMethod === method.id
                      ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800'
                      : 'bg-gray-100 dark:bg-stone-800 border border-transparent hover:bg-gray-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="mr-3">
                      {method.icon}
                    </div>
                    <span className="font-medium text-gray-700 dark:text-stone-300">
                      {method.name}
                    </span>
                  </div>
                  
                  {selectedMethod === method.id && (
                    <div className="h-5 w-5 bg-purple-600 dark:bg-purple-500 rounded-full flex items-center justify-center">
                      <FaCheck className="text-white text-xs" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Card Details */}
          {selectedMethod === 'card' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                {t('wallet.cardDetails')}
              </label>
              
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
                className="p-3 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800"
              />
            </div>
          )}
          
          {error && (
            <div className="mb-4 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-stone-600 rounded-lg text-gray-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-gray-50 dark:hover:bg-stone-700"
            >
              {t('common.cancel')}
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedMethod || isProcessing || amount <= 0}
              className={`flex-1 py-2 px-4 rounded-lg text-white ${
                !selectedMethod || isProcessing || amount <= 0
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('common.submitting')}
                </span>
              ) : (
                formatCurrency(amount)
              )}
            </button>
          </div>
        </>
      )}

      {paymentStep === 'processing' && (
        <div className="text-center py-10">
          <FaSpinner className="animate-spin text-4xl text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t('wallet.processingPayment')}</h3>
          <p className="text-pearl-300">{t('wallet.doNotClose')}</p>
        </div>
      )}

      {paymentStep === 'success' && (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('wallet.paymentSuccess')}</h3>
          <p className="text-pearl-300">{t('wallet.fundsAdded')}</p>
        </div>
      )}

      {paymentStep === 'error' && (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('wallet.paymentFailed')}</h3>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => setPaymentStep('input')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletFundDialog;
