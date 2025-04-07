import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaInfoCircle } from 'react-icons/fa';

interface PriceInfoCardProps {
  distanceResult: {
    distance: number;
    duration: number;
  };
  service: {
    name: string;
    price_per_km: number;
    base_price: number;
    currency: string;
  };
  price: number;
}

const PriceInfoCard: React.FC<PriceInfoCardProps> = ({ distanceResult, service, price }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-midnight-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-stone-600/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('Price Breakdown')}
        </h3>
        <FaInfoCircle className="text-gray-400 dark:text-gray-500" />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">
            {t('order.basePrice')}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {service.base_price} {service.currency}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">
            {t('order.distancePrice')} ({distanceResult.distance.toFixed(1)} km)
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {(distanceResult.distance * service.price_per_km).toFixed(2)} {service.currency}
          </span>
        </div>
        
        <div className="border-t border-gray-200 dark:border-stone-600/10 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('order.totalPrice')}
            </span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {price.toFixed(2)} {service.currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceInfoCard; 