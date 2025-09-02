import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import { supabase } from '../../utils/supabase';
import { toast } from 'sonner';

// Type for Stripe
declare global {
  interface Window {
    Stripe: {
      (publishableKey: string): {
        redirectToCheckout: (params: { sessionId: string }) => Promise<{ error?: Error }>;
      };
    };
  }
}

interface WalletFundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  userId: string;
}

// Function to create a Stripe checkout session
const createCheckoutSession = async (amount: number, userId: string, walletId: string) => {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { 
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      userId,
      walletId,
      type: 'wallet_topup'
    }
  });
  
  if (error) {
    throw error;
  }
  
  return data;
};

const WalletFundDialog: React.FC<WalletFundDialogProps> = ({
  isOpen,
  onClose,
  walletId,
  userId
}) => {
  const [amount, setAmount] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Handle Stripe Checkout
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Create a checkout session
      const { sessionId } = await createCheckoutSession(amount, userId, walletId);
      
      // Initialize Stripe
      if (!window.Stripe) {
        throw new Error('Stripe.js not loaded');
      }
      
      const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
      
      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId
      });
      
      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };
  
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

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transition-colors duration-200"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Funds</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              disabled={isProcessing}
            >
              <FaTimes className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handlePayment}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount to Add
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={handleAmountChange}
                  className="focus:ring-purple-500 focus:border-purple-500 dark:focus:ring-purple-400 dark:focus:border-purple-400 block w-full pl-7 pr-12 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md py-3 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  disabled={isProcessing}
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">USD</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[10, 25, 50, 100, 200, 500].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleQuickAmount(value)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      amount === value
                        ? 'bg-purple-600 dark:bg-purple-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    disabled={isProcessing}
                  >
                    ${value}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              <svg className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure payment powered by Stripe</span>
            </div>
            
            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isProcessing
                  ? 'bg-purple-400 dark:bg-purple-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800 transition-colors`}
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                `Add $${amount.toFixed(2)} to Wallet`
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};



export default WalletFundDialog; 