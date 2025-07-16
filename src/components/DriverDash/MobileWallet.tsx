import React from 'react';
import { ChevronLeft } from 'lucide-react';
import DriverWallet from './KeyFeatures/Wallet/DriverWallet';

interface MobileWalletProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileWallet: React.FC<MobileWalletProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-white dark:bg-midnight-900 z-50 lg:hidden overflow-auto">
      <div className="sticky top-0 bg-white dark:bg-midnight-900 border-b border-gray-200 dark:border-stone-700/20 p-4 flex items-center">
        <button 
          onClick={onClose}
          className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-midnight-800"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-stone-300" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Wallet</h1>
      </div>
      
      <div className="p-4 pb-20">
        <div className="bg-white dark:bg-midnight-800 rounded-lg shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden">
          <DriverWallet />
        </div>
      </div>
    </div>
  );
};

export default MobileWallet;
