import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/userDashcomponents/Sidebar';
import DashIndex from '../components/userDashcomponents/DashIndex';
import DashNav from '../components/userDashcomponents/Dashnav';
import Order from '../components/userDashcomponents/Order';
import Wallet from '../components/userDashcomponents/Wallet';
import OrderTracker from '../components/userDashcomponents/OrderTracker';
import Support from '../components/userDashcomponents/Support';
import Account from '../components/userDashcomponents/Account';
import MobileNavigation from '../components/userDashcomponents/MobileNavigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { detectUserLanguage } from '../utils/i18n';
import MessageComponent from '../components/userDashcomponents/Message';

export const UserDash = () => {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        const detectedLanguage = await detectUserLanguage();
        await i18n.changeLanguage(detectedLanguage);
      } catch (error) {
        console.error('Error initializing language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLanguage();
  }, [i18n]);

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };
  
  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { 
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-midnight-900 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 dark:border-sunset-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-midnight-900">
      {/* Sidebar - Now with responsive behavior */}
      <div className={`${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto'} fixed inset-y-0 left-0 z-40 transition-all duration-300 transform`}>
        <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      </div>
      
      {/* Sidebar Overlay - Mobile Only */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={handleCloseSidebar}
        ></div>
      )}
      
      {/* Main Content */}
      <motion.div 
        className={`flex-1 lg:ml-64 relative transition-all duration-300`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Navigation */}
        <DashNav isSidebarOpen={isSidebarOpen} onToggleSidebar={handleToggleSidebar} />
        
        {/* Page Content */}
        <motion.div 
          className="pt-20 px-4 lg:px-6 pb-24 md:pb-6"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <main>
            <AnimatePresence mode="wait">
              <Routes>
                <Route index element={
                  <motion.div {...pageTransition}>
                    <DashIndex />
                  </motion.div>
                } />
                <Route path="track-order" element={
                  <motion.div {...pageTransition}>
                    <OrderTracker />
                  </motion.div>
                } />
                <Route path="orders" element={
                  <motion.div {...pageTransition}>
                    <Order />
                  </motion.div>
                } />
                <Route path="place-order" element={
                  <motion.div {...pageTransition}>
                    <Order />
                  </motion.div>
                } />
                <Route path="wallet" element={
                  <motion.div {...pageTransition}>
                    <Wallet />
                  </motion.div>
                } />
                <Route path="message" element={
                  <motion.div {...pageTransition}>
                    <MessageComponent />
                  </motion.div>
                } />
                <Route path="support" element={
                  <motion.div {...pageTransition}>
                    <Support />
                  </motion.div>
                } />
                <Route path="account" element={
                  <motion.div {...pageTransition}>
                    <Account />
                  </motion.div>
                } />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AnimatePresence>
          </main>
        </motion.div>
        
        {/* Mobile Navigation */}
        <MobileNavigation />
      </motion.div>
    </div>
  );
};

export default UserDash;