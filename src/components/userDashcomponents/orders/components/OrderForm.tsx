import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaClock, FaSpinner, FaInfoCircle, FaRoute, FaWallet, FaMoneyBill } from 'react-icons/fa';
import LocationInput from '../../LocationInput';
import { Service, OrderFormData, OrderFormErrors, DistanceResult } from '../types';
import { validateOrderForm, calculatePrice } from '../utils';
import { formatDateForInput, formatCurrency } from '../../../../utils/i18n';
import { calculateRoute, formatDistance, formatDuration } from '../../../../utils/mapboxService';
import PriceInfoCard from './PriceInfoCard';
import { supabase, getCurrentUser } from '../../../../utils/supabase';

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
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

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

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      setIsLoadingWallet(true);
      try {
        // Try localStorage first
        const userSessionStr = localStorage.getItem('userSession');
        let userId = null;
        
        if (userSessionStr) {
          try {
            const userSession = JSON.parse(userSessionStr);
            if (userSession && userSession.id) {
              userId = userSession.id;
            }
          } catch (error) {
            console.error("Error parsing localStorage session:", error);
          }
        }
        
        // If no userId in localStorage, try Supabase auth
        if (!userId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            userId = session.user.id;
          }
        }
        
        if (!userId) {
          console.error("No user ID available for wallet lookup");
          return;
        }
        
        // Get wallet data from the database
        const { data, error } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            // No wallet found, set balance to 0
            console.log("No wallet found for user, setting balance to 0");
            setWalletBalance(0);
          } else {
            console.error("Error fetching wallet:", error);
          }
        } else if (data) {
          console.log("Wallet balance fetched:", data.balance);
          setWalletBalance(data.balance || 0);
        }
      } catch (error) {
        console.error("Error in wallet balance fetch:", error);
      } finally {
        setIsLoadingWallet(false);
      }
    };
    
    fetchWalletBalance();
  }, []);

  const calculateDistance = async () => {
    if (!coordinates.pickup || !coordinates.destination) return;

    setIsCalculatingDistance(true);
    try {
      const routeData = await calculateRoute(coordinates.pickup, coordinates.destination);
      
      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error('No route found between these locations');
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
        distance: 'Unable to calculate distance between locations'
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
      setErrors(prev => ({ ...prev, [field]: 'Location is required' }));
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
      setErrors(prev => ({ ...prev, sameAddress: 'Pickup and destination cannot be the same' }));
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

  // Handle payment method change
  const handlePaymentMethodChange = (method: 'wallet' | 'cash') => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method
    }));
    
    // Clear any existing payment errors
    setErrors(prev => ({
      ...prev,
      insufficientFunds: undefined
    }));
    
    // Check wallet balance if wallet is selected
    if (method === 'wallet' && walletBalance !== null && walletBalance < formData.price) {
      setErrors(prev => ({
        ...prev,
        insufficientFunds: 'Insufficient funds in wallet'
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (viewOnly) return;
    
    // Check if we can calculate a route
    if (!coordinates.pickup || !coordinates.destination) {
      setErrors({
        ...errors,
        form: 'Please enter both pickup and destination locations'
      });
      return;
    }
    
    // Client-side validation
    const validationErrors = validateOrderForm({
      ...formData,
      minPrice: service.minPrice,
      paymentMethod: formData.paymentMethod || 'cash' // Provide default value to fix type error
    }, !!distanceResult);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Check wallet balance if payment method is wallet
    if (formData.paymentMethod === 'wallet') {
      if (walletBalance === null) {
        setErrors({
          ...errors,
          form: 'Unable to load wallet balance. Please try again.'
        });
        return;
      }
      
      if (walletBalance < formData.price) {
        setErrors({
          ...errors,
          insufficientFunds: 'Insufficient funds in wallet'
        });
        return;
      }
    }
    
    try {
      // Get user ID using localStorage directly - match Order.tsx approach
      const userSessionStr = localStorage.getItem('userSession');
      let userId = null;
      
      if (userSessionStr) {
        try {
          const userSession = JSON.parse(userSessionStr);
          if (userSession && userSession.id) {
            userId = userSession.id;
            console.log("Using user ID from localStorage:", userId);
          }
        } catch (parseError) {
          console.error("Error parsing localStorage session:", parseError);
        }
      }
      
      // If localStorage failed, try supabase auth
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          userId = session.user.id;
          console.log("Using user ID from supabase auth:", userId);
        } else {
          console.error("No authenticated user found");
          setErrors({
            ...errors,
            form: 'Authentication required. Please log in again.'
          });
          throw new Error('User not authenticated - please log in again');
        }
      }
      
      // Lookup service ID by name (to match the pattern in Order.tsx)
      console.log("Finding service ID for:", service.name);
      
      // First check if the service exists
      const { data: serviceList, error: listError } = await supabase
        .from('services')
        .select('id')
        .eq('name', service.name);
        
      if (listError) {
        console.error("Service list error:", listError);
        throw new Error(`Error fetching services: ${listError.message}`);
      }
      
      let serviceId;
      
      if (!serviceList || serviceList.length === 0) {
        console.log("No service found with name:", service.name);
        
        // Try to find by type as fallback
        const { data: serviceByType } = await supabase
          .from('services')
          .select('id')
          .eq('type', service.type)
          .maybeSingle();
          
        if (serviceByType) {
          serviceId = serviceByType.id;
          console.log("Found service by type with ID:", serviceId);
        } else {
          // Use a hardcoded serviceId from the database if available
          // This is a last resort fallback to avoid UUID errors
          const { data: anyService } = await supabase
            .from('services')
            .select('id')
            .limit(1)
            .maybeSingle();
            
          if (anyService) {
            serviceId = anyService.id;
            console.log("Using fallback service ID:", serviceId);
          } else {
            throw new Error("Could not find any services in the database");
          }
        }
      } else {
        serviceId = serviceList[0].id;
        console.log("Found service ID:", serviceId);
      }
      
      if (!serviceId) {
        throw new Error("No valid service ID found");
      }
      
      // Prepare data to match Order.tsx expectations
      const orderData = {
        user_id: userId,
        service_id: serviceId,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.destination,
        scheduled_date: formData.scheduledDate,
        scheduled_time: formData.scheduledTime,
        estimated_price: formData.price,
        payment_method: formData.paymentMethod,
        status: "pending"
      };
      
      console.log("Creating order with data:", JSON.stringify(orderData, null, 2));
      
      // Begin a transaction if using wallet payment
      if (formData.paymentMethod === 'wallet') {
        // Start a Supabase transaction
        const { error: walletError } = await supabase.rpc('deduct_from_wallet', {
          user_id_param: userId,
          amount_param: formData.price
        });
        
        if (walletError) {
          console.error("Wallet transaction error:", walletError);
          setErrors({
            ...errors,
            form: 'Wallet transaction failed. Please try again.'
          });
          throw new Error(`Wallet transaction failed: ${walletError.message}`);
        }
        
        console.log("Wallet transaction successful");
      }
      
      // Insert the order
      const { data, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select();
      
      if (error) {
        console.error("Order creation error:", error);
        
        // If there was an error and we used the wallet, we should try to refund
        if (formData.paymentMethod === 'wallet') {
          const { error: refundError } = await supabase.rpc('add_to_wallet', {
            user_id_param: userId,
            amount_param: formData.price
          });
          
          if (refundError) {
            console.error("Failed to refund wallet after order error:", refundError);
          } else {
            console.log("Successfully refunded wallet after order error");
          }
        }
        
        setErrors({
          ...errors,
          form: 'Failed to submit order: ' + error.message
        });
        throw error;
      }

      console.log("Order created successfully:", data);
      
      // Update local wallet balance if we used wallet payment
      if (formData.paymentMethod === 'wallet' && walletBalance !== null) {
        setWalletBalance(walletBalance - formData.price);
      }
      
      // Proceed with form submission
      await onSubmit({
        ...formData
      });
      
    } catch (error) {
      console.error('Error submitting order:', error);
      if (!errors.form) {
        setErrors({
          ...errors,
          form: 'Failed to submit order'
        });
      }
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
          <span>Only French addresses are supported at this time</span>
        </motion.div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Pickup Location */}
            <LocationInput
              label="Pickup Location"
              value={formData.pickupLocation}
              onChange={(value, coords) => handleLocationChange('pickupLocation', value, coords)}
              error={errors.pickupLocation}
              disabled={isSubmitting || viewOnly}
            />

            {/* Destination */}
            <LocationInput
              label="Destination"
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
                Date
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
                Time
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
                />
              </div>
            )}
            
            {/* Payment Method Selection */}
            {distanceResult && !errors.distance && (
              <div className="mt-4 border-t border-stone-800/50 pt-4">
                <h4 className="text-sm font-medium text-stone-300 mb-3">Payment Methods</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('wallet')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                      formData.paymentMethod === 'wallet'
                        ? 'bg-purple-600/20 border-purple-600 text-white'
                        : 'bg-midnight-800 border-stone-700 text-stone-300 hover:bg-midnight-700'
                    }`}
                  >
                    <FaWallet className={formData.paymentMethod === 'wallet' ? 'text-purple-400' : 'text-stone-400'} />
                    <span className="text-xs mt-1">Wallet</span>
                    {isLoadingWallet ? (
                      <span className="text-xs mt-1 text-stone-400">Loading...</span>
                    ) : walletBalance !== null ? (
                      <span className={`text-xs mt-1 ${walletBalance < formData.price ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(walletBalance)}
                      </span>
                    ) : null}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('cash')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                      formData.paymentMethod === 'cash'
                        ? 'bg-purple-600/20 border-purple-600 text-white'
                        : 'bg-midnight-800 border-stone-700 text-stone-300 hover:bg-midnight-700'
                    }`}
                  >
                    <FaMoneyBill className={formData.paymentMethod === 'cash' ? 'text-purple-400' : 'text-stone-400'} />
                    <span className="text-xs mt-1">Cash</span>
                  </button>
                </div>
                
                {errors.insufficientFunds && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-red-400"
                  >
                    {errors.insufficientFunds}
                  </motion.p>
                )}
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
            <span>Calculating distance...</span>
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
              Calculate Distance
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
        <div className="flex items-center justify-center pt-4 pb-6">
          <button
            type="submit"
            disabled={
              isSubmitting || 
              (!locationValidations.pickupLocation || !locationValidations.destination) || 
              !!errors.form || 
              (formData.paymentMethod === 'wallet' && (walletBalance === null || walletBalance < formData.price))
            }
            className={`w-full px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center 
              ${isSubmitting || 
                 !locationValidations.pickupLocation || 
                 !locationValidations.destination || 
                 !!errors.form ||
                 (formData.paymentMethod === 'wallet' && (walletBalance === null || walletBalance < formData.price))
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-sunset to-purple-600 hover:from-sunset/90 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Submitting...
              </>
            ) : viewOnly ? (
              "Close"
            ) : (
              "Submit Order"
            )}
          </button>
        </div>
      </div>

      {/* Price Details Card */}
      {!viewOnly && (formData.pickupLocation && formData.destination) && (
        <div className="mt-6 bg-gray-50 dark:bg-midnight-700/50 rounded-lg border border-gray-200 dark:border-stone-600/10 p-4">
          <h3 className="text-gray-900 dark:text-white font-medium mb-3 flex items-center">
            <FaInfoCircle className="text-sunset mr-2" />
            Price Details
          </h3>
          
          {distanceResult && (
            <div className="flex flex-col space-y-2 mb-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-stone-400">
                  Distance
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {distanceResult.distance.text}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-stone-400">
                  Estimated Time
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {distanceResult.duration.text}
                </span>
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-stone-600/10 pt-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-stone-400">
                Base Rate
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(service?.baseRate || 0)}
              </span>
            </div>
            {distanceResult && (
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-stone-400">
                  Distance Rate
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency((formData.price || 0) - (service.baseRate || 0))}
                </span>
              </div>
            )}
            <div className="flex justify-between mt-3 border-t border-gray-200 dark:border-stone-600/10 pt-2">
              <span className="text-base font-medium text-gray-700 dark:text-white">
                Total
              </span>
              <span className="text-base font-bold text-sunset">
                {formatCurrency(formData.price || 0)}
              </span>
            </div>
            
            {/* Payment Method Display */}
            <div className="flex justify-between mt-3 pt-2">
              <span className="text-sm text-gray-500 dark:text-stone-400">
                Payment Method
              </span>
              <span className="text-sm font-medium flex items-center gap-1 text-gray-900 dark:text-white">
                {formData.paymentMethod === 'wallet' ? (
                  <>
                    <FaWallet className="text-purple-400" />
                    Wallet
                  </>
                ) : (
                  <>
                    <FaMoneyBill className="text-green-400" />
                    Cash
                  </>
                )}
              </span>
            </div>
            
            {/* Wallet Balance Display (if wallet selected) */}
            {formData.paymentMethod === 'wallet' && walletBalance !== null && (
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500 dark:text-stone-400">
                  Wallet Balance
                </span>
                <span className={`text-sm font-medium ${walletBalance < formData.price ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrency(walletBalance)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
};

export default OrderForm;