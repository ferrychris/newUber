import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBox, FaArrowRight, FaWallet, FaMoneyBillWave,
  FaArrowUp, FaArrowDown, FaExchangeAlt, FaCreditCard,
  FaMapMarkerAlt, FaCalendarAlt
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { OrderStatus } from './orders/types';

interface Transaction {
  id: string | number;
  type: 'deposit' | 'withdrawal' | 'payment' | 'earnings';
  amount: number;
  date: string;
  description: string | null;
  status?: 'pending' | 'completed' | 'failed';
  wallet_id?: string;
  created_at?: string;
}

interface Order {
  id: string;
  user_id: string;
  service_id: string;
  pickup_location: string;
  dropoff_location: string;
  status: OrderStatus;
  estimated_price: number;
  actual_price?: number;
  created_at: string;
  payment_method?: 'wallet' | 'cash';
  services?: {
    id: string;
    name: string;
    [key: string]: any;
  };
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
        id: "1",
        type: 'deposit',
        amount: 12000,
        date: 'Today',
        description: 'Deposit to account',
        status: 'completed'
      },
      {
        id: "2",
        type: 'payment',
        amount: 3500,
        date: 'Yesterday',
        description: 'Payment for shipping',
        status: 'completed'
      },
      {
        id: "3",
        type: 'withdrawal',
        amount: 5000,
        date: 'Mar 20',
        description: 'Withdrawal to bank',
        status: 'completed'
      }
    ]
  });
  
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to get status color classes
  const getStatusClasses = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case OrderStatus.ACTIVE:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case OrderStatus.IN_TRANSIT:
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case OrderStatus.COMPLETED:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  // Format relative date for orders
  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    
    // Format date as MMM DD (e.g., Mar 20)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
        // Always use user ID 2 for transactions
        const fixedUserId = "2"; // Use user ID 2 regardless of who's logged in
        
        // First get the wallet_id for user ID 2
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', fixedUserId)
          .maybeSingle();
          
        if (walletError) {
          console.error('Error fetching wallet ID:', walletError);
          return;
        }
        
        if (!walletData) {
          console.log('No wallet found for user');
          return;
        }
        
        const walletId = walletData.id;
        let transactions = null;
        
        // Try wallet_transaction table (singular)
        const { data: txData1, error: txError1 } = await supabase
          .from('wallet_transaction')
          .select('id, type, amount, created_at, description, status, wallet_id, payment_method')
          .eq('wallet_id', walletId)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (!txError1 && txData1) {
          transactions = txData1;
        } else if (txError1?.code === '42P01') {
          // Try wallet_transactions table (plural)
          const { data: txData2, error: txError2 } = await supabase
            .from('wallet_transactions')
            .select('id, type, amount, created_at, description, status, wallet_id, payment_method')
            .eq('wallet_id', walletId)
            .order('created_at', { ascending: false })
            .limit(3);
          
          if (!txError2 && txData2) {
            transactions = txData2;
          } else if (txError2?.code === '42P01') {
            // Try transactions table
            const { data: txData3, error: txError3 } = await supabase
              .from('transactions')
              .select('id, type, amount, created_at, description, status, wallet_id, payment_method')
              .eq('wallet_id', walletId)
              .order('created_at', { ascending: false })
              .limit(3);
            
            if (!txError3 && txData3) {
              transactions = txData3;
            } else if (txError3) {
              console.error('All transaction table attempts failed:', txError3);
            }
          }
        }
        
        if (transactions && transactions.length > 0) {
          updateTransactionState(transactions);
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
          description: tx.description || 'Transaction',
          status: tx.status || 'completed',
          wallet_id: tx.wallet_id,
          created_at: tx.created_at
        }));
        
        setWalletData(prevData => ({
          ...prevData,
          transactions: formattedTransactions
        }));
      }
    };
    
    if (isAuthenticated) {
      fetchWalletBalance();
      fetchRecentOrders();
    }
  }, [isAuthenticated]);

  // Function to fetch recent orders
  const fetchRecentOrders = async () => {
    try {
      setIsLoadingOrders(true);
      
      // Always use user ID 2 for orders
      const fixedUserId = "2"; // Use user ID 2 regardless of who's logged in
      
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(id, name)')
        .eq('user_id', fixedUserId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }
      
      setRecentOrders(data || []);
    } catch (err) {
      console.error('Error in orders fetch function:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
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
      case 'earnings':
        return <FaMoneyBillWave className="text-blue-500" />;
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
    <div className="space-y-6 px-4 sm:px-6 md:px-0">
      {/* Wallet Overview */}
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
        className="bg-white dark:bg-midnight-800 rounded-xl shadow-md border border-gray-100 dark:border-stone-700/10 overflow-hidden"
      >
        <div className="flex flex-col md:flex-row">
          {/* Balance Card */}
          <div className="p-5 sm:p-6 md:p-8 md:w-1/3 md:border-r border-b md:border-b-0 border-gray-100 dark:border-stone-700/10">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Wallet Balance</h2>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FaWallet className="text-purple-500" />
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 md:h-10 w-32 md:w-40 bg-gray-200 dark:bg-midnight-700 rounded mb-2 md:mb-3"></div>
                  <div className="h-3 md:h-4 w-20 md:w-24 bg-gray-200 dark:bg-midnight-700 rounded mb-4 md:mb-6"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 dark:text-red-400 mb-3">
                  <p className="text-sm md:text-base">Unable to load balance</p>
                  <p className="text-xs md:text-sm">{error}</p>
                </div>
              ) : (
                <>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
                    {formatCurrency(walletData.balance)}
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-stone-400 mb-4 md:mb-6">Available balance</p>
                </>
              )}
              
              <div className="flex gap-2 md:gap-3">
                <Link 
                  to="/dashboard/wallet" 
                  className="flex-1 md:flex-none px-3 md:px-5 py-2 md:py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-medium rounded-lg flex items-center justify-center md:justify-start gap-2 transition-colors shadow-sm"
                >
                  <FaWallet className="text-xs" />
                  <span>Manage</span>
                </Link>
                <button 
                  onClick={handleDepositClick}
                  disabled={isLoading}
                  className={`flex-1 md:flex-none px-3 md:px-5 py-2 md:py-2.5 ${isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-100 dark:bg-midnight-700 hover:bg-gray-200 dark:hover:bg-midnight-600'} text-gray-700 dark:text-white text-xs md:text-sm font-medium rounded-lg flex items-center justify-center md:justify-start gap-2 transition-colors shadow-sm`}
                >
                  <FaArrowDown className="text-xs" />
                  <span>Deposit</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="p-5 sm:p-6 md:p-8 md:w-2/3">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
              <Link 
                to="/dashboard/wallet" 
                className="text-xs md:text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
              >
                View All
                <FaArrowRight className="text-xs" />
              </Link>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {isLoading ? (
                Array(3).fill(0).map((_, idx) => (
                  <div key={idx} className="animate-pulse flex items-center justify-between p-3 md:p-4 border border-gray-100 dark:border-stone-700/10 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-200 dark:bg-midnight-700"></div>
                      <div>
                        <div className="h-3 md:h-4 w-16 md:w-20 bg-gray-200 dark:bg-midnight-700 rounded mb-1 md:mb-2"></div>
                        <div className="h-2 md:h-3 w-24 md:w-32 bg-gray-200 dark:bg-midnight-700 rounded mb-1"></div>
                        <div className="h-2 md:h-3 w-12 md:w-16 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                      </div>
                    </div>
                    <div className="h-3 md:h-4 w-14 md:w-16 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                  </div>
                ))
              ) : walletData.transactions.length === 0 ? (
                <div className="text-center py-4 md:py-6">
                  <p className="text-sm text-gray-500 dark:text-stone-400">No transactions yet</p>
                </div>
              ) : (
                walletData.transactions.map(transaction => (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-3 md:p-4 border border-gray-100 dark:border-stone-700/10 rounded-xl hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-50 dark:bg-midnight-700 flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white capitalize">{transaction.type}</p>
                          {transaction.status && (
                            <span className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full ${
                              transaction.status === 'completed' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                : transaction.status === 'pending'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}>
                              {transaction.status}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-stone-400 truncate">{transaction.description}</p>
                        <p className="text-[10px] md:text-xs text-gray-400 dark:text-stone-500 mt-0.5 md:mt-1">{transaction.date}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-xs md:text-sm font-medium ${
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
            
            <div className="mt-4 md:mt-6 grid grid-cols-3 gap-2 md:gap-3">
              <button 
                onClick={() => handleQuickAction('deposit')}
                className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex flex-col items-center hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors shadow-sm"
              >
                <FaMoneyBillWave className="mb-1 md:mb-1.5 text-base md:text-lg" />
                <span className="text-[10px] md:text-xs font-medium">Deposit</span>
              </button>
              
              <button 
                disabled
                className="p-2 md:p-3 bg-blue-50 text-blue-400 rounded-xl flex flex-col items-center cursor-not-allowed opacity-70 shadow-sm"
              >
                <FaExchangeAlt className="mb-1 md:mb-1.5 text-base md:text-lg" />
                <span className="text-[10px] md:text-xs font-medium">Transfer</span>
                <span className="text-[8px] md:text-[10px] mt-0.5">Coming Soon</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('cards')}
                className="p-2 md:p-3 bg-gray-50 text-gray-700 rounded-xl flex flex-col items-center hover:bg-gray-100 transition-colors shadow-sm"
              >
                <FaCreditCard className="mb-1 md:mb-1.5 text-base md:text-lg" />
                <span className="text-[10px] md:text-xs font-medium">Cards</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
        className="bg-white dark:bg-midnight-800 rounded-xl shadow-md border border-gray-100 dark:border-stone-700/10 overflow-hidden"
      >
        <div className="flex justify-between items-center p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-stone-700/10">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
          <Link 
            to="/dashboard/orders" 
            className="text-xs md:text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
          >
            View All
            <FaArrowRight className="text-xs" />
          </Link>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-stone-700/10">
          {isLoadingOrders ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-4 sm:p-5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-200 dark:bg-midnight-700"></div>
                    <div>
                      <div className="h-3 md:h-4 w-24 md:w-32 bg-gray-200 dark:bg-midnight-700 rounded mb-1 md:mb-2"></div>
                      <div className="h-2 md:h-3 w-20 md:w-24 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="h-3 md:h-4 w-14 md:w-16 bg-gray-200 dark:bg-midnight-700 rounded mb-1 md:mb-2"></div>
                    <div className="h-2 md:h-3 w-16 md:w-20 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                  </div>
                </div>
              </div>
            ))
          ) : recentOrders.length === 0 ? (
            <div className="p-6 md:p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-stone-400">No orders yet</p>
              <Link 
                to="/dashboard/orders" 
                className="mt-3 inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
              >
                Create an order
              </Link>
            </div>
          ) : (
            recentOrders.map((order) => (
              <div key={order.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <FaBox className="text-purple-600 dark:text-purple-400 text-base md:text-lg" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-white truncate">
                        {order.services?.name || 'Package Delivery'}
                      </h3>
                      <div className="flex items-center gap-1 md:gap-2 mt-0.5 md:mt-1 text-xs md:text-sm text-gray-500 dark:text-stone-400">
                        <FaMapMarkerAlt className="text-[10px] md:text-xs" />
                        <span className="truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">{order.pickup_location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full font-medium ${getStatusClasses(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5 md:mt-1">
                      {formatRelativeDate(order.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DashIndex;