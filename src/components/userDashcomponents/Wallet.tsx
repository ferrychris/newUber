import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  FaWallet, FaMoneyBillWave, FaHistory, 
  FaExchangeAlt, FaPlusCircle, FaMinusCircle, FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { supabase } from '../../utils/supabase';
import WalletFundDialog from './WalletFundDialog';
import WalletWithdrawDialog from './WalletWithdrawDialog';

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
  const { user, isAuthenticated } = useAuth();
  // State for active view
  const [activeView, setActiveView] = useState<'overview'|'transactions'>('overview');
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [walletId, setWalletId] = useState<string>('');

  // Fetch wallet data when the component mounts or after fund/withdraw operations
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWalletData();
    }
  }, [isAuthenticated, user]);

  const fetchWalletData = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // First check if the wallet exists using maybeSingle to avoid PGRST116 error
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Only throw non-RLS and non-PGRST116 errors
      if (walletError && walletError.code !== 'PGRST116' && walletError.code !== '42501') {
        throw walletError;
      }
      
      if (walletData) {
        // Use existing wallet
        setWallet({
          balance: walletData.balance,
          currency: walletData.currency,
          cards: [],
          statistics: {
            savingsGoal: 0,
            transactionHistory: []
          },
          last_updated: walletData.updated_at
        });
        setWalletId(walletData.id);
        
        // Fetch transaction history
        fetchTransactionHistory();
        return;
      }
      
      // Create a wallet if it doesn't exist
      try {
        const newWallet = {
          user_id: user.id,
          balance: 0,
          currency: 'EUR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: createdWallet, error: createError } = await supabase
          .from('wallets')
          .insert(newWallet)
          .select()
          .maybeSingle();
        
        if (createError) {
          if (createError.code === '42501') {
            // Handle RLS policy violation
            toast.warning('Unable to create wallet due to permission restrictions');
            setWallet({
              balance: 0,
              currency: 'EUR',
              cards: [],
              statistics: {
                savingsGoal: 0,
                transactionHistory: []
              },
              last_updated: new Date().toISOString()
            });
            return;
          }
          throw createError;
        }
        
        if (createdWallet) {
          setWallet({
            balance: createdWallet.balance,
            currency: createdWallet.currency,
            cards: [],
            statistics: {
              savingsGoal: 0,
              transactionHistory: []
            },
            last_updated: createdWallet.updated_at
          });
          setWalletId(createdWallet.id);
          toast.success('Wallet created successfully');
          
          // Fetch transaction history
          fetchTransactionHistory();
        }
      } catch (createError) {
        console.error('Error creating wallet:', createError);
        toast.error('Failed to create wallet');
        
        // Set default wallet UI even if creation failed
        setWallet({
          balance: 0,
          currency: 'EUR',
          cards: [],
          statistics: {
            savingsGoal: 0,
            transactionHistory: []
          },
          last_updated: new Date().toISOString()
        });
      }
      
    } catch (error: any) {
      console.error('Error fetching wallet data:', error);
      
      // Show more helpful error message based on error type
      if (error?.code === '42501') {
        toast.error('Permission denied: Unable to access wallet');
      } else if (error?.code === 'PGRST116') {
        toast.info('Creating new wallet...');
      } else {
        toast.error('Failed to load wallet data');
      }
      
      // Set default wallet UI even if fetching failed
      setWallet({
        balance: 0,
        currency: 'EUR',
        cards: [],
        statistics: {
          savingsGoal: 0,
          transactionHistory: []
        },
        last_updated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionHistory = async () => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      toast.error('Failed to load transaction history');
    }
  };

  const handleAddFunds = () => {
    if (!isAuthenticated) {
      toast.error('Authentication required. Please login.');
      return;
    }
    if (!walletId) {
      toast.error('Wallet ID not found');
      return;
    }
    setIsAddFundsDialogOpen(true);
  };
  
  const handleWithdraw = () => {
    if (!isAuthenticated) {
      toast.error('Authentication required. Please login.');
      return;
    }
    if (!walletId) {
      toast.error('Wallet ID not found');
      return;
    }
    if (!wallet || wallet.balance <= 0) {
      toast.error('Insufficient balance for withdrawal');
      return;
    }
    setIsWithdrawDialogOpen(true);
  };

  const handleWithdrawSuccess = () => {
    // Refresh wallet data and transaction history after withdrawal
    fetchWalletData();
    toast.success('Withdrawal processed successfully!');
  };
  
  const handleFundSuccess = () => {
    // Refresh wallet data after adding funds
    fetchWalletData();
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch(type) {
      case 'deposit':
        return <FaArrowUp className="text-green-500" />;
      case 'withdrawal':
        return <FaArrowDown className="text-red-500" />;
      case 'transfer':
        return <FaExchangeAlt className="text-blue-500" />;
      default:
        return <FaMoneyBillWave className="text-gray-500" />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-64">
        <div className="animate-pulse text-sunset">Loading wallet balance...</div>
      </div>
    );
  }

  // Authentication check
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>Please log in to view your wallet.</p>
        </div>
      </div>
    );
  }

  // Wallet check
  if (!wallet) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>No wallet found for your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-blue-600 flex items-center">
        <FaWallet className="mr-3" /> My Wallet
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Balance</h2>
          <div className="flex items-center justify-between">
            <p className="text-4xl font-bold text-blue-700">
              {formatCurrency(wallet.balance)}
            </p>
            <div className="flex space-x-2">
              <button 
                onClick={handleAddFunds}
                className="flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition"
              >
                <FaPlusCircle className="mr-2" /> Add Funds
              </button>
              <button 
                onClick={handleWithdraw}
                className="flex items-center bg-sunset hover:bg-sunset-dark text-white px-4 py-2 rounded-md transition"
              >
                <FaMinusCircle className="mr-2" /> Withdraw
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {wallet.last_updated ? new Date(wallet.last_updated).toLocaleString() : 'Never'}
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleAddFunds} className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex flex-col items-center justify-center transition">
              <FaPlusCircle className="text-blue-500 text-2xl mb-2" />
              <span>Deposit</span>
            </button>
            <button onClick={handleWithdraw} className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex flex-col items-center justify-center transition">
              <FaMinusCircle className="text-sunset text-2xl mb-2" />
              <span>Withdraw</span>
            </button>
            <button className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex flex-col items-center justify-center transition">
              <FaExchangeAlt className="text-purple-500 text-2xl mb-2" />
              <span>Transfer</span>
            </button>
            <button 
              onClick={() => setActiveView('transactions')}
              className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex flex-col items-center justify-center transition"
            >
              <FaHistory className="text-gray-500 text-2xl mb-2" />
              <span>History</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Transaction History */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FaHistory className="mr-2" /> Transaction History
        </h2>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No transactions found. Start by adding funds to your wallet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="py-2 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2">{getTransactionIcon(transaction.type)}</span>
                        <span className="capitalize">{transaction.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {transaction.description || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium">
                      <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Fund Dialog */}
      <AnimatePresence>
        {isAddFundsDialogOpen && wallet && (
          <WalletFundDialog
            isOpen={isAddFundsDialogOpen}
            walletId={walletId}
            currentBalance={wallet.balance}
            userId={user?.id || ''}
            onClose={() => setIsAddFundsDialogOpen(false)}
            onSuccess={handleFundSuccess}
          />
        )}
      </AnimatePresence>
      
      {/* Withdraw Dialog */}
      <AnimatePresence>
        {isWithdrawDialogOpen && wallet && (
          <WalletWithdrawDialog 
            isOpen={isWithdrawDialogOpen}
            walletId={walletId}
            currentBalance={wallet.balance}
            userId={user?.id || ''}
            onClose={() => setIsWithdrawDialogOpen(false)}
            onSuccess={handleWithdrawSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Wallet;
