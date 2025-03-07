import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaCar, FaBox, FaShoppingBag, FaUtensils, FaTruck, FaBars, FaUser, FaTimes } from "react-icons/fa";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const userName = "David"; // This would come from user context/auth

  const menuItems = [
    { path: "/dashboard/carpool", icon: <FaCar />, label: "Carpooling" },
    { path: "/dashboard/parcels", icon: <FaBox />, label: "Parcels" },
    { path: "/dashboard/shopping", icon: <FaShoppingBag />, label: "Shopping" },
    { path: "/dashboard/meals", icon: <FaUtensils />, label: "Meals" },
    { path: "/dashboard/large-items", icon: <FaTruck />, label: "Large Items" },
  ];

  return (
    <div 
      className={`fixed top-0 left-0 h-screen bg-gray-800 text-white transition-all duration-300 flex flex-col z-40
        ${isCollapsed ? 'w-20' : 'w-64'} 
        lg:translate-x-0 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Close button for mobile */}
      <button 
        onClick={onClose}
        className="lg:hidden absolute right-4 top-4 text-white p-2 hover:bg-gray-700 rounded-full"
      >
        <FaTimes />
      </button>

      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4">
        <h2 className={`flex space-x-2 text-2xl font-bold transition-all duration-300 ${isCollapsed ? "hidden" : "block"}`}>
          <FaCar/><span></span>Fretla
        </h2>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="text-white focus:outline-none hidden lg:block"
        >
          <FaBars />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav className="mt-4 flex-1 px-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 p-3 rounded-lg mb-2 transition-all duration-300 ${
              location.pathname === item.path ? "bg-blue-600" : "hover:bg-gray-700"
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
      <div className="border-t border-gray-700 mt-auto">
        <div className={`p-4 flex items-center gap-3 hover:bg-gray-700 transition-all duration-300 cursor-pointer ${
          isCollapsed ? "justify-center" : ""
        }`}>
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <FaUser className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h3 className="font-medium truncate">{userName}</h3>
              <p className="text-sm text-gray-400 truncate">User Profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
