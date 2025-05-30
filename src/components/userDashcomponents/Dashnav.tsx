import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  FaBell,
  FaMoon,
  FaSun,
  FaGlobe,
  FaUser,
  FaSignOutAlt,
  FaChevronDown,
  FaCog,
  FaSearch,
  FaShippingFast,
  FaSpinner
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

interface Notification {
  id: number;
  message: string;
  time: string;
  isRead: boolean;
}

interface DashNavProps {
  isSidebarOpen?: boolean;
}

const DashNav: React.FC<DashNavProps> = ({ isSidebarOpen = true }) => {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { userProfile, isLoading } = useUserProfile();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const navigate = useNavigate();
  const [notifications] = useState<Notification[]>([
    {
      id: 1,
      message: t('notifications.rideArriving'),
      time: t('notifications.justNow'),
      isRead: false,
    },
    {
      id: 2,
      message: t('notifications.packageDelivered', { id: '1234' }),
      time: t('notifications.hoursAgo', { count: 2 }),
      isRead: false,
    },
    {
      id: 3,
      message: t('notifications.orderConfirmed'),
      time: t('notifications.hoursAgo', { count: 5 }),
      isRead: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      await logout();
      
      toast.success(t('auth.logoutSuccess'));
      
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t('auth.logoutError'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLanguageMenu(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 right-0 ${
          isSidebarOpen ? "lg:left-64" : "lg:left-20"
        } left-0 bg-white dark:bg-midnight-900 border-b border-gray-200 dark:border-stone-600/10 z-30 transition-all duration-300`}
      >
        <div className="px-4 lg:px-6 py-3">
          {/* Desktop View */}
          <div className="flex items-center justify-between">
            {/* Page Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Colgroup </h1>
                <div className="ml-2 relative">
                 
                </div>
              </div>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden md:block relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-stone-400" />
                <input
                  type="text"
                  placeholder={t('Search')}
                  className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-midnight-800 border border-gray-200 dark:border-stone-700 rounded-lg text-gray-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-sunset dark:focus:ring-sunset w-64"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-midnight-800/50 rounded-full relative transition-colors duration-300"
                >
                  <FaBell className="text-gray-500 dark:text-stone-400" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-midnight-800 rounded-xl shadow-lg border border-gray-200 dark:border-stone-600/10 py-2">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-stone-600/10">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t('common.notifications')}
                      </h3>
                    </div>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-midnight-700/50 ${
                          !notification.isRead ? "bg-sunset/10 dark:bg-sunset/5" : ""
                        } transition-colors duration-300`}
                      >
                        <p className="text-sm text-gray-800 dark:text-white">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    ))}
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-stone-600/10">
                      <button className="text-sunset dark:text-sunset text-sm hover:text-purple-500 dark:hover:text-purple-400 w-full text-center transition-colors duration-300">
                        {t('notifications.viewAll')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-midnight-800/50 rounded-full transition-colors duration-300"
              >
                {isDarkMode ? (
                  <FaSun className="text-amber-500 dark:text-sunset" />
                ) : (
                  <FaMoon className="text-gray-500 dark:text-stone-400" />
                )}
              </button>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-midnight-800/50 rounded-lg px-2 py-1 transition-colors duration-300"
                >
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-r from-sunset to-purple-500 flex items-center justify-center text-white overflow-hidden">
                    {isLoading ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      userProfile?.full_name ? (
                        <span>
                          {typeof userProfile.full_name === 'object' 
                            ? Object.values(userProfile.full_name)[0] || '?' 
                            : userProfile.full_name.charAt(0)}
                        </span>
                      ) : (
                        <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User Avatar" className="w-full h-full object-cover" />
                      )
                    )}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-midnight-900"></div>
                  </div>
                  <div className="hidden md:block text-left">
                    {isLoading ? (
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {userProfile?.full_name 
                          ? (typeof userProfile.full_name === 'object'
                              ? JSON.stringify(userProfile.full_name)
                              : userProfile.full_name)
                          : 'User'}
                      </span>
                    )}
                    {isLoading ? (
                      <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-stone-400">
                        {userProfile?.role
                          ? (typeof userProfile.role === 'object'
                              ? JSON.stringify(userProfile.role)
                              : userProfile.role)
                          : 'User'}
                      </p>
                    )}
                  </div>
                  <FaChevronDown className="text-gray-500 dark:text-stone-400 text-xs ml-1 hidden md:block" />
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-midnight-800 rounded-xl shadow-lg border border-gray-200 dark:border-stone-600/10 py-2">
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-midnight-700/50 flex items-center gap-2 text-gray-700 dark:text-white transition-colors duration-300">
                      <FaUser className="text-sunset dark:text-sunset" />
                      <span>{t('Profile')}</span>
                    </button>
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-midnight-700/50 flex items-center gap-2 text-gray-700 dark:text-white transition-colors duration-300">
                      <FaCog className="text-sunset dark:text-sunset" />
                      <span>{t('Settings')}</span>
                    </button>
                    <div className="border-t border-gray-200 dark:border-stone-600/10 my-1"></div>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-midnight-700/50 flex items-center gap-2 text-red-600 transition-colors duration-300"
                    >
                      <FaSignOutAlt />
                      <span>{isLoggingOut ? t('loggingOut') : t('logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default DashNav;
