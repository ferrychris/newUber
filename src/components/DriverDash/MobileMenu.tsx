import React from 'react';
import { Home, Truck, Settings, Menu, Wallet } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface MobileMenuProps {
  onNavigate: (section: 'dashboard' | 'orders' | 'messages' | 'settings') => void;
  onToggleSidebar: () => void;
  onOpenWallet?: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ 
  onNavigate, 
  onToggleSidebar,
  onOpenWallet
}) => {
  const location = useLocation();
  
  const isActive = (section: 'dashboard' | 'orders' | 'messages' | 'settings') => {
    const pathMap = {
      dashboard: '/driver',
      orders: '/driver/orders',
      messages: '/driver/messages',
      settings: '/driver/settings'
    };
    return location.pathname === pathMap[section] || 
           (section === 'dashboard' && location.pathname === '/driver');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-midnight-900 border-t border-gray-200 dark:border-stone-700/20 shadow-lg z-40 lg:hidden">
      <div className="flex justify-around items-center h-16">
        <button 
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center w-1/5 py-2 ${
            isActive('dashboard') 
              ? 'text-purple-600 dark:text-purple-400' 
              : 'text-gray-600 dark:text-stone-400'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">Home</span>
        </button>
        
        <button 
          onClick={() => onNavigate('orders')}
          className={`flex flex-col items-center justify-center w-1/5 py-2 ${
            isActive('orders') 
              ? 'text-purple-600 dark:text-purple-400' 
              : 'text-gray-600 dark:text-stone-400'
          }`}
        >
          <Truck className="h-5 w-5" />
          <span className="text-xs mt-1">Orders</span>
        </button>
        
        <button 
          onClick={onOpenWallet}
          className="flex flex-col items-center justify-center w-1/5 py-2 text-gray-600 dark:text-stone-400"
        >
          <Wallet className="h-5 w-5" />
          <span className="text-xs mt-1">Wallet</span>
        </button>
        
        <button 
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center justify-center w-1/5 py-2 ${
            isActive('settings') 
              ? 'text-purple-600 dark:text-purple-400' 
              : 'text-gray-600 dark:text-stone-400'
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs mt-1">Settings</span>
        </button>
        
        <button 
          onClick={onToggleSidebar}
          className="flex flex-col items-center justify-center w-1/5 py-2 text-gray-600 dark:text-stone-400"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">More</span>
        </button>
      </div>
    </div>
  );
};

export default MobileMenu;
