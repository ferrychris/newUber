import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaMapMarkerAlt, FaAngleRight } from 'react-icons/fa';
import { Order, Service } from '../types';
import { getStatusConfig, formatCurrency, formatDate } from '../utils';

interface OrderCardProps {
  order: Order;
  service: Service;
  onClick: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, service, onClick }) => {
  const { t } = useTranslation();
  const statusConfig = getStatusConfig(order.status);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      onClick={onClick}
      className="relative p-4 bg-white dark:bg-midnight-800 border border-gray-100 dark:border-stone-700/20 
        rounded-xl shadow-sm hover:shadow-md cursor-pointer group overflow-hidden"
    >
      <div className="relative">
        {/* Status Badge */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2 items-center">
            <div 
              className={`p-2 rounded-lg ${service.theme.bg ? service.theme.bg.replace('bg-', 'bg-') : 'bg-indigo-100 dark:bg-indigo-900/30'}`}
            >
              {service.icon || <FaMapMarkerAlt className={`w-4 h-4 ${service.theme.text || 'text-indigo-600 dark:text-indigo-400'}`} />}
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {service.name}
            </h3>
          </div>
          <span 
            className={`px-2 py-1 text-xs font-medium rounded-full
              ${statusConfig.bgClass} ${statusConfig.textClass}`}
          >
            {t(`status.${order.status}`)}
          </span>
        </div>
        
        {/* Locations */}
        <div className="mb-4 text-sm">
          <div className="flex items-start">
            <div className="min-w-8 pt-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 mx-auto"></div>
            </div>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-medium">
                {order.pickup_location.split(',')[0]}
              </p>
              <p className="text-gray-500 dark:text-stone-400 text-xs truncate">
                {order.pickup_location}
              </p>
            </div>
          </div>
          
          <div className="flex items-center ml-4 my-1">
            <div className="border-l-2 border-dashed border-gray-300 dark:border-stone-600 h-6"></div>
          </div>
          
          <div className="flex items-start">
            <div className="min-w-8 pt-1">
              <div className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 mx-auto"></div>
            </div>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-medium">
                {order.dropoff_location.split(',')[0]}
              </p>
              <p className="text-gray-500 dark:text-stone-400 text-xs truncate">
                {order.dropoff_location}
              </p>
            </div>
          </div>
        </div>
        
        {/* Price */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-stone-400">
              {t('orders.estimatedPrice')}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(order.estimated_price)}
            </p>
          </div>
          {order.actual_price && (
            <div>
              <p className="text-xs text-gray-500 dark:text-stone-400 text-right">
                {t('orders.actualPrice')}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(order.actual_price)}
              </p>
            </div>
          )}
        </div>
        
        {/* Date and View Details */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-stone-700/20">
          <div className="flex items-center space-x-2">
            <FaCalendarAlt className="w-4 h-4 text-gray-400 dark:text-stone-400" />
            <span className="text-sm text-gray-500 dark:text-stone-400">
              {formatDate(new Date(order.created_at).toISOString().split('T')[0])}
            </span>
          </div>
          <motion.div
            whileHover={{ x: 5 }}
            className={`flex items-center gap-1 text-sm font-medium ${service.theme.text || 'text-indigo-600 dark:text-indigo-400'}`}
          >
            <span className="group-hover:underline">{t('orders.viewDetails')}</span>
            <FaAngleRight className="w-3 h-3" />
          </motion.div>
        </div>
        
        {/* Service Features */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-gray-100 dark:border-stone-700/20"
        >
          <ul className="space-y-1">
            {(() => {
              try {
                const features = t(`services.${service.type}.features`, { returnObjects: true });
                return Array.isArray(features) 
                  ? features.slice(0, 2).map((feature: string, idx: number) => (
                      <li key={idx} className="text-xs text-gray-500 dark:text-stone-400 flex items-start">
                        <span className={`mr-2 text-xs mt-0.5 ${service.theme.text || 'text-indigo-600 dark:text-indigo-400'}`}>•</span>
                        <span>{feature}</span>
                      </li>
                    ))
                  : null;
              } catch (error) {
                return null;
              }
            })()}
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OrderCard;