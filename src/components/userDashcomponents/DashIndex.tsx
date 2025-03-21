import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaBox, FaTruck, FaCalendarAlt, FaChartLine,
  FaShippingFast, FaArrowRight, FaWallet, FaMoneyBillWave,
  FaArrowUp, FaArrowDown, FaExchangeAlt, FaCreditCard
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const DashIndex = () => {
  // Wallet data
  const walletData = {
    balance: 25840.50,
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
  };

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
        return <FaExchangeAlt className="text-sunset" />;
      default:
        return <FaExchangeAlt className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
        className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden relative"
      >
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="h-full w-full bg-[linear-gradient(to_right,#4f4f4f1a_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        </div>
        
        <div className="flex flex-col md:flex-row relative z-10">
          {/* Balance Card */}
          <div className="p-6 md:w-1/3 md:border-r border-b md:border-b-0 border-gray-100 dark:border-stone-700/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Wallet Balance</h2>
              <FaWallet className="text-sunset dark:text-sunset" />
            </div>
            
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {formatCurrency(walletData.balance)}
              </div>
              <p className="text-sm text-gray-500 dark:text-stone-400 mb-4">Available balance</p>
              
              <div className="flex gap-2">
                <Link 
                  to="/dashboard/wallet" 
                  className="px-4 py-2 bg-gradient-to-r from-sunset to-purple-500 hover:opacity-90 text-white text-sm font-medium rounded-lg flex items-center gap-1"
                >
                  <FaWallet className="text-xs" />
                  <span>Manage</span>
                </Link>
                <button className="px-4 py-2 bg-gray-100 dark:bg-midnight-700 hover:bg-gray-200 dark:hover:bg-midnight-600 text-gray-700 dark:text-white text-sm font-medium rounded-lg flex items-center gap-1">
                  <FaArrowDown className="text-xs" />
                  <span>Deposit</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="p-6 md:w-2/3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
              <Link 
                to="/dashboard/wallet" 
                className="text-sm text-sunset dark:text-sunset hover:text-purple-500 dark:hover:text-purple-400 flex items-center"
              >
                View All
                <FaArrowRight className="ml-1 text-xs" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {walletData.transactions.map(transaction => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border border-gray-100 dark:border-stone-700/20 rounded-lg hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-midnight-700 flex items-center justify-center">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{transaction.type}</p>
                      <p className="text-xs text-gray-500 dark:text-stone-400">{transaction.date}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-medium ${
                      transaction.type === 'deposit' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'deposit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 grid grid-cols-4 gap-2">
              <button className="p-2 bg-sunset/10 dark:bg-sunset/20 text-sunset dark:text-sunset rounded-lg flex flex-col items-center hover:bg-sunset/20 dark:hover:bg-sunset/30 transition-colors">
                <FaMoneyBillWave className="mb-1" />
                <span className="text-xs">Deposit</span>
              </button>
              
              <button className="p-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg flex flex-col items-center hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors">
                <FaArrowUp className="mb-1" />
                <span className="text-xs">Withdraw</span>
              </button>
              
              <button className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex flex-col items-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                <FaExchangeAlt className="mb-1" />
                <span className="text-xs">Transfer</span>
              </button>
              
              <button className="p-2 bg-sunset/10 dark:bg-sunset/20 text-sunset dark:text-sunset rounded-lg flex flex-col items-center hover:bg-sunset/20 dark:hover:bg-sunset/30 transition-colors">
                <FaCreditCard className="mb-1" />
                <span className="text-xs">Cards</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
          className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-stone-700/20">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Shipments</h2>
            <Link 
              to="/dashboard/track-order" 
              className="text-sm text-sunset dark:text-sunset hover:text-purple-500 dark:hover:text-purple-400 flex items-center"
            >
              View All
              <FaArrowRight className="ml-1 text-xs" />
            </Link>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-stone-700/20">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-sunset/10 dark:bg-sunset/20 flex items-center justify-center">
                      <FaBox className="text-sunset dark:text-sunset" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">Package #{1000 + idx}</h3>
                      <p className="text-xs text-gray-500 dark:text-stone-400">Arriving today</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full">
                    On Time
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {[
            { 
              title: 'Total Shipments',
              count: '485',
              icon: <FaShippingFast className="text-sunset dark:text-sunset" />,
              bgColor: 'bg-sunset/10 dark:bg-sunset/20'
            },
            { 
              title: 'Pending Deliveries',
              count: '24',
              icon: <FaTruck className="text-purple-600 dark:text-purple-400" />,
              bgColor: 'bg-purple-50 dark:bg-purple-900/20'
            },
            { 
              title: 'Scheduled Pickups',
              count: '12',
              icon: <FaCalendarAlt className="text-green-600 dark:text-green-400" />,
              bgColor: 'bg-green-100 dark:bg-green-900/30'
            },
            { 
              title: 'Total Revenue',
              count: '$15,840',
              icon: <FaChartLine className="text-sunset dark:text-sunset" />,
              bgColor: 'bg-sunset/10 dark:bg-sunset/20'
            }
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="bg-white dark:bg-midnight-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 flex items-center space-x-3"
            >
              <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-stone-400">{stat.title}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stat.count}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default DashIndex;