import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  FaWallet
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
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
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [transactionsPerPage] = useState(10);
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [walletId, setWalletId] = useState<string>('');

  // Use payment status hook to handle Stripe payment completions
  const { paymentData } = usePaymentStatus();

  const fetchTransactionHistory = useCallback(async () => {
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
        // Initially show first 10 transactions
        setDisplayedTransactions(data.slice(0, transactionsPerPage));
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      toast.error('Failed to load transaction history');
    }
  }, [isAuthenticated, user, transactionsPerPage]);

  const fetchWalletData = useCallback(async () => {
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
      
    } catch (error) {
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
  }, [isAuthenticated, user, fetchTransactionHistory]);

  // Fetch wallet data when the component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWalletData();
    }
  }, [isAuthenticated, user, fetchWalletData]);

  // Refresh wallet data when payment is completed
  useEffect(() => {
    if (paymentData && paymentData.paymentStatus === 'paid') {
      fetchWalletData();
    }
  }, [paymentData, fetchWalletData]);

  const handleLoadMore = () => {
    if (showAllTransactions) {
      // Show less - back to initial 10
      setDisplayedTransactions(transactions.slice(0, transactionsPerPage));
      setShowAllTransactions(false);
    } else {
      // Show all transactions
      setDisplayedTransactions(transactions);
      setShowAllTransactions(true);
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Wallet Balance Card */}
        <div className="w-full md:w-1/3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FaWallet className="text-2xl text-purple-600 dark:text-purple-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Wallet Balance</h2>
              </div>
            </div>
            
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                €{wallet.balance.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available Balance</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsAddFundsDialogOpen(true)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
              >
                Add Funds
              </button>
            </div>
          </div>
        </div>
        
        {/* Transaction History */}
        <div className="w-full md:w-2/3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Transaction History</h3>
              {transactions.length > transactionsPerPage && (
                <button
                  onClick={handleLoadMore}
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 text-sm font-medium"
                >
                  {showAllTransactions ? 'Show Less' : `View All (${transactions.length})`}
                </button>
              )}
            </div>
            {displayedTransactions.length > 0 ? (
              <div className="space-y-3">
                {displayedTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'credit' || transaction.type === 'deposit' || transaction.type === 'earnings'
                          ? 'bg-green-100 dark:bg-green-900/20' 
                          : 'bg-red-100 dark:bg-red-900/20'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.type === 'credit' || transaction.type === 'deposit' || transaction.type === 'earnings'
                            ? 'bg-green-600 dark:bg-green-400' 
                            : 'bg-red-600 dark:bg-red-400'
                        }`}></div>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {new Date(transaction.created_at).toLocaleDateString()} • 
                          <span className="capitalize">{transaction.type.replace('_', ' ')}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        transaction.type === 'credit' || transaction.type === 'deposit' || transaction.type === 'earnings'
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.type === 'credit' || transaction.type === 'deposit' || transaction.type === 'earnings' ? '+' : '-'}
                        €{Math.abs(transaction.amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {transaction.status && (
                          <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            transaction.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {transaction.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No transactions yet</p>
                <button
                  onClick={() => setIsAddFundsDialogOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Add Your First Transaction
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Fund Dialog */}
      <AnimatePresence>
        {isAddFundsDialogOpen && wallet && (
          <WalletFundDialog
            isOpen={isAddFundsDialogOpen}
            walletId={walletId}
            userId={user?.id || ''}
            onClose={() => setIsAddFundsDialogOpen(false)}
          />
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default Wallet;
