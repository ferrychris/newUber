import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaWallet, FaMoneyBillWave, FaCreditCard, FaHistory, 
  FaDownload, FaExchangeAlt, FaPlusCircle, FaArrowUp,
  FaArrowDown, FaChartLine
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { getUserWallet, getWalletTransactions } from '../../utils/stripe';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabase';
import WalletFundDialog from './WalletFundDialog';

// Type definitions
interface Card {
  id: number;
  number: string;
  expiry: string;
  type: string;
  isDefault: boolean;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  created_at: string;
}

interface WalletStatistics {
  savingsGoal: number;
  transactionHistory: number[];
}

interface WalletData {
  balance: number;
  currency: string;
  cards: Card[];
  statistics: WalletStatistics;
  last_updated?: string;
}

const Wallet: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<'cards'|'transactions'>('cards');
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [walletId, setWalletId] = useState<string>('');

  // Fetch wallet data when the component mounts
  useEffect(() => {
    fetchWalletData();
  }, [isAuthenticated, user, t]);

  const fetchWalletData = async () => {
    if (!isAuthenticated || !user) {
      toast.error(t('wallet.authRequired'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Get the user's wallet from Supabase directly
      let walletData;
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching wallet:', error);
        toast.error(t('wallet.loadError'));
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.log('No wallet found, creating new wallet for user', user.id);
        // Create a new wallet if none exists
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            balance: 0,
            currency: 'USD',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating wallet:', createError);
          toast.error(t('wallet.createError'));
          setLoading(false);
          return;
        }

        walletData = newWallet;
        toast.success(t('wallet.created'));
      } else {
        walletData = data;
      }
      
      // Store the wallet ID for later use
      setWalletId(walletData.id);
      
      // Set wallet data
      setWallet({
        balance: walletData.balance || 0,
        currency: walletData.currency || 'USD',
        cards: [
          {
            id: 1,
            number: '**** **** **** 4587',
            expiry: '09/25',
            type: 'visa',
            isDefault: true
          }
        ],
        statistics: {
          savingsGoal: 65,
          transactionHistory: [65, 59, 80, 81, 56, 55, 40, 50, 45, 65, 70, 75]
        },
        last_updated: walletData.updated_at
      });
      
      // Get transaction history
      fetchTransactionHistory(walletData.id);
    } catch (error) {
      console.error('Error in wallet data process:', error);
      toast.error(t('wallet.loadError'));
      setLoading(false);
    }
  };

  const fetchTransactionHistory = async (walletId: string) => {
    try {
      // Try multiple table names to handle different schema possibilities
      let transactions = null;
      let error = null;
      
      // Try wallet_transaction table
      const { data: txData1, error: txError1 } = await supabase
        .from('wallet_transaction')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });
      
      if (!txError1 && txData1) {
        transactions = txData1;
      } else if (txError1?.code === '42P01') {
        // Try wallet_transactions table
        const { data: txData2, error: txError2 } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletId)
          .order('created_at', { ascending: false });
        
        if (!txError2 && txData2) {
          transactions = txData2;
        } else if (txError2?.code === '42P01') {
          // Try transactions table
          const { data: txData3, error: txError3 } = await supabase
            .from('transactions')
            .select('*')
            .eq('wallet_id', walletId)
            .order('created_at', { ascending: false });
          
          if (!txError3 && txData3) {
            transactions = txData3;
          } else {
            error = txError3;
          }
        } else {
          error = txError2;
        }
      } else {
        error = txError1;
      }
      
      if (error && error.code !== '42P01') {
        console.error('Error fetching wallet transactions:', error);
      }
      
      if (transactions && transactions.length > 0) {
        setTransactions(transactions.map((tx: any) => ({
          id: tx.id,
          type: tx.type || 'payment',
          amount: tx.amount,
          date: formatDate(tx.created_at),
          status: tx.status || 'completed',
          description: tx.description || 'Transaction',
          created_at: tx.created_at
        })));
      }
    } catch (error) {
      console.error('Error in transaction fetch function:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <FaArrowDown className="text-green-500" />;
      case 'withdrawal':
        return <FaArrowUp className="text-red-500" />;
      case 'payment':
        return <FaExchangeAlt className="text-blue-500" />;
      case 'earnings':
        return <FaChartLine className="text-purple-500" />;
      default:
        return <FaExchangeAlt className="text-gray-500" />;
    }
  };

  const getTransactionStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300';
    }
  };

  const handleAddFunds = () => {
    if (!isAuthenticated) {
      toast.error(t('wallet.authRequired'));
      return;
    }
    
    if (!walletId) {
      toast.error(t('wallet.noWalletId'));
      return;
    }
    
    setIsAddFundsDialogOpen(true);
  };

  const handleFundSuccess = () => {
    // Refresh wallet data after successful fund addition
    fetchWalletData();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-64">
        <div className="animate-pulse text-sunset">{t('loading.walletBalance')}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{t('wallet.authRequired')}</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>{t('wallet.noWallet')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      {/* Add the fund dialog */}
      <AnimatePresence>
        {isAddFundsDialogOpen && wallet && (
          <WalletFundDialog
            isOpen={isAddFundsDialogOpen}
            onClose={() => setIsAddFundsDialogOpen(false)}
            walletId={walletId}
            onSuccess={handleFundSuccess}
            currentBalance={wallet.balance}
            userId={user?.id || ''}
          />
        )}
      </AnimatePresence>
      
      {/* Balance Overview */}
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 mb-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('wallet.title')}</h2>
          <div className="flex items-center gap-3">
            <button 
              className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              onClick={() => setActiveView('transactions')}
            >
              <FaHistory />
              <span>{t('wallet.history')}</span>
            </button>
            <button 
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              onClick={handleAddFunds}
              disabled={loading}
            >
              <FaPlusCircle />
              <span>{t('wallet.addFunds')}</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Balance Card */}
          <div className="bg-purple-600 text-white p-6 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FaWallet className="text-white" />
              </div>
              <h3 className="text-lg font-medium">{t('wallet.balance')}</h3>
            </div>
            
            <div className="text-3xl font-bold mb-3">{formatCurrency(wallet.balance)}</div>
            
            <div className="flex items-center text-white/70 text-sm">
              <FaChartLine className="mr-1" />
              <span>{t('wallet.availableBalance')}</span>
              {wallet.last_updated && (
                <span className="ml-2 text-xs">{t('wallet.lastUpdated')}: {formatDate(wallet.last_updated)}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200 dark:border-stone-700/20">
        <button 
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeView === 'cards' 
              ? 'border-purple-600 text-purple-600 dark:text-purple-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-white'
          }`}
          onClick={() => setActiveView('cards')}
        >
          {t('wallet.cards')}
        </button>
        <button 
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeView === 'transactions' 
              ? 'border-purple-600 text-purple-600 dark:text-purple-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-white'
          }`}
          onClick={() => setActiveView('transactions')}
        >
          {t('wallet.transactions')}
        </button>
      </div>

      {/* Content based on active tab */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <AnimatedTabPanel isActive={activeView === 'cards'}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('wallet.paymentMethods')}</h3>
                <button className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-500 text-sm font-medium">
                  + {t('wallet.addCard')}
                </button>
              </div>
              
              <div className="space-y-4">
                {wallet.cards.map(card => (
                  <div 
                    key={card.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-stone-700/20 rounded-lg hover:shadow-sm transition-shadow duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-200 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <FaCreditCard className="text-purple-600 dark:text-purple-400" />
        </div>

                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{card.number}</p>
                        <p className="text-gray-500 dark:text-stone-400 text-sm">Expires {card.expiry}</p>
                      </div>
          </div>
                    
                    {card.isDefault && (
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatedTabPanel>
        
          <AnimatedTabPanel isActive={activeView === 'transactions'}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('wallet.recentTransactions')}</h3>
                <button className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-500 text-sm font-medium">
                  {t('wallet.viewAll')}
                </button>
              </div>
              
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center p-4 text-gray-500 dark:text-stone-400">
                    {t('common.noDescription')}
                  </div>
                ) : (
                  transactions.map(transaction => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-stone-700/20 rounded-lg hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-midnight-700 flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium capitalize">
                            {t(`wallet.transaction.${transaction.type}`)}
                          </p>
                          <p className="text-gray-500 dark:text-stone-400 text-sm">{transaction.date}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-medium ${
                          transaction.type === 'deposit' || transaction.type === 'earnings' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'deposit' || transaction.type === 'earnings' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded ${getTransactionStatusStyle(transaction.status)}`}>
                          {t(`wallet.status.${transaction.status}`)}
                        </span>
                      </div>
          </div>
                  ))
        )}
      </div>
            </motion.div>
          </AnimatedTabPanel>
        </div>
        
        {/* Right Sidebar */}
        <div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('wallet.savingsGoal')}</h3>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-purple-600 dark:text-purple-400">
                    {wallet.statistics.savingsGoal}% Complete
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-gray-600 dark:text-stone-400">
                    $50,000 Goal
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200 dark:bg-purple-900/30">
                <div style={{ width: `${wallet.statistics.savingsGoal}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-600"></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-sm text-gray-600 dark:text-stone-400">
              <span>Current: {formatCurrency(wallet.balance)}</span>
              <span>Target: $50,000</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
            className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('wallet.quickActions')}</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="p-3 bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg flex flex-col items-center hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors duration-300"
                onClick={handleAddFunds}
              >
                <FaMoneyBillWave className="text-xl mb-1" />
                <span className="text-xs font-medium">{t('wallet.deposit')}</span>
              </button>
              
              <button className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg flex flex-col items-center hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors duration-300">
                <FaArrowUp className="text-xl mb-1" />
                <span className="text-xs font-medium">{t('wallet.withdrawal')}</span>
              </button>
              
              <button className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex flex-col items-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-300">
                <FaExchangeAlt className="text-xl mb-1" />
                <span className="text-xs font-medium">{t('wallet.transfer')}</span>
              </button>
              
              <button 
                className="p-3 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 rounded-lg flex flex-col items-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300"
                onClick={() => setActiveView('transactions')}
              >
                <FaHistory className="text-xl mb-1" />
                <span className="text-xs font-medium">{t('wallet.history')}</span>
              </button>
            </div>
    </motion.div>
        </div>
      </div>
    </div>
  );
};

// Helper component for animated tab transitions
const AnimatedTabPanel: React.FC<{ isActive: boolean; children: React.ReactNode }> = ({ 
  isActive, 
  children 
}) => {
  return (
    <div className={`transition-all duration-300 ${isActive ? 'block' : 'hidden'}`}>
      {children}
    </div>
  );
};

export default Wallet;
