import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaClock, FaSpinner, FaInfoCircle, FaRoute, FaWallet, FaMoneyBill } from 'react-icons/fa';
import LocationInput from '../../LocationInput';
import { Service, OrderFormData, OrderFormErrors, DistanceResult } from '../types';
import { validateOrderForm, calculatePrice } from '../utils';
import { useTranslation } from 'react-i18next';
import { formatDateForInput } from '../../../../utils/i18n';
import { calculateRoute, formatDistance, formatDuration } from '../../../../utils/mapboxService';
import PriceInfoCard from './PriceInfoCard';
import { getUserWallet } from '../../../../utils/stripe';
import { supabase } from '../../../../utils/supabase';

interface OrderFormProps {
  service: Service;
  order?: OrderFormData;
  onSubmit: (data: OrderFormData) => Promise<void>;
  isSubmitting: boolean;
  viewOnly?: boolean;
}

interface LocationValidations {
  pickupLocation: boolean;
  destination: boolean;
}

interface LocationCoordinates {
  pickup?: [number, number];
  destination?: [number, number];
}

const OrderForm: React.FC<OrderFormProps> = ({ 
  service, 
  order, 
  onSubmit, 
  isSubmitting,
  viewOnly = false 
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<OrderFormData>({
    pickupLocation: order?.pickupLocation || '',
    destination: order?.destination || '',
    scheduledDate: order?.scheduledDate || '',
    scheduledTime: order?.scheduledTime || '12:00',
    price: order?.price || service.minPrice,
    serviceType: service.type,
    paymentMethod: 'cash'
  });

  const [errors, setErrors] = useState<OrderFormErrors>({});
  const [distanceResult, setDistanceResult] = useState<DistanceResult | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [locationValidations, setLocationValidations] = useState<LocationValidations>({
    pickupLocation: false,
    destination: false
  });
  const [coordinates, setCoordinates] = useState<LocationCoordinates>({});
  const [walletBalance, setWalletBalance] = useState<number | undefined>(undefined);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  // Set default date and time to now in local timezone
  useEffect(() => {
    if (!order) {
      const now = new Date();
      setFormData(prev => ({
        ...prev,
        scheduledDate: formatDateForInput(now),
        scheduledTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      }));
    }
  }, [order]);

  // Fetch wallet balance when component mounts
  useEffect(() => {
    async function fetchWalletBalance() {
      try {
        setIsLoadingWallet(true);
        // Check if the user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const userWallet = await getUserWallet(session.user.id);
        if (userWallet) {
          setWalletBalance(userWallet.balance);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      } finally {
        setIsLoadingWallet(false);
      }
    }

    fetchWalletBalance();
  }, []);

  const calculateDistance = async () => {
    if (!coordinates.pickup || !coordinates.destination) return;

    setIsCalculatingDistance(true);
    try {
      const routeData = await calculateRoute(coordinates.pickup, coordinates.destination);
      
      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error(t('location.noRouteFound'));
      }

      const route = routeData.routes[0];
      const distanceInMeters = route.distance;
      const durationInSeconds = route.duration;

      const distanceResult: DistanceResult = {
        distance: {
          text: formatDistance(distanceInMeters),
          value: distanceInMeters
        },
        duration: {
          text: formatDuration(durationInSeconds),
          value: durationInSeconds
        }
      };

      setDistanceResult(distanceResult);
      const distanceInKm = distanceInMeters / 1000;
      const calculatedPrice = calculatePrice(distanceInKm, service);
      setFormData(prev => ({ ...prev, price: calculatedPrice }));
      setErrors(prev => ({ ...prev, distance: undefined }));
    } catch (error) {
      console.error('Error calculating distance:', error);
      setErrors(prev => ({
        ...prev,
        distance: t('location.distanceError')
      }));
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const handleLocationChange = async (field: 'pickupLocation' | 'destination', value: string, coords?: [number, number]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setLocationValidations(prev => ({ ...prev, [field]: false }));

    // Store coordinates if provided
    if (coords) {
      setCoordinates(prev => ({ 
        ...prev, 
        [field === 'pickupLocation' ? 'pickup' : 'destination']: coords 
      }));
    }

    // Clear same address error if addresses are different
    if (field === 'destination' && value !== formData.pickupLocation) {
      setErrors(prev => ({ ...prev, sameAddress: undefined }));
    }

    // If there's no value, clear the errors and return
    if (!value) {
      setErrors(prev => ({ ...prev, [field]: t('location.required') }));
      return;
    }

    // Mark as valid if coordinates are provided
    if (coords) {
      setLocationValidations(prev => ({ ...prev, [field]: true }));
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Check for same address
    const otherField = field === 'pickupLocation' ? 'destination' : 'pickupLocation';
    if (value === formData[otherField]) {
      setErrors(prev => ({ ...prev, sameAddress: t('location.sameAddressError') }));
      return;
    }

    // Clear distance error since the user is changing locations
    setErrors(prev => ({ ...prev, distance: undefined }));

    // Calculate distance if both locations have valid coordinates
    if (
      (field === 'pickupLocation' && coords && coordinates.destination) ||
      (field === 'destination' && coords && coordinates.pickup)
    ) {
      await calculateDistance();
    }
  };

  const handlePaymentMethodChange = async (method: 'wallet' | 'cash' | 'card') => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method
    }));

    // Clear any payment-related errors
    setErrors(prev => ({
      ...prev,
      insufficientFunds: undefined,
      paymentError: undefined
    }));

    // Validate wallet balance if wallet payment is selected
    if (method === 'wallet' && walletBalance !== undefined && walletBalance < formData.price) {
      setErrors(prev => ({
        ...prev,
        insufficientFunds: t('price.insufficientFunds')
      }));
    }

    // Handle card payment setup
    if (method === 'card') {
      try {
        setIsProcessingCard(true);
        // Here you would typically initialize your payment processor (e.g., Stripe)
        // For now, we'll just simulate a successful setup
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error setting up card payment:', error);
        setErrors(prev => ({
          ...prev,
          paymentError: t('payment.cardSetupError')
        }));
      } finally {
        setIsProcessingCard(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (viewOnly) return;
    
    // Check if we can calculate a route
    if (!coordinates.pickup || !coordinates.destination) {
      setErrors({
        ...errors,
        form: t('location.enterBothLocations')
      });
      return;
    }
    
    // Client-side validation
    const validationErrors = validateOrderForm({
      ...formData,
      minPrice: service.minPrice,
      paymentMethod: formData.paymentMethod || 'cash'
    }, !!distanceResult);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Validate payment method
    if (formData.paymentMethod === 'wallet' && walletBalance !== undefined && walletBalance < formData.price) {
      setErrors({
        ...errors,
        insufficientFunds: t('price.insufficientFunds')
      });
      return;
    }

    // Handle card payment processing
    if (formData.paymentMethod === 'card') {
      try {
        setIsProcessingCard(true);
        // Here you would typically process the payment with your payment processor
        // For now, we'll just simulate a successful payment
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error processing card payment:', error);
        setErrors({
          ...errors,
          paymentError: t('payment.processingError')
        });
        return;
      } finally {
        setIsProcessingCard(false);
      }
    }
    
    try {
      // Proceed with form submission      
      await onSubmit({
        ...formData,
        walletBalance
      });
    } catch (error) {
      console.error('Error submitting order:', error);
      setErrors({
        ...errors,
        form: t('errors.submitFailed')
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-6 px-4 sm:px-6 md:px-8 max-w-4xl m-auto">
      <div className="space-y-6">
        {/* French Address Notice */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-stone-400 p-3 
            bg-stone-800/20 rounded-lg border border-stone-800/30"
        >
          <FaInfoCircle className={service.theme.text} />
          <span>{t('location.franceOnly')}</span>
        </motion.div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Pickup Location */}
            <LocationInput
              label={t('form.pickupLocation')}
              value={formData.pickupLocation}
              onChange={(value, coords) => handleLocationChange('pickupLocation', value, coords)}
              error={errors.pickupLocation}
              disabled={isSubmitting || viewOnly}
            />

            {/* Destination */}
            <LocationInput
              label={t('form.destination')}
              value={formData.destination}
              onChange={(value, coords) => handleLocationChange('destination', value, coords)}
              error={errors.destination}
              disabled={isSubmitting || viewOnly}
            />

            {/* Same Address Error */}
            {errors.sameAddress && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400"
              >
                {errors.sameAddress}
              </motion.p>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Date Input */}
            <div>
              <label className="block mb-2 text-sm font-medium text-stone-300">
                {t('form.scheduledDate')}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  min={formatDateForInput(new Date())}
                  className={`w-full pl-10 pr-4 py-2 bg-midnight-900/90 border ${
                    errors.scheduledDate ? 'border-red-500/50' : 'border-stone-800/50'
                  } rounded-lg text-stone-300 focus:outline-none focus:border-sunset/50
                    disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm`}
                  disabled={isSubmitting || viewOnly}
                />
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" />
              </div>
              {errors.scheduledDate && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-400"
                >
                  {errors.scheduledDate}
                </motion.p>
              )}
            </div>

            {/* Time Input */}
            <div>
              <label className="block mb-2 text-sm font-medium text-stone-300">
                {t('form.scheduledTime')}
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  min="08:00"
                  max="20:00"
                  className={`w-full pl-10 pr-4 py-2 bg-midnight-900/90 border ${
                    errors.scheduledTime ? 'border-red-500/50' : 'border-stone-800/50'
                  } rounded-lg text-stone-300 focus:outline-none focus:border-sunset/50
                    disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm`}
                  disabled={isSubmitting || viewOnly}
                />
                <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" />
              </div>
              {errors.scheduledTime && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-400"
                >
                  {errors.scheduledTime}
                </motion.p>
              )}
            </div>

            {/* Distance information and price */}
            {distanceResult && !errors.distance && (
              <div className="mt-4">
                <PriceInfoCard 
                  distanceResult={distanceResult} 
                  service={service} 
                  price={formData.price}
                  walletBalance={walletBalance}
                  onPaymentMethodChange={handlePaymentMethodChange}
                  selectedPaymentMethod={formData.paymentMethod}
                />
              </div>
            )}

            {/* Payment Method Selection */}
            {handlePaymentMethodChange && (
              <div className="mt-4 border-t border-stone-800/50 pt-3">
                <p className="text-sm text-stone-300 mb-2">{t('price.paymentMethod')}</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('wallet')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                      formData.paymentMethod === 'wallet'
                        ? 'bg-sunset-500/20 border-sunset-500 text-white'
                        : 'bg-midnight-800 border-stone-700 text-stone-300 hover:bg-midnight-700'
                    }`}
                  >
                    <FaWallet className={formData.paymentMethod === 'wallet' ? 'text-sunset-500' : 'text-stone-400'} />
                    <span className="text-xs mt-1">{t('price.wallet')}</span>
                    <span className="text-xs mt-1">{walletBalance !== undefined ? walletBalance.toFixed(2) : ''}</span>
                    {errors.insufficientFunds && (
                      <span className="text-xs text-red-500 mt-1">{t('price.insufficientFunds')}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('cash')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                      formData.paymentMethod === 'cash'
                        ? 'bg-sunset-500/20 border-sunset-500 text-white'
                        : 'bg-midnight-800 border-stone-700 text-stone-300 hover:bg-midnight-700'
                    }`}
                  >
                    <FaMoneyBill className={formData.paymentMethod === 'cash' ? 'text-sunset-500' : 'text-stone-400'} />
                    <span className="text-xs mt-1">{t('price.cash')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('card')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                      formData.paymentMethod === 'card'
                        ? 'bg-sunset-500/20 border-sunset-500 text-white'
                        : 'bg-midnight-800 border-stone-700 text-stone-300 hover:bg-midnight-700'
                    }`}
                  >
                    <FaWallet className={formData.paymentMethod === 'card' ? 'text-sunset-500' : 'text-stone-400'} />
                    <span className="text-xs mt-1">{t('price.card')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading Wallet Balance */}
            {isLoadingWallet && (
              <div className="mt-4 p-3 bg-blue-900/30 border border-blue-800 rounded-lg text-blue-300">
                {t('loading.walletBalance')}
              </div>
            )}

            {/* Insufficient funds error */}
            {errors.insufficientFunds && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300">
                {errors.insufficientFunds}
              </div>
            )}
          </div>
        </div>

        {/* Distance Loading */}
        {isCalculatingDistance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-2 text-stone-400"
          >
            <FaSpinner className="animate-spin mr-2" />
            <span>{t('form.calculating')}</span>
          </motion.div>
        )}

        {/* Distance Error with Calculate Button */}
        {errors.distance && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center"
          >
            <p className="text-sm text-red-400 mb-2">
              {errors.distance}
            </p>
            <button
              type="button"
              onClick={calculateDistance}
              disabled={isCalculatingDistance || !locationValidations.pickupLocation || !locationValidations.destination}
              className={`px-4 py-2 ${service.theme.bg} text-white font-medium rounded-lg 
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                hover:opacity-90 backdrop-blur-sm flex items-center`}
            >
              {isCalculatingDistance ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaRoute className="mr-2" />
              )}
              {t('form.calculateDistance')}
            </button>
          </motion.div>
        )}

        {/* Form Error */}
        {errors.form && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-400 text-center"
          >
            {errors.form}
          </motion.div>
        )}

        {/* Submit Button */}
        {!viewOnly && (
          <motion.button
            type="submit"
            disabled={isSubmitting || !locationValidations.pickupLocation || !locationValidations.destination}
            className={`w-full px-4 py-3 ${service.theme.bg} text-white font-medium rounded-lg 
              shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
              hover:opacity-90 backdrop-blur-sm`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center space-x-2">
                <FaSpinner className="animate-spin" />
                <span>{t('form.submitting')}</span>
              </span>
            ) : (
              t('form.submit')
            )}
          </motion.button>
        )}
      </div>
    </form>
  );
};

export default OrderForm;