import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaUser, 
  FaPhone, 
  FaEnvelope,
  FaCheck,
  FaTruck,
  FaClock,
  FaDollarSign,
  FaTimes
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
          bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
          textClass: 'text-yellow-700 dark:text-yellow-400',
          text: t('orders.status.pending')
        };
      case 'accepted':
        return {
          bgClass: 'bg-blue-100 dark:bg-blue-900/30',
          textClass: 'text-blue-700 dark:text-blue-400',
          text: t('orders.status.accepted')
        };
      case 'active':
        return {
          bgClass: 'bg-green-100 dark:bg-green-900/30',
          textClass: 'text-green-700 dark:text-green-400',
          text: t('orders.status.active')
        };
      case 'in-transit':
        return {
          bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
          textClass: 'text-indigo-700 dark:text-indigo-400',
          text: t('orders.status.in-transit')
        };
      case 'completed':
        return {
          bgClass: 'bg-teal-100 dark:bg-teal-900/30',
          textClass: 'text-teal-700 dark:text-teal-400',
          text: t('orders.status.completed')
        };
      case 'cancelled':
        return {
          bgClass: 'bg-red-100 dark:bg-red-900/30',
          textClass: 'text-red-700 dark:text-red-400',
          text: t('orders.status.cancelled')
        };
      default:
        return {
          bgClass: 'bg-gray-100 dark:bg-gray-800/50',
          textClass: 'text-gray-700 dark:text-gray-400',
          text: t('orders.status.unknown')
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${service.theme.bg ? service.theme.bg.replace('bg-', 'bg-') : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
            {service.icon || <FaTruck className={`w-4 h-4 ${service.theme.text ? service.theme.text.replace('text-', 'text-') : 'text-indigo-600 dark:text-indigo-400'}`} />}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {service.name || t(`services.${service.type}.title`)}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass} mt-1`}>
              {statusConfig.text}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-stone-400">
              {t('orders.estimatedPrice')}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white flex items-center justify-end">
              <FaDollarSign className="w-3 h-3 mr-1" />
              {formatCurrency(order.estimated_price)}
            </p>
          </div>
        </div>
      </div>

      {/* Order details */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-midnight-700/30 rounded-xl border border-gray-100 dark:border-stone-700/20">
        <h4 className="text-gray-900 dark:text-white font-medium">{t('orders.detailsTitle')}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Order ID */}
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
              <FaCalendarAlt className="w-4 h-4 text-gray-500 dark:text-stone-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-stone-400">{t('orders.orderId')}</p>
              <p className="text-sm text-gray-900 dark:text-white font-mono">{order.id?.slice(0, 8)}</p>
            </div>
          </div>
          
          {/* Created Date */}
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
              <FaClock className="w-4 h-4 text-gray-500 dark:text-stone-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-stone-400">{t('orders.createdAt')}</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDate(new Date(order.created_at).toISOString().split('T')[0])}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-midnight-700/30 rounded-xl border border-gray-100 dark:border-stone-700/20">
        <h4 className="text-gray-900 dark:text-white font-medium">{t('location.title')}</h4>
        
        <div className="space-y-6">
          <div className="flex items-start">
            <div className="min-w-10 pt-1 flex justify-center">
              <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-stone-400">{t('location.pickup')}</p>
              <p className="text-sm text-gray-900 dark:text-white font-medium">{order.pickup_location}</p>
            </div>
          </div>
          
          <div className="flex items-center ml-5">
            <div className="border-l-2 border-dashed border-gray-300 dark:border-stone-600 h-8"></div>
          </div>
          
          <div className="flex items-start">
            <div className="min-w-10 pt-1 flex justify-center">
              <div className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400"></div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-stone-400">{t('location.destination')}</p>
              <p className="text-sm text-gray-900 dark:text-white font-medium">{order.dropoff_location}</p>
            </div>
          </div>
        </div>
      </div>

      {/* User details */}
      {showUserDetails && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-midnight-700/30 rounded-xl border border-gray-100 dark:border-stone-700/20">
          <h4 className="text-gray-900 dark:text-white font-medium">{t('user.details')}</h4>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-pulse bg-gray-200 dark:bg-midnight-600 h-8 w-32 rounded"></div>
            </div>
          ) : userDetails ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
                  <FaUser className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">{t('user.name')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{userDetails.full_name}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
                  <FaPhone className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">{t('user.phone')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{userDetails.phone || t('common.notProvided')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
                  <FaEnvelope className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">{t('user.email')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{userDetails.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-stone-400 italic text-center">
              {t('common.dataNotAvailable')}
            </p>
          )}
        </div>
      )}

      {/* Driver details */}
      {showDriverDetails && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-midnight-700/30 rounded-xl border border-gray-100 dark:border-stone-700/20">
          <h4 className="text-gray-900 dark:text-white font-medium">{t('driver.details')}</h4>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-pulse bg-gray-200 dark:bg-midnight-600 h-8 w-32 rounded"></div>
            </div>
          ) : driverDetails ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
                  <FaUser className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">{t('driver.name')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{driverDetails.full_name}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
                  <FaPhone className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">{t('driver.phone')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{driverDetails.phone || t('common.notProvided')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
                  <FaEnvelope className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">{t('driver.email')}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{driverDetails.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-stone-400 italic text-center">
              {t('common.dataNotAvailable')}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(onAcceptOrder || onCompleteOrder || onCancelOrder) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3 mt-6"
        >
          {order.status === 'pending' && isDriver && onAcceptOrder && (
            <button 
              onClick={() => onAcceptOrder(order.id)}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <FaTruck className="w-3 h-3" />
              {t('driver.acceptOrder')}
            </button>
          )}
          
          {(order.status === 'active' || order.status === 'in-transit') && isDriver && onCompleteOrder && (
            <button 
              onClick={() => onCompleteOrder(order.id)}
              className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <FaCheck className="w-3 h-3" />
              {t('driver.completeOrder')}
            </button>
          )}
          
          {(order.status === 'pending' || order.status === 'active') && onCancelOrder && (
            <button 
              onClick={() => onCancelOrder(order.id)}
              className="flex-1 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <FaTimes />
              {t('orders.cancelOrder')}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default OrderDetailsView;
