import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaClipboardList, 
  FaWallet, 
  FaMapMarkedAlt, 
  FaUser
} from 'react-icons/fa';

interface MobileNavigationProps {
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/dashboard',
      icon: <FaHome />,
      label: 'Home',
      exact: true
    },
    {
      path: '/dashboard/orders',
      icon: <FaClipboardList />,
      label: 'Orders'
    },
    {
      path: '/dashboard/track-order',
      icon: <FaMapMarkedAlt />,
      label: 'Track'
    },
    {
      path: '/dashboard/wallet',
      icon: <FaWallet />,
      label: 'Wallet'
    },
    {
      path: '/dashboard/account',
      icon: <FaUser />,
      label: 'Account'
    }
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-midnight-900 shadow-lg border-t border-gray-100 dark:border-stone-700/10 md:hidden z-50 px-2 ${className}`}>
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-3 px-2 flex-1 relative"
            >
              {active && (
                <span className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-purple-600 dark:bg-purple-500 rounded-b-full" />
              )}
              <div className={`mb-1 text-xl ${
                active
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-medium ${
                active
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigation; 