import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Truck, Settings, LogOut, MessageCircle } from 'lucide-react';
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`w-64 bg-white h-screen fixed left-0 top-0 shadow-lg text-black z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-8">Driver Portal</h2>
          <nav className="space-y-4">
            <Link
              to="/driver/dashboard"
              className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 ${isActive('dashboard') ? 'bg-gray-100' : ''}`}
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

            {/* <Link
              to="/driver/orders"
              className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 ${isActive('orders') ? 'bg-gray-100' : ''}`}
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
            </Link> */}
            


            <Link
              to="/driver/messages"
              className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 ${isActive('messages') ? 'bg-gray-100' : ''}`}
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
              className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 ${isActive('settings') ? 'bg-gray-100' : ''}`}
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

            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 w-full text-left text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
};
