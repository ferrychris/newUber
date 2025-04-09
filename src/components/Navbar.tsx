import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';

// Placeholder for logo - replace with actual SVG or img tag
const Logo = () => (
  <div className="flex items-center space-x-1">
    <div className="w-6 h-6 bg-[#D95F3B] rounded-sm transform -skew-x-12"></div>
    <span className="text-2xl font-bold text-[#D95F3B]">Colctay</span>
  </div>
);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    // Change background to white and REMOVE the bottom border
    <nav className="bg-white w-full z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/">
            <Logo />
          </Link>

          {/* Desktop Navigation & Sign In Buttons */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="text-[#333] hover:text-[#D95F3B] transition-colors text-sm font-medium"
              >
                {item.name}
              </Link>
            ))}
            {/* Sign In Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                to="/signin"
                className="px-5 py-2 border border-gray-300 rounded-lg text-[#333] hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                to="/signup" // Assuming the second button is Sign Up
                className="px-5 py-2 bg-[#D95F3B] text-white rounded-lg hover:bg-[#C8532F] transition-colors text-sm font-medium shadow-sm"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? 
                <FaTimes className="w-6 h-6 text-gray-600" /> : 
                <FaBars className="w-6 h-6 text-gray-600" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 pt-3 pb-6 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-[#D95F3B] hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {/* Mobile Sign In Buttons */}
            <div className="pt-4 space-y-3">
              <Link
                to="/signin"
                className="block w-full text-center px-5 py-2 border border-gray-300 rounded-lg text-[#333] hover:bg-gray-50 transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="block w-full text-center px-5 py-2 bg-[#D95F3B] text-white rounded-lg hover:bg-[#C8532F] transition-colors font-medium shadow-sm"
                onClick={() => setIsOpen(false)}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}