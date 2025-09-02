import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, MessageCircle, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationCenter } from './Notifications/NotificationCenter';

interface DriverNavBarProps {
  onToggleSidebar: () => void;
  driverName: string;
  onOpenChatModal?: (orderId?: string, customerId?: string) => void;
}

export const DriverNavBar = ({ onToggleSidebar, driverName, onOpenChatModal }: DriverNavBarProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Handle clicks outside the dropdown and notification center to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread messages count
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchUnreadMessageCount = async () => {
      try {
        const { count, error } = await supabase
          .from('support_messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('read', false);
          
        if (error) throw error;
        setUnreadMessages(count || 0);
      } catch (error) {
        console.error('Error fetching message count:', error);
      }
    };

    fetchUnreadMessageCount();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success(t('auth.logoutSuccess'));
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error(t('auth.logoutError'));
    }
  };

  return (
    <nav className="fixed w-full top-0 left-0 bg-white dark:bg-midnight-900 border-b border-slate-200 dark:border-stone-700/20 shadow-sm z-40">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-lg lg:hidden"
          >
            <Menu className="h-6 w-6 text-gray-700 dark:text-stone-300" />
          </button>
          <span className="font-semibold text-gray-800 dark:text-white text-sm md:text-base truncate max-w-[150px] md:max-w-none">
            {t('driver.welcomeMessage', { name: driverName })}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {onOpenChatModal && (
            <button 
              onClick={() => onOpenChatModal()}
              className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label={t('messages.title')}
            >
              <MessageCircle size={20} />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </button>
          )}
          
          {/* Notification Center */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-midnight-800 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            <NotificationCenter
              isOpen={notificationOpen}
              onClose={() => setNotificationOpen(false)}
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
            />
          </div>
          
          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              className="flex items-center p-1 md:p-2 hover:bg-gray-100 dark:hover:bg-midnight-800 rounded-lg"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                {driverName.substring(0, 1).toUpperCase()}
              </div>
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-stone-400 hidden md:block ml-1" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-midnight-800 rounded-lg shadow-lg py-1 z-50 border border-gray-100 dark:border-stone-700/20">
                <Link 
                  to="/driver/profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-midnight-700"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  {t('common.profile')}
                </Link>
                <Link 
                  to="/driver/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-midnight-700"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t('common.settings')}
                </Link>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-midnight-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('auth.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
