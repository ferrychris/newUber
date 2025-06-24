import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUniversity, FaMoneyBillWave, FaTimes, FaLock, FaArrowDown, FaMinusCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-toastify';

interface WalletWithdrawDialogProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  onSuccess: () => void;
  currentBalance: number;
  userId: string;
}

const WalletWithdrawDialog: React.FC<WalletWithdrawDialogProps> = ({
  isOpen,
  onClose,
  walletId,
  onSuccess,
  currentBalance
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(50);
  const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'paypal'>('bank');
  const [accountDetails, setAccountDetails] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (value: number) => {
    // Make sure we don't set an amount higher than the current balance
    setAmount(Math.min(value, currentBalance));
  };

  const handleAccountDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountDetails(e.target.value);
  };

  const createTransactionRecord = async () => {
    try {
      // Create a transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: walletId,
          amount: -amount, // Negative amount for withdrawals
          type: 'withdrawal',
          status: 'completed',
          payment_method: withdrawMethod,
          description: `Withdrawal to ${withdrawMethod}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            withdrawMethod: withdrawMethod,
            accountDetails: accountDetails ? `${accountDetails.substring(0, 4)}****` : 'Not provided',
          }
        })
        .select()
        .single();
      
      if (transactionError) {
        throw new Error(`Failed to create transaction record: ${transactionError.message}`);
      }
      
      return transactionData;
    } catch (error) {
      console.error('Error creating transaction record:', error);
      throw error;
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (amount <= 0) {
      toast.error(t('wallet.invalidAmount'));
      return;
    }

    if (amount > currentBalance) {
      toast.error(t('wallet.insufficientFunds'));
      return;
    }

    if (!accountDetails.trim() && withdrawMethod === 'bank') {
      toast.error(t('wallet.accountDetailsRequired'));
      return;
    }
    
    try {
      setLoading(true);
      
      // Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: currentBalance - amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId);
      
      if (updateError) {
        throw new Error(`Failed to update wallet: ${updateError.message}`);
      }
      
      // Create withdrawal transaction record
      await createTransactionRecord();
      
      toast.success(t('wallet.withdrawalSuccess'));
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error(t('wallet.withdrawError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-midnight-900 rounded-xl shadow-xl w-full max-w-md relative overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-stone-700/20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <FaArrowDown className="mr-2 text-red-500" />
            {t('wallet.withdraw')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-white"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleWithdraw} className="p-4">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              {t('wallet.withdrawAmount')}
            </label>
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <FaUniversity />
                <span className="font-medium text-gray-700 dark:text-stone-300">{t('wallet.bankAccountDetails')}</span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                className="pl-8 w-full p-3 border-2 border-gray-300 dark:border-stone-600 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-midnight-800 dark:text-white"
                placeholder="0.00"
                min="1"
                max={currentBalance}
                step="0.01"
                required
              />
            </div>
            
            <div className="mt-2 text-sm text-gray-600 dark:text-stone-400">
              {t('wallet.availableForWithdrawal')}: <span className="font-semibold">${currentBalance.toFixed(2)}</span>
            </div>
            
            <div className="mt-3 flex space-x-2">
              <button
                type="button"
                onClick={() => handleQuickAmount(20)}
                className="p-2 bg-gray-100 dark:bg-midnight-700 rounded-md text-sm font-medium text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-midnight-600"
              >
                $20
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
              <button
                type="button"
                onClick={() => handleQuickAmount(currentBalance)}
                className="p-2 bg-gray-100 dark:bg-midnight-700 rounded-md text-sm font-medium text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-midnight-600"
              >
                {t('wallet.max')}
              </button>
            </div>
          </div>
          
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              {t('wallet.withdrawMethod')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWithdrawMethod('bank')}
                className={`p-3 rounded-lg flex items-center gap-3 border-2 ${
                  withdrawMethod === 'bank'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-300 dark:border-stone-600 hover:bg-gray-50 dark:hover:bg-midnight-700'
                }`}
              >
                <FaUniversity className={withdrawMethod === 'bank' ? 'text-purple-500' : 'text-gray-500 dark:text-stone-400'} />
                <span className="font-medium">{t('wallet.bankTransfer')}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setWithdrawMethod('paypal')}
                className={`p-3 rounded-lg flex items-center gap-3 border-2 ${
                  withdrawMethod === 'paypal'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-300 dark:border-stone-600 hover:bg-gray-50 dark:hover:bg-midnight-700'
                }`}
              >
                <FaMoneyBillWave className={withdrawMethod === 'paypal' ? 'text-purple-500' : 'text-gray-500 dark:text-stone-400'} />
                <span className="font-medium">PayPal</span>
              </button>
            </div>
          </div>
          
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
              {withdrawMethod === 'bank' ? t('wallet.accountDetails') : t('wallet.paypalEmail')}
            </label>
            <input
              type={withdrawMethod === 'bank' ? 'text' : 'email'}
              value={accountDetails}
              onChange={handleAccountDetailsChange}
              className="w-full p-3 border-2 border-gray-300 dark:border-stone-600 rounded-lg focus:ring-purple-500 focus:border-purple-500 dark:bg-midnight-800 dark:text-white"
              placeholder={withdrawMethod === 'bank' 
                ? t('wallet.enterAccountDetails')
                : t('wallet.enterPaypalEmail')
              }
              required
            />
          </div>
          
          <div className="pt-3 border-t border-gray-200 dark:border-stone-700/20">
            <button
              type="submit"
              disabled={loading || amount <= 0 || amount > currentBalance}
              className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              ) : null}
              {loading 
                ? t('common.processing') 
                : t('wallet.confirmWithdrawal')}
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-500 dark:text-stone-400 text-center">
            <div className="flex items-center justify-center">
              <FaLock className="mr-1" />
              <span>{t('wallet.secureTransaction')}</span>
            </div>
            <p className="mt-1">{t('wallet.withdrawalNote')}</p>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default WalletWithdrawDialog;
