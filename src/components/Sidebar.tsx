import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import {
  Home,
  FileText,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Car,
  Star
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
}

const Sidebar = ({ currentPage }: SidebarProps) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/driver' },
    { name: 'Documents', icon: FileText, path: '/driver/documents' },
    { name: 'Profile', icon: User, path: '/driver/profile' },
    { name: 'Rides', icon: Car, path: '/driver/rides' },
    { name: 'Reviews', icon: Star, path: '/driver/reviews' },
    { name: 'Settings', icon: Settings, path: '/driver/settings' },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:w-64 w-64 z-40`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-xl font-bold">Driver Portal</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <a
                    href={item.path}
                    className={`flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors ${
                      currentPage === item.path ? 'bg-gray-700 text-white' : ''
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout button */}
          <div className="p-6 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
