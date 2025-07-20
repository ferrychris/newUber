import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBox, FaArrowRight, FaWallet, FaMoneyBillWave,
  FaArrowUp, FaArrowDown, FaExchangeAlt, 
  FaPlus, FaMapMarkerAlt, FaFire, FaCoins
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from './orders/types';
import { Dialog, DialogContent } from '@mui/material';
import OrderDetailsView from '../shared/OrderDetailsView';

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
  driver_id?: string;
  payment_status?: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

const DashIndex = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  
  // Order details modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Function to get status color classes
  const getStatusClasses = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case OrderStatus.ACCEPTED:
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
        setIsLoadingWallet(true);
        setError(null);
        
        // Check authentication from context
        if (!isAuthenticated || !user) {
          console.log('User not authenticated');
          setIsLoadingWallet(false);
          return;
        }

        console.log('Fetching wallet data for user:', user.id);
        
        // Get wallet balance
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance, id')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          console.error('Error fetching wallet:', walletError);
          setError('Failed to load wallet data');
          setIsLoadingWallet(false);
          return;
        }

        if (!walletData) {
          console.log('No wallet found, creating one...');
          // Create wallet if none exists
          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert([
              { user_id: user.id, balance: 0 }
            ])
            .select()
            .single();

          if (createError) {
            console.error('Error creating wallet:', createError);
            setError('Failed to create wallet');
            setIsLoadingWallet(false);
            return;
          }

          setWalletData({ balance: 0, transactions: [] });
          setIsLoadingWallet(false);
          return;
        }

        // Get 2 most recent transactions
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(2);

        if (txError) {
          console.error('Error fetching transactions:', txError);
        }

        setWalletData({
          balance: walletData.balance,
          transactions: transactions || []
        });
      } catch (err) {
        console.error('Unexpected error fetching wallet data:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoadingWallet(false);
      }
    };
    
    if (isAuthenticated) {
      fetchWalletBalance();
      fetchRecentOrders();
    }
  }, [isAuthenticated]);

  // Function to fetch orders that haven't been completed yet
  const fetchRecentOrders = async () => {
    try {
      setIsLoadingOrders(true);
      
      // Get the currently authenticated user or fallback to ID 2
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "2"; // Use authenticated user ID if available, or fallback to ID 2
      
      console.log('Fetching non-completed orders for user:', userId);
      
      // Define statuses we want to exclude (COMPLETED and CANCELLED)
      const excludedStatuses = [OrderStatus.COMPLETED, OrderStatus.CANCELLED];
      
      // First query: Get active orders (orders in progress)
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(id, name)')
        .eq('user_id', userId)
        .not('status', 'in', `(${excludedStatuses.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(5); // Increased limit to show more active orders
        
      if (error) {
        console.error('Error fetching non-completed orders:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`${data.length} in-progress orders found for user ${userId}`);
        setRecentOrders(data);
      } else {
        console.log('No in-progress orders found, fetching recent orders instead');
        
        // Fallback to recent orders if no active ones
        const { data: recentData, error: recentError } = await supabase
          .from('orders')
          .select('*, services(id, name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (!recentError && recentData) {
          setRecentOrders(recentData);
        } else if (recentError) {
          console.error('Error fetching recent orders:', recentError);
        }
      }
    } catch (err) {
      console.error('Error in fetchRecentOrders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Transaction color coding
  const getTransactionIconAndColor = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return {
          icon: <FaArrowUp className="text-green-500 dark:text-green-400" />,
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-600 dark:text-green-400',
          label: t('Deposit')
        };
      case 'withdrawal':
        return {
          icon: <FaArrowDown className="text-red-500 dark:text-red-400" />,
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          textColor: 'text-red-600 dark:text-red-400',
          label: t('Withdrawal')
        };
      case 'payment':
        return {
          icon: <FaMoneyBillWave className="text-orange-500 dark:text-orange-400" />,
          bgColor: 'bg-orange-100 dark:bg-orange-900/20', 
          textColor: 'text-orange-600 dark:text-orange-400',
          label: t('Payment')
        };
      case 'earnings':
        return {
          icon: <FaCoins className="text-blue-500 dark:text-blue-400" />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-600 dark:text-blue-400', 
          label: t('Earnings')
        };
      default:
        return {
          icon: <FaExchangeAlt className="text-gray-500 dark:text-gray-400" />,
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-600 dark:text-gray-400',
          label: t('Transaction')
        };
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Wallet section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 lg:col-span-2"
        >
          {/* Wallet Card */}
          <div className="relative bg-gradient-to-br from-purple-500 to-midnight-700 rounded-xl shadow-lg overflow-hidden p-5 text-white mb-4 border border-purple-400/20">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mt-20 -mr-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -mb-16 -ml-16"></div>
            
            <div className="relative z-10">
              {isLoadingWallet ? (
                <div className="animate-pulse">
                  <div className="h-4 w-16 bg-white/30 rounded mb-3"></div>
                  <div className="h-8 w-32 bg-white/30 rounded-lg mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-9 w-24 bg-white/30 rounded-lg"></div>
                    <div className="h-9 w-24 bg-white/30 rounded-lg"></div>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-4">
                  <p className="text-red-200 mb-3">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    {t('Try Again')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 mb-1">
                    <FaWallet className="text-purple-200" />
                    <span className="text-sm font-medium text-purple-100">{t('Wallet Balance')}</span>
                  </div>
                  <div className="mb-5">
                    <h3 className="text-3xl font-bold text-white">${walletData?.balance.toFixed(2) || '0.00'}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => navigate('/dashboard/wallet')}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all"
                    >
                      <FaWallet className="text-purple-200" size={14} />
                      <span className="font-medium">{t('Manage')}</span>
                    </button>
                    
                    <button 
                      onClick={() => navigate('/dashboard/wallet/deposit')}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/80 to-purple-800/80 hover:from-purple-600 hover:to-purple-800 backdrop-blur-sm rounded-lg shadow-md transition-all"
                    >
                      <FaPlus className="text-purple-200" size={12} />
                      <span className="font-medium">{t('Add Money')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-md border border-gray-100 dark:border-stone-700/10 overflow-hidden mb-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-stone-700/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 flex items-center justify-center shadow-sm">
                  <FaMoneyBillWave className="text-white text-xs" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('Recent Transactions')}</h2>
              </div>
              <Link 
                to="/dashboard/wallet" 
                className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/30 flex items-center gap-1 transition-colors"
              >
                {t('View All')} 
                <FaArrowRight className="text-[10px]" />
              </Link>
            </div>
            
            <div className="p-2">
              {isLoadingWallet ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="p-3 m-2 animate-pulse rounded-xl bg-gray-50 dark:bg-midnight-700/20 border border-gray-100 dark:border-stone-700/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-midnight-700"></div>
                        <div>
                          <div className="h-3.5 w-32 bg-gray-200 dark:bg-midnight-700 rounded mb-2"></div>
                          <div className="h-2.5 w-24 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                        </div>
                      </div>
                      <div className="h-4 w-16 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                    </div>
                  </div>
                ))
              ) : walletData?.transactions && walletData.transactions.length > 0 ? (
                walletData.transactions.map((transaction) => {
                  const { icon, bgColor, textColor, label } = getTransactionIconAndColor(transaction.type);
                  
                  return (
                    <div key={transaction.id} className="p-3 m-2 rounded-xl bg-white dark:bg-midnight-800/50 hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors border border-gray-100 dark:border-stone-700/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
                            {icon}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {transaction.description || label}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-stone-400">
                              {new Date(transaction.date || transaction.created_at || '').toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className={`text-sm font-medium ${transaction.type === 'deposit' || transaction.type === 'earnings' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.type === 'deposit' || transaction.type === 'earnings' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-stone-400">
                    {t('No recent transactions')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Orders section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
          className="bg-white dark:bg-midnight-800 rounded-xl shadow-md border border-gray-100 dark:border-stone-700/10 overflow-hidden mt-4 lg:mt-0"
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-stone-700/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 flex items-center justify-center shadow-sm">
                <FaBox className="text-white text-xs" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">In Progress Orders</h2>
            </div>
            <Link 
              to="/dashboard/orders" 
              className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/30 flex items-center gap-1 transition-colors"
            >
              View All
              <FaArrowRight className="text-[10px]" />
            </Link>
          </div>
          
          <div className="p-2">
            {isLoadingOrders ? (
              Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="p-3 m-2 animate-pulse rounded-xl bg-gray-50 dark:bg-midnight-700/20 border border-gray-100 dark:border-stone-700/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-midnight-700"></div>
                      <div>
                        <div className="h-3.5 w-32 bg-gray-200 dark:bg-midnight-700 rounded mb-2"></div>
                        <div className="h-2.5 w-24 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-midnight-700 rounded-full mb-2"></div>
                      <div className="h-2.5 w-12 bg-gray-200 dark:bg-midnight-700 rounded"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <FaBox className="text-purple-500 dark:text-purple-400 text-xl" />
                </div>
                <p className="text-base text-gray-500 dark:text-stone-400 mb-3">No active orders at the moment</p>
                <Link 
                  to="/dashboard/orders" 
                  className="mt-2 inline-block px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  Create an order
                </Link>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div 
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsOrderModalOpen(true);
                  }}
                  key={order.id} 
                  className="block p-3 m-2 rounded-xl bg-white dark:bg-midnight-800/50 hover:bg-purple-50 dark:hover:bg-midnight-700/40 transition-all border border-gray-100 dark:border-stone-700/10 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/10 flex items-center justify-center shadow-sm">
                        <FaBox className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {order.services?.name || 'Package Delivery'}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-stone-400 mt-1">
                          <FaMapMarkerAlt className="text-xs text-purple-500 dark:text-purple-400" />
                          <span className="truncate max-w-[180px]">{order.pickup_location || 'Location unavailable'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium mb-1 ${getStatusClasses(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog
          open={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          fullWidth
          maxWidth="md"
          PaperProps={{
            style: {
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: 'transparent'
            }
          }}
        >
          <DialogContent style={{ padding: 0, backgroundColor: 'transparent' }}>
            <OrderDetailsView 
              {...selectedOrder}
              price={selectedOrder.estimated_price || 0}
              payment_status="paid"
              updated_at={selectedOrder.created_at} // Using created_at as fallback for updated_at
              service={{
                id: selectedOrder.service_id,
                name: selectedOrder.services?.name || 'Delivery Service',
                type: 'delivery',
                description: 'Package delivery service',
                minPrice: selectedOrder.estimated_price || 0,
                image: '',
                theme: {
                  bg: 'bg-purple-100',
                  text: 'text-purple-800',
                  border: 'border-purple-300'
                }
              }}
              showUserDetails={false}
              isDriver={false}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DashIndex;
