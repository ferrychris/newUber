import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaWallet, FaMoneyBillWave, FaCreditCard, FaHistory, 
  FaDownload, FaExchangeAlt, FaPlusCircle, FaArrowUp,
  FaArrowDown, FaChartLine
} from 'react-icons/fa';

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
  monthlyIncome: number;
  monthlyExpense: number;
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
  const [activeView, setActiveView] = useState<'cards'|'transactions'>('cards');
  
  // Demo data
  const wallet: WalletData = {
    balance: 25840.50,
    currency: 'USD',
    cards: [
      {
        id: 1,
        number: '**** **** **** 4587',
        expiry: '09/25',
        type: 'visa',
        isDefault: true
      },
      {
        id: 2,
        number: '**** **** **** 6234',
        expiry: '04/26',
        type: 'mastercard',
        isDefault: false
      }
    ],
    statistics: {
      monthlyIncome: 32500,
      monthlyExpense: 14750,
      savingsGoal: 65,
      transactionHistory: [65, 59, 80, 81, 56, 55, 40, 50, 45, 65, 70, 75]
    }
  };

  // Demo transactions
  const transactions: Transaction[] = [
    {
      id: 1,
      type: 'deposit',
      amount: 12000,
      date: 'Today, 12:34 PM',
      status: 'completed',
      description: 'Deposit to account',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      type: 'payment',
      amount: 3500,
      date: 'Yesterday, 04:15 PM',
      status: 'completed',
      description: 'Payment for shipping services',
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      type: 'withdrawal',
      amount: 5000,
      date: 'Mar 20, 2023, 10:30 AM',
      status: 'pending',
      description: 'Withdrawal to bank account',
      created_at: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 4,
      type: 'earnings',
      amount: 22340.50,
      date: 'Mar 15, 2023, 09:45 AM',
      status: 'completed',
      description: 'Earnings from shipping services',
      created_at: new Date(Date.now() - 604800000).toISOString()
    }
  ];

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
        return <FaChartLine className="text-indigo-500" />;
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

  return (
    <div className="container mx-auto">
      {/* Balance Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 mb-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Wallet Balance</h2>
          <div className="flex items-center gap-3">
            <button className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <FaDownload />
              <span>Download Report</span>
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <FaPlusCircle />
              <span>Add Money</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Balance Card */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-6 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FaWallet className="text-white" />
              </div>
              <h3 className="text-lg font-medium">Total Balance</h3>
            </div>
            
            <div className="text-3xl font-bold mb-3">{formatCurrency(wallet.balance)}</div>
            
            <div className="flex items-center text-white/70 text-sm">
              <FaChartLine className="mr-1" />
              <span>+12.6% from last month</span>
            </div>
          </div>
          
          {/* Income */}
          <div className="bg-white dark:bg-midnight-800 p-6 rounded-xl border border-gray-100 dark:border-stone-700/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center">
                <FaArrowDown />
              </div>
              <h3 className="text-gray-700 dark:text-white font-medium">Monthly Income</h3>
            </div>
            
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {formatCurrency(wallet.statistics.monthlyIncome)}
            </div>
            
            <div className="flex items-center text-green-500 text-sm">
              <FaChartLine className="mr-1" />
              <span>+8.2% from last month</span>
            </div>
          </div>
          
          {/* Expense */}
          <div className="bg-white dark:bg-midnight-800 p-6 rounded-xl border border-gray-100 dark:border-stone-700/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
                <FaArrowUp />
              </div>
              <h3 className="text-gray-700 dark:text-white font-medium">Monthly Expense</h3>
            </div>
            
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {formatCurrency(wallet.statistics.monthlyExpense)}
            </div>
            
            <div className="flex items-center text-red-500 text-sm">
              <FaChartLine className="mr-1" />
              <span>-3.1% from last month</span>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200 dark:border-stone-700/20">
        <button 
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeView === 'cards' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-white'
          }`}
          onClick={() => setActiveView('cards')}
        >
          My Cards
        </button>
        <button 
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeView === 'transactions' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-white'
          }`}
          onClick={() => setActiveView('transactions')}
        >
          Transactions
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium">
                  + Add New Card
                </button>
              </div>
              
              <div className="space-y-4">
                {wallet.cards.map(card => (
                  <div 
                    key={card.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-stone-700/20 rounded-lg hover:shadow-sm transition-shadow duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                        <FaCreditCard className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{card.number}</p>
                        <p className="text-gray-500 dark:text-stone-400 text-sm">Expires {card.expiry}</p>
                      </div>
                    </div>
                    
                    {card.isDefault && (
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded">
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {transactions.map(transaction => (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-stone-700/20 rounded-lg hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-midnight-700 flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium capitalize">{transaction.type}</p>
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
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Savings Goal</h3>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                    {wallet.statistics.savingsGoal}% Complete
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-gray-600 dark:text-stone-400">
                    $50,000 Goal
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200 dark:bg-indigo-900/30">
                <div style={{ width: `${wallet.statistics.savingsGoal}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"></div>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex flex-col items-center hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors duration-300">
                <FaMoneyBillWave className="text-xl mb-1" />
                <span className="text-xs font-medium">Deposit</span>
              </button>
              
              <button className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg flex flex-col items-center hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors duration-300">
                <FaArrowUp className="text-xl mb-1" />
                <span className="text-xs font-medium">Withdraw</span>
              </button>
              
              <button className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex flex-col items-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-300">
                <FaExchangeAlt className="text-xl mb-1" />
                <span className="text-xs font-medium">Transfer</span>
              </button>
              
              <button className="p-3 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 rounded-lg flex flex-col items-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300">
                <FaHistory className="text-xl mb-1" />
                <span className="text-xs font-medium">History</span>
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
