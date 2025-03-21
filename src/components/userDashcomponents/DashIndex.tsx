import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaBox, FaTruck, FaCalendarAlt, FaChartLine,
  FaShippingFast, FaArrowRight, FaWallet, FaMoneyBillWave,
  FaArrowUp, FaArrowDown, FaExchangeAlt, FaCreditCard
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const DashIndex = () => {
  // Monthly order data
  const monthlyOrders = {
    months: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
    data: [75, 125, 95, 145, 110, 155, 140, 110, 130],
    currentMonth: 155
  };

  // Capacity data
  const capacityData = {
    days: ['3 Nov', '5 Nov', '8 Nov', '10 Nov', '13 Nov'],
    values: [
      { label: '33kg - 40kg', value: 35 },
      { label: '29kg - 33kg', value: 25 },
      { label: '24kg - 29kg', value: 20 },
      { label: '0kg - 24kg', value: 15 }
    ]
  };
  
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
        return <FaExchangeAlt className="text-blue-500" />;
      default:
        return <FaExchangeAlt className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Monthly Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* This month's order */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">This month order</h2>
          </div>
          
          <div className="flex justify-center">
            <div className="text-center flex flex-col items-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">155</div>
              <div className="relative w-full h-px bg-gray-200 dark:bg-midnight-700 mt-2 mb-4">
                <div className="absolute w-full h-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-midnight-800"></div>
                </div>
              </div>
              <div className="flex justify-between w-full">
                {monthlyOrders.months.map((month, idx) => (
                  <div key={idx} className="text-xs text-gray-500 dark:text-stone-400">{month}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Shipment success */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shipment success</h2>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-teal-500">65%</span>
              <span className="text-sm text-green-500">+6%</span>
            </div>
          </div>
          
          <div className="flex justify-center gap-1 items-end">
            {Array.from({ length: 12 }).map((_, idx) => {
              const height = 24 + Math.floor(Math.random() * 30);
              const isActive = idx === 5;
              return (
                <div 
                  key={idx} 
                  className={`w-2 rounded-sm ${isActive ? 'bg-teal-500' : 'bg-teal-200 dark:bg-teal-800/30'}`}
                  style={{ height: `${height}px` }}
                ></div>
              );
            })}
          </div>
          
          <div className="flex justify-between mt-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-teal-500"></div>
              <span className="text-xs text-gray-500 dark:text-stone-400">Success</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-xs text-gray-500 dark:text-stone-400">Not yet</span>
            </div>
          </div>
        </motion.div>
        
        {/* Capacity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
          className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Capacity</h2>
          </div>
          
          <div className="flex justify-between items-end h-32 mb-2">
            {capacityData.days.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="relative w-12 flex flex-col items-center">
                  <div className="w-full rounded-md bg-indigo-100 dark:bg-indigo-900/30" style={{ height: `${50 + Math.random() * 50}px` }}></div>
                  {idx === 3 && (
                    <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/4">
                      <div className="bg-indigo-600 text-white text-xs py-1 px-2 rounded-lg whitespace-nowrap">
                        33kg - 41kg
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-stone-400 mt-2">{day}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Wallet Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
        className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden"
      >
        <div className="flex flex-col md:flex-row">
          {/* Balance Card */}
          <div className="p-6 md:w-1/3 md:border-r border-b md:border-b-0 border-gray-100 dark:border-stone-700/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Wallet Balance</h2>
              <FaWallet className="text-indigo-600 dark:text-indigo-400" />
            </div>
            
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {formatCurrency(walletData.balance)}
              </div>
              <p className="text-sm text-gray-500 dark:text-stone-400 mb-4">Available balance</p>
              
              <div className="flex gap-2">
                <Link 
                  to="/dashboard/wallet" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-1"
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
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center"
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
              <button className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex flex-col items-center hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                <FaMoneyBillWave className="mb-1" />
                <span className="text-xs">Deposit</span>
              </button>
              
              <button className="p-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg flex flex-col items-center hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors">
                <FaArrowUp className="mb-1" />
                <span className="text-xs">Withdraw</span>
              </button>
              
              <button className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex flex-col items-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <FaExchangeAlt className="mb-1" />
                <span className="text-xs">Transfer</span>
              </button>
              
              <button className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex flex-col items-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
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
              to="/dashboard/shipment" 
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center"
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
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <FaBox className="text-indigo-600 dark:text-indigo-400" />
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
              icon: <FaShippingFast className="text-indigo-600 dark:text-indigo-400" />,
              bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
            },
            { 
              title: 'Pending Deliveries',
              count: '24',
              icon: <FaTruck className="text-teal-600 dark:text-teal-400" />,
              bgColor: 'bg-teal-100 dark:bg-teal-900/30'
            },
            { 
              title: 'Scheduled Pickups',
              count: '12',
              icon: <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />,
              bgColor: 'bg-blue-100 dark:bg-blue-900/30'
            },
            { 
              title: 'Total Revenue',
              count: '$15,840',
              icon: <FaChartLine className="text-green-600 dark:text-green-400" />,
              bgColor: 'bg-green-100 dark:bg-green-900/30'
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