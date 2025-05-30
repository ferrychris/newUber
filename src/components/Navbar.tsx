import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { FaGlobe } from 'react-icons/fa';
import { Bell, MessageSquare, User } from 'lucide-react';
import { useTranslation, T } from './GeminiTranslate';

// Placeholder for logo - replace with actual SVG or img tag
const Logo = () => (
  <div className="text-2xl font-bold text-[#D95F3B]">
    <span className="text-[#D95F3B]">Uber</span>
    <span className="text-gray-700 dark:text-white">Freter</span>
  </div>
);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { currentLanguage, setLanguage } = useTranslation();
  const langMenuRef = useRef<HTMLDivElement>(null);
  
  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setLangMenuOpen(false);
  };
  
  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Navigation items
  const navItems = [
    { nameKey: 'navbar.home', nameDefault: 'Home', path: '/' },
    { nameKey: 'navbar.services', nameDefault: 'Services', path: '/services' },
    { nameKey: 'navbar.about', nameDefault: 'About', path: '/about' },
    { nameKey: 'navbar.contact', nameDefault: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/">
                <Logo />
              </Link>
            </div>
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#D95F3B] hover:bg-gray-50 dark:hover:bg-midnight-700"
                >
                  <T text={item.nameKey} />
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-[#D95F3B] hover:bg-gray-50 rounded-md transition-colors" aria-label="Team Chat">
              <MessageSquare className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-[#D95F3B] hover:bg-gray-50 rounded-md transition-colors relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="relative">
              <button className="p-2 text-gray-600 hover:text-[#D95F3B] hover:bg-gray-50 rounded-md transition-colors" aria-label="Account">
                <User className="h-5 w-5" />
              </button>
            </div>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-[#D95F3B] hover:bg-[#C04F2F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D95F3B]"
            >
              <T text="auth.signIn" />
            </Link>
            <div className="relative ml-3" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center space-x-1 px-2 py-2 rounded-md hover:bg-gray-50 text-gray-700"
                aria-label="Change language"
              >
                <FaGlobe className="text-gray-600" />
                <span className="text-sm font-medium">{currentLanguage.toUpperCase()}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`w-full text-left px-4 py-2 text-sm ${currentLanguage === 'en' ? 'bg-gray-50 text-[#D95F3B] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <T text="language.english" />
                  </button>
                  <button
                    onClick={() => handleLanguageChange('fr')}
                    className={`w-full text-left px-4 py-2 text-sm ${currentLanguage === 'fr' ? 'bg-gray-50 text-[#D95F3B] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <T text="language.french" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="-mr-2 flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200 hover:text-[#D95F3B] hover:bg-gray-50 dark:hover:bg-midnight-700 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">
                <T text="navbar.openMenu" />
              </span>
              {isOpen ? (
                <FaTimes className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FaBars className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-midnight-800 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-[#D95F3B] hover:bg-gray-50 dark:hover:bg-midnight-700"
                onClick={() => setIsOpen(false)}
              >
                <T text={item.nameKey} />
              </Link>
            ))}
            <Link
              to="/login"
              className="block w-full text-center mt-4 px-4 py-2 text-sm font-medium rounded-md text-white bg-[#D95F3B] hover:bg-[#C04F2F]"
              onClick={() => setIsOpen(false)}
            >
              <T text="auth.signIn" />
            </Link>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-midnight-600">
              <p className="px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                <T text="language.select" />
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    handleLanguageChange('en');
                    setIsOpen(false);
                  }}
                  className={`flex-1 py-2 px-3 text-sm rounded-md ${currentLanguage === 'en' ? 'bg-gray-100 text-[#D95F3B] font-medium' : 'bg-white border border-gray-200 text-gray-700'}`}
                >
                  <T text="language.english" />
                </button>
                <button
                  onClick={() => {
                    handleLanguageChange('fr');
                    setIsOpen(false);
                  }}
                  className={`flex-1 py-2 px-3 text-sm rounded-md ${currentLanguage === 'fr' ? 'bg-gray-100 text-[#D95F3B] font-medium' : 'bg-white border border-gray-200 text-gray-700'}`}
                >
                  <T text="language.french" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}