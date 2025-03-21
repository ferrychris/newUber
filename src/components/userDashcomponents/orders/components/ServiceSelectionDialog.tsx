import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaDollarSign, FaClock, FaShippingFast } from 'react-icons/fa';
import { Service, ServiceType } from '../types';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../../utils/i18n';
import { SERVICES } from '../constants';

interface ServiceSelectionDialogProps {
  onClose: () => void;
  onSelectService: (service: Service) => void;
}

const ServiceSelectionDialog: React.FC<ServiceSelectionDialogProps> = ({
  onClose,
  onSelectService,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
          className="relative w-full max-w-3xl p-6 bg-white dark:bg-midnight-800 border border-gray-100 dark:border-stone-700/20 
            rounded-xl shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 dark:text-stone-400 hover:text-gray-600 dark:hover:text-stone-300 
              transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-stone-800/50"
            aria-label={t('common.close')}
          >
            <FaTimes className="w-4 h-4" />
          </motion.button>

          <div className="mb-8 text-center">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-semibold text-gray-900 dark:text-white"
            >
              {t('services.selectTitle')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-500 dark:text-stone-400 mt-2"
            >
              {t('services.selectDescription')}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SERVICES.map((service, index) => {
              // Define color variants based on service type
              const getColorScheme = (type: ServiceType) => {
                switch (type) {
                  case ServiceType.PARCELS:
                    return {
                      bg: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                      border: 'border-gray-200 dark:border-stone-700/20 hover:border-indigo-200 dark:hover:border-indigo-800/30',
                      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
                      text: 'text-indigo-600 dark:text-indigo-400'
                    };
                  case ServiceType.SHOPPING:
                    return {
                      bg: 'hover:bg-teal-50 dark:hover:bg-teal-900/20',
                      border: 'border-gray-200 dark:border-stone-700/20 hover:border-teal-200 dark:hover:border-teal-800/30',
                      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
                      text: 'text-teal-600 dark:text-teal-400'
                    };
                  case ServiceType.CARPOOLING:
                    return {
                      bg: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
                      border: 'border-gray-200 dark:border-stone-700/20 hover:border-blue-200 dark:hover:border-blue-800/30',
                      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                      text: 'text-blue-600 dark:text-blue-400'
                    };
                  default:
                    return {
                      bg: 'hover:bg-gray-50 dark:hover:bg-gray-800/30',
                      border: 'border-gray-200 dark:border-stone-700/20',
                      iconBg: 'bg-gray-100 dark:bg-gray-800/50',
                      text: 'text-gray-600 dark:text-gray-400'
                    };
                }
              };
              
              const colorScheme = getColorScheme(service.type);
              
              return (
                <motion.button
                  key={service.type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectService(service)}
                  className={`group relative overflow-hidden p-5 bg-white dark:bg-midnight-800 
                    border ${colorScheme.border} rounded-xl text-left transition-all 
                    duration-300 ${colorScheme.bg} hover:shadow-md`}
                >
                  <div className="relative">
                    {/* Service Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-2.5 rounded-lg ${colorScheme.iconBg} ${colorScheme.text}`}>
                        <FaShippingFast />
                      </div>
                      <h3 className={`font-medium text-gray-900 dark:text-white text-lg`}>
                        {service.name}
                      </h3>
                    </div>
                    
                    {/* Service Description */}
                    <p className="text-gray-500 dark:text-stone-400 mb-4 min-h-[48px] text-sm">
                      {t(`services.${service.type}.description`)}
                    </p>

                    {/* Service Pricing and Time */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full ${colorScheme.iconBg} flex items-center justify-center ${colorScheme.text}`}>
                          <FaDollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-stone-400">Price from</p>
                          <p className={`text-sm font-medium ${colorScheme.text}`}>
                            {formatCurrency(service.minPrice)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full ${colorScheme.iconBg} flex items-center justify-center ${colorScheme.text}`}>
                          <FaClock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-stone-400">Delivery time</p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {service.type === ServiceType.SHOPPING ? '1-2 days' : 
                             service.type === ServiceType.PARCELS ? 'Same day' : '3-5 days'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Service Features */}
                    <motion.ul
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-4 space-y-2 text-xs text-gray-500 dark:text-stone-400"
                    >
                      {(() => {
                        // Safely get features with fallback
                        try {
                          const features = t(`services.${service.type}.features`, { returnObjects: true });
                          
                          if (Array.isArray(features)) {
                            return features.map((feature: any, idx: number) => (
                              <li key={idx} className="flex items-start">
                                <span className={`mr-2 text-xs mt-0.5 ${colorScheme.text}`}>•</span>
                                <span>{String(feature)}</span>
                              </li>
                            ));
                          } else {
                            // If features is not an array, return default features
                            return [
                              <li key="default1" className="flex items-start">
                                <span className={`mr-2 text-xs mt-0.5 ${colorScheme.text}`}>•</span>
                                <span>{t('services.defaultFeature1')}</span>
                              </li>,
                              <li key="default2" className="flex items-start">
                                <span className={`mr-2 text-xs mt-0.5 ${colorScheme.text}`}>•</span>
                                <span>{t('services.defaultFeature2')}</span>
                              </li>
                            ];
                          }
                        } catch (error) {
                          console.warn(`Couldn't get features for ${service.type}:`, error);
                          return null;
                        }
                      })()}
                    </motion.ul>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Cancel Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={onClose}
            className="mt-6 w-full px-4 py-2 text-sm text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-300 
              transition-colors border border-gray-200 dark:border-stone-700/20 rounded-lg hover:bg-gray-50 dark:hover:bg-stone-800/20"
          >
            {t('form.cancel')}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ServiceSelectionDialog;