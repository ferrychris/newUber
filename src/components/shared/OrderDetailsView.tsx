import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaEuroSign, 
  FaUser, 
  FaPhone, 
  FaEnvelope,
  FaCheck,
  FaTruck,
  FaClock
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../utils/i18n';
import { supabase } from '../../utils/supabase';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface OrderDetailsViewProps {
  order: any;
  service: any;
  showUserDetails?: boolean;
  showDriverDetails?: boolean;
  onAcceptOrder?: (orderId: string) => Promise<void>;
  onCompleteOrder?: (orderId: string) => Promise<void>;
  onCancelOrder?: (orderId: string) => Promise<void>;
  isDriver?: boolean;
}

const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({
  order,
  service,
  showUserDetails = false,
  showDriverDetails = false,
  onAcceptOrder,
  onCompleteOrder,
  onCancelOrder,
  isDriver = false
}) => {
  const { t } = useTranslation();
  const [userDetails, setUserDetails] = useState<any>(null);
  const [driverDetails, setDriverDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch user and driver details if needed
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Fetch user details if needed
        if (showUserDetails && order.user_id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, full_name, email, phone, profile_image')
            .eq('id', order.user_id)
            .single();
          
          if (userError) throw userError;
          setUserDetails(userData);
        }
        
        // Fetch driver details if needed
        if (showDriverDetails && order.driver_id) {
          const { data: driverData, error: driverError } = await supabase
            .from('users')
            .select('id, full_name, email, phone, profile_image')
            .eq('id', order.driver_id)
            .single();
          
          if (driverError) throw driverError;
          setDriverDetails(driverData);
        }
      } catch (error) {
        console.error("Error fetching details:", error);
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [order, showUserDetails, showDriverDetails, t]);

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          color: 'bg-yellow-500',
          text: t('orders.status.pending'),
          textColor: 'text-yellow-500'
        };
      case 'accepted':
        return {
          color: 'bg-blue-500',
          text: t('orders.status.accepted'),
          textColor: 'text-blue-500'
        };
      case 'active':
        return {
          color: 'bg-green-500',
          text: t('orders.status.active'),
          textColor: 'text-green-500'
        };
      case 'in-transit':
        return {
          color: 'bg-sunset',
          text: t('orders.status.in-transit'),
          textColor: 'text-sunset'
        };
      case 'completed':
        return {
          color: 'bg-purple-500',
          text: t('orders.status.completed'),
          textColor: 'text-purple-500'
        };
      case 'cancelled':
        return {
          color: 'bg-red-500',
          text: t('orders.status.cancelled'),
          textColor: 'text-red-500'
        };
      default:
        return {
          color: 'bg-stone-500',
          text: t('orders.status.unknown'),
          textColor: 'text-stone-500'
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${service.theme.bg}`}>
            {service.icon}
          </div>
          <div>
            <h3 className="font-medium text-stone-200">
              {service.name || t(`services.${service.type}.title`)}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
              <span className={`text-sm ${statusConfig.textColor}`}>
                {statusConfig.text}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <FaEuroSign className={`w-3 h-3 ${service.theme.text}`} />
          <span className={`font-medium ${service.theme.text}`}>
            {formatCurrency(order.estimated_price)}
          </span>
        </div>
      </div>

      {/* Order details */}
      <div className="space-y-4 p-4 bg-midnight-800/30 rounded-lg border border-stone-800/30">
        <h4 className="text-stone-300 font-medium">{t('orders.detailsTitle')}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Order ID */}
          <div className="flex items-start space-x-2">
            <div className="bg-midnight-700/50 p-2 rounded-lg">
              <FaCalendarAlt className="w-4 h-4 text-stone-400" />
            </div>
            <div>
              <p className="text-sm text-stone-400">{t('orders.orderId')}</p>
              <p className="text-sm text-stone-300 font-mono">{order.id?.slice(0, 8)}</p>
            </div>
          </div>
          
          {/* Created Date */}
          <div className="flex items-start space-x-2">
            <div className="bg-midnight-700/50 p-2 rounded-lg">
              <FaClock className="w-4 h-4 text-stone-400" />
            </div>
            <div>
              <p className="text-sm text-stone-400">{t('orders.createdAt')}</p>
              <p className="text-sm text-stone-300">
                {formatDate(new Date(order.created_at).toISOString().split('T')[0])}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-4 p-4 bg-midnight-800/30 rounded-lg border border-stone-800/30">
        <h4 className="text-stone-300 font-medium">{t('location.title')}</h4>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <div className="bg-midnight-700/50 p-2 rounded-lg">
              <FaMapMarkerAlt className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-stone-400">{t('location.pickup')}</p>
              <p className="text-sm text-stone-300">{order.pickup_location}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="bg-midnight-700/50 p-2 rounded-lg">
              <FaMapMarkerAlt className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-stone-400">{t('location.destination')}</p>
              <p className="text-sm text-stone-300">{order.dropoff_location}</p>
            </div>
          </div>
        </div>
      </div>

      {/* User details */}
      {showUserDetails && (
        <div className="space-y-4 p-4 bg-midnight-800/30 rounded-lg border border-stone-800/30">
          <h4 className="text-stone-300 font-medium">{t('user.details')}</h4>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-pulse bg-stone-800/50 h-8 w-32 rounded"></div>
            </div>
          ) : userDetails ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <div className="bg-midnight-700/50 p-2 rounded-lg">
                  <FaUser className="w-4 h-4 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-stone-400">{t('user.name')}</p>
                  <p className="text-sm text-stone-300">{userDetails.full_name}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="bg-midnight-700/50 p-2 rounded-lg">
                  <FaPhone className="w-4 h-4 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-stone-400">{t('user.phone')}</p>
                  <p className="text-sm text-stone-300">{userDetails.phone || t('common.notProvided')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="bg-midnight-700/50 p-2 rounded-lg">
                  <FaEnvelope className="w-4 h-4 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-stone-400">{t('user.email')}</p>
                  <p className="text-sm text-stone-300">{userDetails.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-stone-400">
              {t('user.noDetails')}
            </div>
          )}
        </div>
      )}

      {/* Driver details */}
      {showDriverDetails && (
        <div className="space-y-4 p-4 bg-midnight-800/30 rounded-lg border border-stone-800/30">
          <h4 className="text-stone-300 font-medium">{t('driver.details')}</h4>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-pulse bg-stone-800/50 h-8 w-32 rounded"></div>
            </div>
          ) : driverDetails ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <div className="bg-midnight-700/50 p-2 rounded-lg">
                  <FaUser className="w-4 h-4 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-stone-400">{t('driver.name')}</p>
                  <p className="text-sm text-stone-300">{driverDetails.full_name}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="bg-midnight-700/50 p-2 rounded-lg">
                  <FaPhone className="w-4 h-4 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-stone-400">{t('driver.phone')}</p>
                  <p className="text-sm text-stone-300">{driverDetails.phone || t('common.notProvided')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="bg-midnight-700/50 p-2 rounded-lg">
                  <FaTruck className="w-4 h-4 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-stone-400">{t('driver.vehicleInfo')}</p>
                  <p className="text-sm text-stone-300">{t('driver.contactForDetails')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-stone-400">
              {t('driver.noDriverYet')}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3 pt-4">
        {/* Driver actions */}
        {isDriver && order.status === 'pending' && onAcceptOrder && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAcceptOrder(order.id)}
            className="w-full py-3 px-4 flex items-center justify-center bg-green-600 hover:bg-green-700 
              text-white font-medium rounded-lg transition-colors"
          >
            <FaCheck className="mr-2" />
            {t('driver.acceptOrder')}
          </motion.button>
        )}

        {/* Driver complete order action */}
        {isDriver && (order.status === 'accepted' || order.status === 'in-transit') && onCompleteOrder && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCompleteOrder(order.id)}
            className="w-full py-3 px-4 flex items-center justify-center bg-purple-600 hover:bg-purple-700 
              text-white font-medium rounded-lg transition-colors"
          >
            <FaCheck className="mr-2" />
            {t('driver.completeOrder')}
          </motion.button>
        )}

        {/* Cancel order - available for both */}
        {(order.status === 'pending' || order.status === 'accepted') && onCancelOrder && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCancelOrder(order.id)}
            className="w-full py-3 px-4 flex items-center justify-center bg-red-600 hover:bg-red-700 
              text-white font-medium rounded-lg transition-colors"
          >
            {t('orders.cancelOrder')}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsView;
