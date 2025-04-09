import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  RiHome4Line,
  RiHome4Fill,
  RiFileListLine,
  RiFileListFill,
  RiMapPinLine,
  RiMapPinFill,
  RiWalletLine,
  RiWalletFill,
  RiUserLine,
  RiUserFill,
  RiSettings4Line,
  RiSettings4Fill
} from 'react-icons/ri';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/dashboard',
      icon: RiHome4Line,
      activeIcon: RiHome4Fill,
      label: 'Home',
      exact: true,
      activeColor: 'from-orange-500 to-orange-600',
      inactiveColor: 'text-gray-500'
    },
    {
      path: '/dashboard/orders',
      icon: RiFileListLine,
      activeIcon: RiFileListFill,
      label: 'Orders',
      activeColor: 'from-orange-500 to-orange-600',
      inactiveColor: 'text-gray-500'
    },
    {
      path: '/dashboard/track-order',
      icon: RiMapPinLine,
      activeIcon: RiMapPinFill,
      label: 'Track',
      activeColor: 'from-orange-500 to-orange-600',
      inactiveColor: 'text-gray-500'
    },
    {
      path: '/dashboard/wallet',
      icon: RiWalletLine,
      activeIcon: RiWalletFill,
      label: 'Wallet',
      color: 'orange',
      activeColor: 'from-orange-500 to-orange-600',
      inactiveColor: 'orange-500'
    },

    {
      path: '/dashboard/account',
      icon: RiUserLine,
      activeIcon: RiUserFill,
      label: 'Account',
      activeColor: 'from-orange-500 to-orange-600',
      inactiveColor: 'text-gray-500'
    }
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60",
      "border-t border-gray-200 shadow-lg md:hidden z-50",
      className
    )}>
      <div className="flex justify-between items-center px-2">
        {navItems.map((item) => {
          const active = isActive(item.path, item.exact);
          const Icon = active ? item.activeIcon : item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-3 px-2 flex-1 relative group"
            >
              {active && (
                <span className={cn(
                  "absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-10 h-1 rounded-b-full",
                  "bg-gradient-to-r from-orange-500 to-orange-600 text-orange-500"
                )} />
              )}
              <div className={cn(
                "mb-1 text-xl transition-all duration-300",
                active
                  ? `text-orange-500 bg-gradient-to-r ${item.activeColor} bg-clip-text text-transparent`
                  : item.inactiveColor,
                "group-hover:scale-110"
              )}>
                <Icon className="w-6 h-6 text-orange-500" />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-300",
                active
                  ? `bg-gradient-to-r ${item.activeColor} bg-clip-text text-transparent`
                  : item.inactiveColor,
                "group-hover:scale-105"
              )}>
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