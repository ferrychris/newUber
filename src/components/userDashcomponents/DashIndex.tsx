import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FaWallet, FaPlus, FaHistory
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface WalletData {
  balance: number;
}

interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  created_at: string;
  type: string;
  description: string | null;
  status: 'pending' | 'completed' | 'failed' | 'processing' | 'cancelled';
}

interface Order {
  id: string;
  user_id: string;
  service_id: string;
  pickup_location: string;
  dropoff_location: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  estimated_price: number;
  actual_price?: number;
  created_at: string;
  services?: {
    id: string;
    name: string;
  };
}

const DashIndex = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Fetch wallet balance
  const fetchWalletBalance = useCallback(async () => {
    try {
      setIsLoadingWallet(true);
      setError(null);
      
      if (!isAuthenticated || !user) return;

      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Create wallet if it doesn't exist
        const { error: createError } = await supabase
          .from('wallets')
          .insert([{ user_id: user.id, balance: 0 }]);

        if (createError) {
          console.error('Error creating wallet:', createError);
          setError('Failed to create wallet');
          return;
        }

        setWalletData({ balance: 0 });
        return;
      }

      if (walletError) {
        console.error('Error fetching wallet:', walletError);
        setError('Failed to load wallet');
        return;
      }

      setWalletData({ balance: walletData.balance });
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoadingWallet(false);
    }
  }, [isAuthenticated, user]);

  // Fetch active orders
  const fetchActiveOrders = useCallback(async () => {
    try {
      setIsLoadingOrders(true);
      
      if (!isAuthenticated || !user) return;

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .not('status', 'in', '(completed,cancelled)')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching active orders:', error);
        return;
      }

      setActiveOrders(orders || []);
    } catch (err) {
      console.error('Unexpected error fetching active orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isAuthenticated, user]);

  // Fetch recent transactions
  const fetchRecentTransactions = useCallback(async () => {
    try {
      setIsLoadingTransactions(true);
      
      if (!isAuthenticated || !user) return;

      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) {
        console.error('Error fetching recent transactions:', error);
        return;
      }

      setRecentTransactions(transactions || []);
    } catch (err) {
      console.error('Unexpected error fetching recent transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [isAuthenticated, user]);

  // Fetch wallet balance, orders, and transactions on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWalletBalance();
      fetchActiveOrders();
      fetchRecentTransactions();
    }
  }, [isAuthenticated, user, fetchWalletBalance, fetchActiveOrders, fetchRecentTransactions]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Login Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please log in to access your dashboard
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Dashboard
          </p>
        </div>

        {/* Main Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Wallet Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-purple-700 rounded-2xl shadow-2xl p-6 text-white"
          >
            {/* Oval Gradients */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-400/30 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-64 bg-purple-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                Wallet Balance
              </h2>
              <FaWallet className="text-white/90 text-2xl" />
            </div>
            
            {isLoadingWallet ? (
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 dark:text-red-400">
                <p className="text-sm">{error}</p>
                <button
                  onClick={fetchWalletBalance}
                  className="text-purple-600 dark:text-purple-400 hover:underline mt-1 text-sm"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-white mb-1">
                  {formatCurrency(walletData?.balance || 0)}
                </p>
                <p className="text-sm text-white/80">
                  Available Balance
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigate('/wallet/topup')}
                className="flex-1 bg-white text-purple-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all duration-200 border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md"
              >
                <FaPlus className="text-xs" />
                Top Up
              </button>
              <button
                onClick={() => navigate('/dashboard/wallet')}
                className="flex-1 bg-gradient-to-r from-purple-500/10 via-purple-600/10 to-purple-700/10 hover:from-purple-500/20 hover:to-purple-700/20 backdrop-blur-sm text-white/90 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all duration-200 border border-white/10 hover:border-white/20 shadow-sm hover:shadow-purple-500/10"
              >
                <FaHistory className="text-xs" />
                History
              </button>
            </div>
            <style>
              {`
              @keyframes blob {
                0% {
                  transform: translate(0px, 0px) scale(1);
                }
                33% {
                  transform: translate(30px, -30px) scale(1.1);
                }
                66% {
                  transform: translate(-30px, 30px) scale(0.9);
                }
                100% {
                  transform: translate(0px, 0px) scale(1);
                }
              }
              .animate-blob {
                animation: blob 15s infinite;
              }
              .animation-delay-2000 {
                animation-delay: 2s;
              }
              .animation-delay-4000 {
                animation-delay: 4s;
              }
              `}
            </style>
          </motion.div>

          {/* Active Orders Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Orders
              </h2>
              <button
                onClick={() => navigate('/dashboard/orders')}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 text-sm font-medium"
              >
                View All
              </button>
            </div>
            
            <div className="space-y-2">
              {isLoadingOrders ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : activeOrders.length > 0 ? (
                activeOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg p-2 -m-2 transition-colors duration-200"
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {order.services?.name || 'Service'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {order.pickup_location} → {order.dropoff_location}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            order.status === 'accepted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            order.status === 'picked_up' || order.status === 'in_transit' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {formatCurrency(order.estimated_price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No active orders
                  </p>
                  <button
                    onClick={() => navigate('/services')}
                    className="mt-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 text-sm font-medium"
                  >
                    Book a Service
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Transactions
            </h2>
            <button
              onClick={() => navigate('/dashboard/wallet')}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 text-sm font-medium"
            >
              View More
            </button>
          </div>
          
          <div className="space-y-2">
            {isLoadingTransactions ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      <div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-1"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
                  </div>
                ))}
              </div>
            ) : recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      transaction.amount >= 0 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        transaction.amount >= 0 
                          ? 'bg-green-600 dark:bg-green-400' 
                          : 'bg-red-600 dark:bg-red-400'
                      }`}></div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                        {transaction.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${
                      transaction.amount >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </p>
                    <span className={`text-xs px-1 py-0.5 rounded-full font-medium capitalize ${
                      transaction.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      transaction.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No recent transactions
                </p>
                <button
                  onClick={() => navigate('/dashboard/wallet')}
                  className="mt-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 text-sm font-medium"
                >
                  Add Funds to Get Started
                </button>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default DashIndex;
