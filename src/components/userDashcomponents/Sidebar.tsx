import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FaHome, FaClipboardList, FaPlus, FaUser,
  FaBars, FaTimes, FaChartLine, FaWallet,
  FaShippingFast, FaRegFileAlt, FaRegEnvelope, FaBox,
  FaHeadset, FaCog, FaMapMarkedAlt
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import logo from '../image/Fret.png'

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  path: string;
  icon: React.ReactElement;
  label: string;
  exact?: boolean;
  badge?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const userName = "Michael K."; // This would come from user context/auth

  const menuItems: MenuItem[] = [
    { 
      path: "/dashboard", 
      icon: <FaHome />, 
      label: t('Overview'),
      exact: true
    },
    { 
      path: "/dashboard/track-order", 
      icon: <FaMapMarkedAlt />, 
      label: t('Track Order')
    },
    { 
      path: "/dashboard/orders", 
      icon: <FaClipboardList />, 
      label: t('Orders')
    },
    { 
      path: "/dashboard/message", 
      icon: <FaRegEnvelope />, 
      label: t('Message'),
      badge: "4"
    }
  ];

  const generalItems: MenuItem[] = [
    { 
      path: "/dashboard/wallet", 
      icon: <FaWallet />, 
      label: t('Wallet')
    },
    { 
      path: "/dashboard/support", 
      icon: <FaHeadset />, 
      label: t('Support')
    },
    { 
      path: "/dashboard/account", 
      icon: <FaUser />, 
      label: t('Account')
    }
  ];

  return (
    <div 
      className={`fixed top-0 left-0 h-screen bg-white dark:bg-midnight-900 text-gray-800 dark:text-white transition-all duration-300 flex flex-col z-40 shadow-md
        ${isCollapsed ? 'w-20' : 'w-64'} 
        lg:translate-x-0 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Close button for mobile */}
      <button 
        onClick={onClose}
        className="lg:hidden absolute right-4 top-4 text-stone-400 p-2 hover:bg-stone-100 dark:hover:bg-midnight-800/50 rounded-full transition-colors duration-300"
        aria-label={t('common.close')}
      >
        <FaTimes />
      </button>

      {/* Sidebar Header */}
      <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-sunset to-purple-500 flex items-center justify-center text-white">
            <FaShippingFast />
          </div>
          <h2 className={`font-bold text-lg transition-all duration-300 ${isCollapsed ? "hidden" : "block"}`}>
            Drivergo
          </h2>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="ml-auto text-gray-400 dark:text-stone-400 hover:text-sunset dark:hover:text-sunset focus:outline-none hidden lg:block transition-colors duration-300"
          aria-label={t(isCollapsed ? 'nav.expand' : 'nav.collapse')}
        >
          <FaBars />
        </button>
      </div>

      {/* Main Menu Label */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <p className="text-xs font-medium text-gray-400 dark:text-stone-400 uppercase tracking-wider">
            MAIN MENU
          </p>
        </div>
      )}

      {/* Sidebar Navigation */}
      <nav className="flex-1 px-2 pt-2 pb-4 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-all duration-300 ${
              (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path.split('?')[0]))
                ? "bg-sunset/10 dark:bg-sunset/20 text-sunset dark:text-sunset font-medium" 
                : "hover:bg-gray-50 dark:hover:bg-midnight-800/50 text-gray-600 dark:text-stone-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose();
              }
            }}
          >
            <span className="text-lg">{item.icon}</span>
            {!isCollapsed && (
              <div className="flex justify-between items-center w-full">
                <span className="transition-all duration-300">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
        
        {/* General Section */}
        {!isCollapsed && (
          <div className="px-4 py-3 mt-4">
            <p className="text-xs font-medium text-gray-400 dark:text-stone-400 uppercase tracking-wider">
              GENERAL
            </p>
          </div>
        )}
        
        {generalItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-all duration-300 ${
              (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path.split('?')[0]))
                ? "bg-sunset/10 dark:bg-sunset/20 text-sunset dark:text-sunset font-medium" 
                : "hover:bg-gray-50 dark:hover:bg-midnight-800/50 text-gray-600 dark:text-stone-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose();
              }
            }}
          >
            <span className="text-lg">{item.icon}</span>
            {!isCollapsed && <span className="transition-all duration-300">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-100 dark:border-stone-600/10 mt-auto p-4">
        <Link
          to="/dashboard/profile"
          className={`flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-midnight-800/50 transition-all duration-300 cursor-pointer p-2 rounded-lg`}
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-sunset to-purple-500 flex items-center justify-center text-white">
              {userName.charAt(0)}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-midnight-900"></div>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h3 className="font-medium truncate text-gray-900 dark:text-white">{userName}</h3>
              <p className="text-xs text-gray-500 dark:text-stone-400 truncate">Manager</p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
