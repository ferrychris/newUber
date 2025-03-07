import React, { useState } from 'react';
import { FaBell, FaMoon, FaSun, FaSearch, FaChevronDown, FaSignOutAlt, FaUser, FaCog } from 'react-icons/fa';

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [notifications] = useState<Notification[]>([
    {
      id: 1,
      message: "Your ride is arriving in 5 minutes",
      time: "Just now",
      isRead: false
    },
    {
      id: 2,
      message: "Package #1234 has been delivered",
      time: "2 hours ago",
      isRead: false
    },
    {
      id: 3,
      message: "New meal order confirmed",
      time: "5 hours ago",
      isRead: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <nav className={`fixed top-0 right-0 ${isSidebarOpen ? 'lg:left-64' : 'lg:left-20'} left-0 bg-white border-b border-gray-200 z-30 transition-all duration-300`}>
        <div className="px-4 lg:px-6 py-3">
          {/* Desktop View */}
          <div className="hidden lg:flex items-center justify-between">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                {isDarkMode ? (
                  <FaSun className="text-yellow-500" />
                ) : (
                  <FaMoon className="text-gray-600" />
                )}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 rounded-full relative"
                >
                  <FaBell className="text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="font-semibold">Notifications</h3>
                    </div>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                      >
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    ))}
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button className="text-blue-600 text-sm hover:underline w-full text-center">
                        View All Notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    D
                  </div>
                  <span className="font-medium">David</span>
                  <FaChevronDown className="text-gray-500 text-sm" />
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      <FaUser className="text-gray-500" />
                      <span>Profile</span>
                    </button>
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      <FaCog className="text-gray-500" />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600">
                      <FaSignOutAlt />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile View */}
          <div className="flex lg:hidden items-center justify-between gap-4">
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <FaSearch className="text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <FaBell className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                D
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showMobileSearch && (
          <div className="p-4 border-t border-gray-200 lg:hidden">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Dropdowns Overlay */}
      {(showProfileMenu || showNotifications) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => {
            setShowProfileMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </>
  );
};

export default DashNav;