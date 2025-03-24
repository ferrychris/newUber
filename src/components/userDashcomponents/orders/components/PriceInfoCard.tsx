import React from 'react';
import { FaInfoCircle, FaRoute, FaClock } from 'react-icons/fa';
import { Service, DistanceResult } from '../types';
import { formatCurrency } from '../../../../utils/i18n';
import { useTranslation } from 'react-i18next';

interface PriceInfoCardProps {
  distanceResult: DistanceResult;
  service: Service;
  price: number;
}

const PriceInfoCard: React.FC<PriceInfoCardProps> = ({ 
  distanceResult, 
  service, 
  price
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg overflow-hidden bg-midnight-800/90 border border-stone-800/50 shadow-lg">
      {/* Header */}
      <div className={`${service.theme.bg} px-4 py-3 flex justify-between items-center`}>
        <h3 className="text-white font-medium">{t('price.estimatedPrice')}</h3>
        <span className="text-white font-bold text-lg">{formatCurrency(price)}</span>
      </div>
      
      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Distance */}
        <div className="flex items-center justify-between">
          <span className="flex items-center text-stone-300">
            <FaRoute className="mr-2 text-stone-400" />
            {t('price.distance')}
          </span>
          <span className="text-white">{distanceResult.distance.text}</span>
        </div>
        
        {/* Duration */}
        <div className="flex items-center justify-between">
          <span className="flex items-center text-stone-300">
            <FaClock className="mr-2 text-stone-400" />
            {t('price.duration')}
          </span>
          <span className="text-white">{distanceResult.duration.text}</span>
        </div>
        
        {/* Service type */}
        <div className="flex items-center justify-between">
          <span className="flex items-center text-stone-300">
            <FaInfoCircle className="mr-2 text-stone-400" />
            {t('price.serviceType')}
          </span>
          <span className="text-white">{t(`services.${service.type}`)}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceInfoCard;