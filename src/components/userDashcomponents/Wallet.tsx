import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaWallet, FaMoneyBillWave, FaCreditCard, FaHistory, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getUserWallet, getWalletTransactions } from '../../utils/stripe';
import { supabase, getCurrentUser } from '../../utils/supabase';
import { Wallet as WalletType, WalletTransaction } from '../../types/database.types';
import WalletFundDialog from './wallet/WalletFundDialog';

const Wallet: React.FC = () => {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFundDialogOpen, setIsFundDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWalletData() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          toast.error(t('errors.notLoggedIn'));
          return;
        }

        setUserId(user.id);
        const userWallet = await getUserWallet(user.id);
        setWallet(userWallet);

        if (userWallet) {
          const walletTransactions = await getWalletTransactions(userWallet.id);
          setTransactions(walletTransactions);
        }
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        toast.error(t('errors.fetchingWallet'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchWalletData();
  }, [t]);

  const handleWalletFunded = async () => {
    if (userId) {
      try {
        setIsLoading(true);
        const userWallet = await getUserWallet(userId);
        setWallet(userWallet);
        
        if (userWallet) {
          const walletTransactions = await getWalletTransactions(userWallet.id);
          setTransactions(walletTransactions);
        }
        
        toast.success(t('wallet.fundSuccess'));
      } catch (error) {
        console.error('Error refreshing wallet data:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: wallet?.currency || 'USD',
    }).format(amount);
  };

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-500';
      case 'withdrawal':
        return 'text-red-500';
      case 'payment':
        return 'text-yellow-500';
      case 'earnings':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getTransactionStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-sunset-500 text-2xl" />
        <span className="ml-2 text-sunset-500">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center mb-6">
        <FaWallet className="text-sunset-500 text-2xl mr-2" />
        <h2 className="text-2xl font-semibold">{t('wallet.title')}</h2>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-r from-sunset-600 to-sunset-400 rounded-xl p-6 text-white shadow-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FaWallet className="text-white text-2xl mr-2" />
            <h3 className="text-xl font-semibold">{t('wallet.myWallet')}</h3>
          </div>
          <button
            onClick={() => setIsFundDialogOpen(true)}
            className="bg-white text-sunset-600 px-4 py-2 rounded-lg flex items-center hover:bg-pearl-50 transition-colors"
          >
            <FaMoneyBillWave className="mr-2" />
            {t('wallet.addFunds')}
          </button>
        </div>
        <div className="border-b border-white/20 mb-4 pb-4">
          <div className="text-sm opacity-80">{t('wallet.availableBalance')}</div>
          <div className="text-3xl font-bold mt-1">
            {wallet ? formatCurrency(wallet.balance) : '$0.00'}
          </div>
        </div>
        <div className="text-sm opacity-80">
          {t('wallet.lastUpdated')}: {wallet?.last_updated ? formatDate(wallet.last_updated) : '-'}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-midnight-800 rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <FaHistory className="text-sunset-500 text-xl mr-2" />
          <h3 className="text-xl font-semibold">{t('wallet.transactionHistory')}</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>{t('wallet.noTransactions')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-midnight-600">
                  <th className="pb-2">{t('wallet.date')}</th>
                  <th className="pb-2">{t('wallet.type')}</th>
                  <th className="pb-2">{t('wallet.amount')}</th>
                  <th className="pb-2">{t('wallet.status')}</th>
                  <th className="pb-2">{t('wallet.description')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-midnight-700 hover:bg-midnight-700/50">
                    <td className="py-3">{formatDate(transaction.created_at)}</td>
                    <td className={`py-3 capitalize ${getTransactionTypeStyle(transaction.type)}`}>
                      {t(`wallet.transactionTypes.${transaction.type}`)}
                    </td>
                    <td className="py-3">
                      <span className={transaction.type === 'deposit' || transaction.type === 'earnings' ? 'text-green-500' : 'text-red-500'}>
                        {transaction.type === 'deposit' || transaction.type === 'earnings' ? '+ ' : '- '}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getTransactionStatusStyle(transaction.status)}`}>
                        {t(`wallet.transactionStatus.${transaction.status}`)}
                      </span>
                    </td>
                    <td className="py-3 text-sm max-w-xs truncate">
                      {transaction.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fund Wallet Dialog */}
      <WalletFundDialog 
        isOpen={isFundDialogOpen} 
        onClose={() => setIsFundDialogOpen(false)}
        onSuccess={handleWalletFunded}
        userId={userId || ''}
      />
    </motion.div>
  );
};

export default Wallet;
