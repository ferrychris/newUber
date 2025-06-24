import React from 'react';
import { Wallet } from 'lucide-react';

interface MaindashProps {
  walletBalance: string;
  totalOrders: number;
  isLoading: boolean;
}

const Maindash: React.FC<MaindashProps> = ({
  walletBalance,
  totalOrders,
  isLoading
}) => {
  // Convert wallet balance string to number for display
  const balanceNum = parseFloat(walletBalance) || 0;

  return (
    <div className="space-y-6">
      {/* Wallet Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Wallet className="h-6 w-6 text-green-500" />
          <h2 className="text-xl font-semibold text-white">Wallet Balance</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-white">
              {isLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                `$${balanceNum.toFixed(2)}`
              )}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-white">
              {isLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                totalOrders
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maindash;