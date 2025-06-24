import { Bell, Menu, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface NavBarProps {
  onToggleSidebar: () => void;
  driverName?: string;
}

export default function NavBar({ onToggleSidebar, driverName = 'Driver' }: NavBarProps) {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  const [notifications] = useState<number>(0);
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/driver/dashboard':
        return 'Dashboard';
      case '/driver/orders':
        return 'Orders';
      case '/driver/documents':
        return 'Documents';
      case '/driver/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-black shadow-sm z-50 px-4">
      <div className="h-full flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <Menu className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">{getPageTitle()}</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button className="p-2 hover:bg-gray-800 rounded-lg">
              <Bell className="h-5 w-5 text-white" />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-800 rounded-lg flex items-center space-x-2 text-white"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden md:block text-sm">Logout</span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">{driverName.charAt(0)}</span>
            </div>
            <span className="hidden md:block text-sm font-medium text-white">{driverName}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
