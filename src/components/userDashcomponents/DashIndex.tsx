import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBox, FaArrowRight, FaWallet, FaMoneyBillWave,
  FaArrowUp, FaArrowDown, FaExchangeAlt, FaCreditCard
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  date: string;
  description: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

const DashIndex = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletData>({
    balance: 0,
    transactions: [
      {
        id: 1,
        type: 'deposit',
        amount: 12000,
        date: 'Today',
        description: 'Deposit to account'
      },
      {
        id: 2,
        type: 'payment',
        amount: 3500,
        date: 'Yesterday',
        description: 'Payment for shipping'
      },
      {
        id: 3,
        type: 'withdrawal',
        amount: 5000,
        date: 'Mar 20',
        description: 'Withdrawal to bank'
      }
    ]
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check authentication from context
        if (!isAuthenticated || !user) {
          setError('User not authenticated. Please log in again.');
          setIsLoading(false);
          return;
        }
        
        // User is authenticated, fetch wallet data
        const userId = user.id;
        
        try {
          // Direct Supabase query for wallet data - simpler approach
          const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching wallet:', error);
            throw new Error(`Failed to fetch wallet: ${error.message}`);
          }
          
          console.log('Wallet data from Supabase:', data);
          
          if (data) {
            // Wallet found
            setWalletData(prevData => ({
              ...prevData,
              balance: data.balance || 0
            }));
            
            // Fetch recent transactions
            fetchRecentTransactions(userId);
          } else {
            // No wallet found - create one
            console.log('No wallet found, creating new wallet for user', userId);
            
            const { data: newWallet, error: createError } = await supabase
              .from('wallets')
              .insert({
                user_id: userId,
                balance: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (createError) {
              console.error('Error creating wallet:', createError);
              throw new Error(`Failed to create wallet: ${createError.message}`);
            }
            
            console.log('Wallet created successfully:', newWallet);
            
            if (newWallet) {
              setWalletData(prevData => ({
                ...prevData,
                balance: newWallet.balance || 0
              }));
              
              toast.success('Wallet created successfully!');
              // Also fetch recent transactions if wallet was created successfully
              fetchRecentTransactions(userId);
            } else {
              setError('Failed to create wallet: No wallet data returned');
            }
          }
        } catch (dbErr) {
          console.error('Database operation failed:', dbErr);
          setError(`Database error: ${(dbErr as Error).message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError(`An unexpected error occurred: ${(err as Error).message || 'Please refresh and try again.'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchRecentTransactions = async (userId: string) => {
      try {
        // Try the first table name
        try {
          const { data, error } = await supabase
            .from('wallet_transactions') // Try singular form first
            .select('id, type, amount, created_at, description')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(3);
            
          if (error) {
            // If the first attempt fails with table not found error, try the alternate name
            if (error.code === '42P01') {
              console.log('Table wallet_transactions not found, trying wallet_transactions...');
              // Try plural form as fallback
              const { data: data2, error: error2 } = await supabase
                .from('wallet_transactions')
                .select('id, type, amount, created_at, description')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(3);
                
              if (error2) {
                console.error('Error fetching wallet transactions (second attempt):', error2);
                // Try one more alternate table name format
                if (error2.code === '42P01') {
                  console.log('Trying third table name format: transactions...');
                  const { data: data3, error: error3 } = await supabase
                    .from('transactions')
                    .select('id, type, amount, created_at, description')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(3);
                    
                  if (error3) {
                    console.error('All transaction table attempts failed:', error3);
                  } else if (data3 && data3.length > 0) {
                    updateTransactionState(data3);
                  }
                }
              } else if (data2 && data2.length > 0) {
                updateTransactionState(data2);
              }
            } else {
              console.error('Error fetching wallet transactions:', error);
            }
          } else if (data && data.length > 0) {
            updateTransactionState(data);
          }
        } catch (dbError) {
          console.error('Database query error:', dbError);
        }
      } catch (err) {
        console.error('Error in transaction fetch function:', err);
      }
      
      // Helper function to update transaction state with fetched data
      function updateTransactionState(data: any[]) {
        const formattedTransactions = data.map(tx => ({
          id: tx.id,
          type: tx.type || 'payment',
          amount: tx.amount,
          date: formatRelativeDate(tx.created_at),
          description: tx.description || 'Transaction'
        }));
        
        setWalletData(prevData => ({
          ...prevData,
          transactions: formattedTransactions
        }));
      }
    };
    
    // Helper function to format dates relative to now (e.g., "Today", "Yesterday", etc.)
    const formatRelativeDate = (dateString: string): string => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      
      // Format date as MMM DD (e.g., Mar 20)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    if (isAuthenticated) {
      fetchWalletBalance();
    }
  }, [isAuthenticated, user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <FaArrowDown className="text-green-500" />;
      case 'withdrawal':
        return <FaArrowUp className="text-red-500" />;
      case 'payment':
        return <FaExchangeAlt className="text-purple-500" />;
      default:
        return <FaExchangeAlt className="text-gray-500" />;
    }
  };

  // Handle deposit button click
  const handleDepositClick = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to deposit funds');
      return;
    }
    
    // Navigate to wallet page with deposit action
    navigate('/dashboard/wallet?action=deposit');
  };

  // Handle action buttons
  const handleQuickAction = (action: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to perform this action');
      return;
    }
    
    // Navigate to wallet page with specific action
    navigate(`/dashboard/wallet?action=${action}`);
  };

  return (
    <div className="space-y-8">
      {/* Wallet Overview */}
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
        className="bg-white dark:bg-midnight-800 rounded-xl shadow-md border border-gray-100 dark:border-stone-700/10 overflow-hidden"
      >
        <div className="flex flex-col md:flex-row">
          {/* Balance Card */}
          <div className="p-8 md:w-1/3 md:border-r border-b md:border-b-0 border-gray-100 dark:border-stone-700/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Wallet Balance</h2>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FaWallet className="text-purple-500" />
              </div>
      </div>

            <div>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-10 w-40 bg-gray-200 dark:bg-midnight-700 rounded mb-3"></div>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-midnight-700 rounded mb-6"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 dark:text-red-400 mb-3">
                  <p>Unable to load balance</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : (
                <>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                    {formatCurrency(walletData.balance)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-stone-400 mb-6">Available balance</p>
                </>
              )}
              
              <div className="flex gap-3">
                <Link 
                  to="/dashboard/wallet" 
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <FaWallet className="text-xs" />
                  <span>Manage</span>
                </Link>
                <button 
                  onClick={handleDepositClick}
                  disabled={isLoading}
                  className={`px-5 py-2.5 ${isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-100 dark:bg-midnight-700 hover:bg-gray-200 dark:hover:bg-midnight-600'} text-gray-700 dark:text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm`}
                >
                  <FaArrowDown className="text-xs" />
                  <span>Deposit</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="p-8 md:w-2/3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
              <Link 
                to="/dashboard/wallet" 
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
              >
                View All
                <FaArrowRight className="text-xs" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {isLoading ? (
                Array(3).fill(0).map((_, idx) => (
                  <div key={idx} className="animate-pulse flex items-center justify-between p-4 border border-gray-100 dark:border-stone-700/10 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-midnight-700"></div>
                      <div>
                        <div className="h-4 w-20 bg-gray-200 dark:bg-midnight-700 rounded mb-2"></div>
                        <div className="h-3 w-32 bg-gray-200 dark:bg-midnight-700 rounded mb-1"></div>
                        <div className="h-3 w-16 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                      </div>
                    </div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                  </div>
                ))
              ) : walletData.transactions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 dark:text-stone-400">No transactions yet</p>
                </div>
              ) : (
                walletData.transactions.map(transaction => (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-gray-100 dark:border-stone-700/10 rounded-xl hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-midnight-700 flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{transaction.type}</p>
                        <p className="text-xs text-gray-500 dark:text-stone-400">{transaction.description}</p>
                        <p className="text-xs text-gray-400 dark:text-stone-500 mt-1">{transaction.date}</p>
        </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'deposit' 
                          ? 'text-green-600 dark:text-green-400' 
                          : transaction.type === 'payment' 
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 grid grid-cols-4 gap-3">
              <button 
                onClick={() => handleQuickAction('deposit')}
                className="p-3 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex flex-col items-center hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors shadow-sm"
              >
                <FaMoneyBillWave className="mb-1.5 text-lg" />
                <span className="text-xs font-medium">Deposit</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('withdraw')}
                className="p-3 bg-purple-50 text-purple-600 rounded-xl flex flex-col items-center hover:bg-purple-100 transition-colors shadow-sm"
              >
                <FaArrowUp className="mb-1.5 text-lg" />
                <span className="text-xs font-medium">Withdraw</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('transfer')}
                className="p-3 bg-blue-50 text-blue-600 rounded-xl flex flex-col items-center hover:bg-blue-100 transition-colors shadow-sm"
              >
                <FaExchangeAlt className="mb-1.5 text-lg" />
                <span className="text-xs font-medium">Transfer</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('cards')}
                className="p-3 bg-gray-50 text-gray-700 rounded-xl flex flex-col items-center hover:bg-gray-100 transition-colors shadow-sm"
              >
                <FaCreditCard className="mb-1.5 text-lg" />
                <span className="text-xs font-medium">Cards</span>
              </button>
            </div>
                    </div>
                  </div>
                </motion.div>
      
      {/* Recent Shipments */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
        className="bg-white dark:bg-midnight-800 rounded-xl shadow-md border border-gray-100 dark:border-stone-700/10 overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-stone-700/10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Shipments</h2>
          <Link 
            to="/dashboard/track-order" 
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
          >
            View All
            <FaArrowRight className="text-xs" />
              </Link>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-stone-700/10">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="p-5 hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <FaBox className="text-purple-600 dark:text-purple-400 text-lg" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Package #{1000 + idx}</h3>
                    <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">Arriving today</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full font-medium">
                    On Time
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Est. arrival: 2:30 PM</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      </div>
  );
};

export default DashIndex;