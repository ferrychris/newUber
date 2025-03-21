import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/userDashcomponents/Sidebar';
import DashIndex from '../components/userDashcomponents/DashIndex';
import DashNav from '../components/userDashcomponents/Dashnav';
import Order from '../components/userDashcomponents/Order';
import Wallet from '../components/userDashcomponents/Wallet';
import ShipmentTrack from '../components/userDashcomponents/ShipmentTrack';
import Message from '../components/userDashcomponents/Message';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { detectUserLanguage } from '../utils/i18n';

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
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      
      {/* Main Content */}
      <motion.div 
        className="flex-1 lg:ml-64 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Navigation */}
        <DashNav />
        
        {/* Page Content */}
        <motion.div 
          className="pt-20 px-4 lg:px-6 pb-6"
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
                <Route path="shipment" element={
                  <motion.div {...pageTransition}>
                    <ShipmentTrack />
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
                    <Message />
                  </motion.div>
                } />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AnimatePresence>
          </main>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UserDash;