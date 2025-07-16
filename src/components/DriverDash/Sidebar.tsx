import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Truck, Settings, LogOut, MessageCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-toastify';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection?: 'dashboard' | 'orders' | 'messages' | 'settings';
  onNavigate?: (section: 'dashboard' | 'orders' | 'messages' | 'settings') => void;
}

export const Sidebar = ({ isOpen, onClose, activeSection = 'dashboard', onNavigate }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  const isActive = (section: 'dashboard' | 'orders' | 'messages' | 'settings') => {
    if (activeSection) {
      return activeSection === section;
    }
    // Fallback to path checking
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
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`w-64 bg-white dark:bg-midnight-900 h-screen fixed left-0 top-0 shadow-lg text-black dark:text-white z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold">Driver Portal</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-midnight-800 lg:hidden"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-stone-400" />
            </button>
          </div>
          <nav className="space-y-2">
            <Link
              to="/driver/dashboard"
              className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-midnight-800 transition-colors ${isActive('dashboard') ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium' : 'text-gray-700 dark:text-stone-300'}`}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('dashboard');
                  onClose();
                }
              }}
            >
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/driver/orders"
              className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-midnight-800 transition-colors ${isActive('orders') ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium' : 'text-gray-700 dark:text-stone-300'}`}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('orders');
                  onClose();
                }
              }}
            >
              <Truck className="h-5 w-5" />
              <span>Orders</span>
            </Link>
            
            <Link
              to="/driver/messages"
              className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-midnight-800 transition-colors ${isActive('messages') ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium' : 'text-gray-700 dark:text-stone-300'} lg:flex hidden`}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('messages');
                  onClose();
                }
              }}
            >
              <MessageCircle className="h-5 w-5" />
              <span>Messages</span>
            </Link>

            <Link
              to="/driver/settings"
              className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-midnight-800 transition-colors ${isActive('settings') ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium' : 'text-gray-700 dark:text-stone-300'}`}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('settings');
                  onClose();
                }
              }}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>

            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-stone-700/20">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-red-600 dark:text-red-400 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};
