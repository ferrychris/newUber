import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaDollarSign, FaClock, FaShippingFast } from 'react-icons/fa';
import { Service, ServiceType } from '../types';
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
  // Filter services to only show Large Items
  const availableServices = SERVICES.filter(service => 
    service.type === ServiceType.LARGE_ITEMS
  );

  const getColorScheme = (type: string) => {
    switch (type) {
      case 'express':
        return 'sunset'; // Using sunset color for express services
      case 'delivery':
        return 'purple'; // Using purple for delivery services
      case 'transport':
        return 'emerald'; // Keep emerald for transport
      default:
        return 'sunset'; // Default to sunset
    }
  };

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
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-midnight-800 rounded-2xl shadow-xl overflow-hidden max-w-lg w-full border border-gray-200 dark:border-stone-600/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-stone-600/10 bg-sunset">
            <h2 className="text-xl font-semibold text-white">
              Select Service
            </h2>
            <button 
              className="p-2 text-white/80 hover:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
              onClick={onClose}
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-midnight-800">
            <p className="text-gray-500 dark:text-stone-400 text-center">
              Choose from our range of available services
            </p>
            <p className="text-sunset font-medium text-center mt-2">
              Note: Carpooling and Shopping delivery services are temporarily suspended
            </p>
          </div>

          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-4">
              {availableServices.map((service) => {
                const colorKey = getColorScheme(service.type);
                const colorClass = {
                  sunset: 'bg-sunset',
                  purple: 'bg-purple-500',
                  emerald: 'bg-emerald-500'
                }[colorKey];

                return (
                  <motion.div
                    key={service.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative bg-white dark:bg-midnight-700 border border-gray-200 dark:border-stone-600/10 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => onSelectService(service)}
                  >
                    <div className="flex items-center p-4">
                      <div className={`p-3 rounded-xl ${colorClass} text-white mr-4`}>
                        {service.icon || <FaShippingFast />}
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900 dark:text-white">
                          {service.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
                          {service.description}
                        </p>

                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center text-sm text-gray-500 dark:text-stone-400">
                            <FaDollarSign className="text-sunset mr-1" />
                            <span className="text-xs text-gray-500 dark:text-stone-400">
                              Starting at {formatCurrency(service.minPrice)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 dark:text-stone-400">
                            <FaClock className="text-purple-500 mr-1" />
                            <span>{'30-60 min'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-stone-600/10 bg-gray-50 dark:bg-midnight-700 flex justify-end">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-stone-300 bg-white dark:bg-midnight-800 border border-gray-300 dark:border-stone-600 rounded-md hover:bg-gray-50 dark:hover:bg-midnight-700 focus:outline-none focus:ring-2 focus:ring-sunset"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ServiceSelectionDialog;