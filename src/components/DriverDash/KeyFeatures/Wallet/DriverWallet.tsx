import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Button,
  Paper
} from '@mui/material';
import { 
  FaWallet, 
  FaMoneyBillWave, 
  FaExchangeAlt, 
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../utils/supabaseClient';
import { formatCurrency } from '../../../../utils/formatters';

// Type definitions
interface Transaction {
  id: number;
  type: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  created_at: string;
  wallet_id: string;
  user_id: string;
  metadata?: {
    order_id?: string;
    base_earnings?: number;
    tip?: number;
    driver_share?: number;
    [key: string]: any;
  };
}

interface WalletData {
  balance: number;
  currency: string;
  last_updated?: string;
}

interface EarningsData {
  totalPrice: number;
  totalTips: number;
  orderCount: number;
}

const DriverWallet: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'overview'|'transactions'>('overview');
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalPrice: 0,
    totalTips: 0,
    orderCount: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Fetch wallet data when the component mounts
  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchEarnings();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Check for the driver's wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (walletError && walletError.code !== 'PGRST116' && walletError.code !== '42501') {
        throw walletError;
      }
      
      if (walletData) {
        // Use existing wallet
        console.log('Found wallet:', walletData);
        setWallet({
          balance: walletData.balance,
          currency: walletData.currency || 'USD',
          last_updated: walletData.updated_at
        });
        setWalletId(walletData.id);
        
        // Fetch transaction history
        fetchTransactionHistory(walletData.id);
      } else {
        // Create a new wallet if it doesn't exist
        console.log('No wallet found, creating new wallet');
        const newWallet = {
          user_id: user.id,
          balance: 0,
          currency: 'USD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_type: 'driver' // Add user_type to distinguish between users and drivers
        };
        
        const { data: createdWallet, error: createError } = await supabase
          .from('wallets')
          .insert(newWallet)
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating wallet:', createError);
          throw createError;
        }
        
        if (createdWallet) {
          setWallet({
            balance: createdWallet.balance,
            currency: createdWallet.currency || 'USD',
            last_updated: createdWallet.updated_at
          });
          setWalletId(createdWallet.id);
          console.log('Wallet created successfully');
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      // Get completed orders for earnings calculation
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, price, tip, created_at')
        .eq('status', 'completed')
        .eq('driver_id', user?.id);

      if (ordersError) {
        throw ordersError;
      }

      if (ordersData && ordersData.length > 0) {
        const totalPrice = ordersData.reduce((sum, order) => sum + (order.price || 0), 0);
        const totalTips = ordersData.reduce((sum, order) => sum + (order.tip || 0), 0);

        setEarnings({
          totalPrice,
          totalTips,
          orderCount: ordersData.length
        });
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    }
  };

  const fetchTransactionHistory = async (walletId?: string) => {
    if (!user?.id) return;
    
    try {
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      // If we have a specific wallet ID, filter by that
      if (walletId) {
        query = query.eq('wallet_id', walletId);
      } else {
        // Otherwise, get all transactions for this user
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error in transaction query:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log(`Found ${data.length} transactions`);
        setTransactions(data);
      } else {
        console.log('No transactions found');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    }
  };

  // Function to get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <FaArrowDown className="text-green-500" />;
      case 'withdrawal':
        return <FaArrowUp className="text-red-500" />;
      case 'earnings':
        return <FaMoneyBillWave className="text-blue-500" />;
      case 'earning': // Handle both singular and plural forms
        return <FaMoneyBillWave className="text-blue-500" />;
      default:
        return <FaExchangeAlt className="text-gray-500" />;
    }
  };
  
  // Format transaction description with additional details if available
  const formatTransactionDetails = (transaction: Transaction) => {
    if (transaction.type === 'earnings' || transaction.type === 'earning') {
      const metadata = transaction.metadata || {};
      const baseEarnings = metadata.base_earnings ? parseFloat(metadata.base_earnings.toString()) : 0;
      const tip = metadata.tip ? parseFloat(metadata.tip.toString()) : 0;
      
      if (baseEarnings > 0 || tip > 0) {
        return (
          <>
            <Typography variant="body2">{transaction.description}</Typography>
            {baseEarnings > 0 && (
              <Typography variant="caption" color="textSecondary">
                Base fare: {formatCurrency(baseEarnings.toString())}
              </Typography>
            )}
            {tip > 0 && (
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', color: 'green' }}>
                Tip: {formatCurrency(tip.toString())}
              </Typography>
            )}
          </>
        );
      }
    }
    
    return <Typography variant="body2">{transaction.description}</Typography>;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FaWallet style={{ marginRight: '8px' }} />
        <Typography variant="h6">Driver Wallet</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button 
          variant={activeView === 'overview' ? 'contained' : 'outlined'} 
          onClick={() => setActiveView('overview')}
          sx={{ flex: 1, mr: 1 }}
        >
          Overview
        </Button>
        <Button 
          variant={activeView === 'transactions' ? 'contained' : 'outlined'} 
          onClick={() => setActiveView('transactions')}
          sx={{ flex: 1 }}
        >
          Transactions
        </Button>
      </Box>

      {activeView === 'overview' && (
        <>
          {/* Wallet Balance */}
          <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'primary.dark', color: 'white' }}>
            <Typography variant="subtitle1">Available Balance</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {formatCurrency(wallet?.balance || 0, wallet?.currency || 'USD')}
            </Typography>
            <Typography variant="caption">
              Last updated: {wallet?.last_updated ? new Date(wallet.last_updated).toLocaleString() : 'N/A'}
            </Typography>
          </Paper>

          {/* Earnings Summary */}
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Earnings Summary</Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Total Earnings:</Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatCurrency(earnings.totalPrice, wallet?.currency || 'USD')}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Total Tips:</Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatCurrency(earnings.totalTips, wallet?.currency || 'USD')}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Completed Orders:</Typography>
              <Typography variant="body1" fontWeight="bold">
                {earnings.orderCount}
              </Typography>
            </Box>
          </Paper>

          {/* Quick Actions */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Quick Actions</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined" 
                startIcon={<FaArrowDown />}
                sx={{ flex: 1, mr: 1 }}
              >
                Deposit
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<FaArrowUp />}
                sx={{ flex: 1 }}
              >
                Withdraw
              </Button>
            </Box>
          </Paper>
        </>
      )}

      {activeView === 'transactions' && (
        <Paper elevation={2} sx={{ p: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Recent Transactions</Typography>
          
          {transactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">No transactions found</Typography>
            </Box>
          ) : (
            <List sx={{ width: '100%' }}>
              {transactions.map((transaction) => (
                <React.Fragment key={transaction.id}>
                  <ListItem alignItems="flex-start">
                    <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                      {getTransactionIcon(transaction.type)}
                    </Box>
                    <ListItemText
                      primary={
                        formatTransactionDetails(transaction)
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {formatCurrency(transaction.amount, wallet?.currency || 'USD')}
                          </Typography>
                          {" — "}{new Date(transaction.created_at).toLocaleString()}
                        </React.Fragment>
                      }
                    />
                    <Chip 
                      label={transaction.status} 
                      size="small"
                      color={transaction.status === 'completed' ? 'success' : 'default'}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default DriverWallet;
