import React from 'react';
import { motion } from 'framer-motion';
import { FaRoute, FaClock, FaInfoCircle, FaWallet, FaMoneyBill, FaCreditCard } from 'react-icons/fa';
import { Service, DistanceResult, ServiceType } from '../types';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../../utils/i18n';

interface PriceInfoCardProps {
  distanceResult: DistanceResult;
  service: Service;
  price: number;
  walletBalance?: number;
  onPaymentMethodChange?: (method: 'wallet' | 'cash' | 'card') => void;
  selectedPaymentMethod?: 'wallet' | 'cash' | 'card';
}

const PriceInfoCard: React.FC<PriceInfoCardProps> = ({ 
  distanceResult, 
  service, 
  price, 
  walletBalance, 
  onPaymentMethodChange,
  selectedPaymentMethod = 'cash'
}) => {
  const { t } = useTranslation();
  
  // Calculate base price components
  const baseRate = getBaseRate(service);
  const ratePerKm = getRatePerKm(service);
  const distanceInKm = distanceResult.distance.value / 1000;
  
  // Calculate the distance cost component
  const distanceCost = distanceInKm * ratePerKm;
  
  const handlePaymentMethodChange = (method: 'wallet' | 'cash' | 'card') => {
    if (onPaymentMethodChange) {
      onPaymentMethodChange(method);
    }
  };

  const insufficientFunds = walletBalance !== undefined && selectedPaymentMethod === 'wallet' && walletBalance < price;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-midnight-900/90 p-4 rounded-lg border border-stone-800/30 shadow-lg backdrop-blur-sm"
    >
      <h3 className="text-lg font-semibold text-stone-200 mb-3 flex items-center">
        <FaInfoCircle className={`${service.theme.text} mr-2`} />
        {t('price.breakdown')}
      </h3>
      
      {/* Distance and Duration */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <FaRoute className="text-stone-400" />
          <div>
            <p className="text-sm text-stone-400">{t('price.distance')}</p>
            <p className="text-stone-200 font-medium">{distanceResult.distance.text}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <FaClock className="text-stone-400" />
          <div>
            <p className="text-sm text-stone-400">{t('price.duration')}</p>
            <p className="text-stone-200 font-medium">{distanceResult.duration.text}</p>
          </div>
        </div>
      </div>
      
      {/* Price Breakdown */}
      <div className="space-y-2 border-t border-stone-800/50 pt-3 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-stone-400">{t('price.baseRate')}</span>
          <span className="text-stone-300">{formatCurrency(baseRate)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-stone-400">
            {t('price.distanceRate', { rate: formatCurrency(ratePerKm), distance: distanceInKm.toFixed(1) })}
          </span>
          <span className="text-stone-300">{formatCurrency(distanceCost)}</span>
        </div>
        
        <div className="flex justify-between items-center border-t border-stone-800/30 pt-2 font-medium">
          <span className="text-stone-200">{t('price.total')}</span>
          <span className="text-xl text-sunset-400">{formatCurrency(price)}</span>
        </div>
      </div>

      {/* Payment Method Selection */}
      {onPaymentMethodChange && (
        <div className="mt-4 border-t border-stone-800/50 pt-3">
          <p className="text-sm text-stone-300 mb-2">{t('price.paymentMethod')}</p>
          
          <div className="grid grid-cols-3 gap-2">
            {walletBalance !== undefined && (
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('wallet')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                  selectedPaymentMethod === 'wallet'
                    ? 'bg-sunset-500/20 border-sunset-500 text-white'
                    : 'bg-midnight-800 border-stone-700 text-stone-300 hover:bg-midnight-700'
                }`}
              >
                <FaWallet className={selectedPaymentMethod === 'wallet' ? 'text-sunset-500' : 'text-stone-400'} />
                <span className="text-xs mt-1">{t('price.wallet')}</span>
                <span className="text-xs mt-1">{formatCurrency(walletBalance)}</span>
                {insufficientFunds && (
                  <span className="text-xs text-red-500 mt-1">{t('price.insufficientFunds')}</span>
                )}
              </button>
            )}
            
            <button
              type="button"
              onClick={() => handlePaymentMethodChange('cash')}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                selectedPaymentMethod === 'cash'
                  ? 'bg-sunset-500/20 border-sunset-500 text-white'
                  : 'bg-midnight-800 border-stone-700 text-stone-300 hover:bg-midnight-700'
              }`}
            >
              <FaMoneyBill className={selectedPaymentMethod === 'cash' ? 'text-sunset-500' : 'text-stone-400'} />
              <span className="text-xs mt-1">{t('price.cash')}</span>
            </button>
            
            <button
              type="button"
              onClick={() => handlePaymentMethodChange('card')}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                selectedPaymentMethod === 'card'
                  ? 'bg-sunset-500/20 border-sunset-500 text-white'
                  : 'bg-midnight-800 border-stone-700 text-stone-300 hover:bg-midnight-700'
              }`}
            >
              <FaCreditCard className={selectedPaymentMethod === 'card' ? 'text-sunset-500' : 'text-stone-400'} />
              <span className="text-xs mt-1">{t('price.card')}</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Gets the base rate for a service
function getBaseRate(service: Service): number {
  switch (service.type) {
    case ServiceType.CARPOOLING:
      return 5;
    case ServiceType.PARCELS:
      return 3;
    case ServiceType.SHOPPING:
      return 4;
    case ServiceType.MEALS:
      return 2.5;
    case ServiceType.LARGE_ITEMS:
      return 10;
    default:
      return 5;
  }
}

// Gets the rate per kilometer for a service
function getRatePerKm(service: Service): number {
  switch (service.type) {
    case ServiceType.CARPOOLING:
      return 0.8;
    case ServiceType.PARCELS:
      return 0.6;
    case ServiceType.SHOPPING:
      return 0.7;
    case ServiceType.MEALS:
      return 0.5;
    case ServiceType.LARGE_ITEMS:
      return 1.2;
    default:
      return 0.8;
  }
}

export default PriceInfoCard;