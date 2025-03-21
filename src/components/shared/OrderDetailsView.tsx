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

const OrderStatusDisplay = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <FaClock />,
          color: 'text-sunset',
          bg: 'bg-sunset/10 dark:bg-sunset/20',
          text: t('orderStatus.pending')
        };
      case 'active':
        return {
          icon: <FaCheck />,
          color: 'text-green-500',
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: t('orderStatus.active')
        };
      case 'in_transit':
        return {
          icon: <FaTruck />,
          color: 'text-purple-500',
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: t('orderStatus.in_transit')
        };
      case 'completed':
        return {
          icon: <FaCheck />,
          color: 'text-teal-500',
          bg: 'bg-teal-100 dark:bg-teal-900/30',
          text: t('orderStatus.completed')
        };
      case 'cancelled':
        return {
          icon: <FaTimes />,
          color: 'text-red-500',
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: t('orderStatus.cancelled')
        };
      default:
        return {
          icon: <FaClock />,
          color: 'text-gray-500',
          bg: 'bg-gray-100 dark:bg-gray-800/50',
          text: status
        };
    }
  };
  
  const statusConfig = getStatusConfig(status);
  
  return (
    <div className={`flex items-center ${statusConfig.bg} rounded-lg px-3 py-1.5`}>
      <span className={`mr-1.5 ${statusConfig.color}`}>{statusConfig.icon}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{statusConfig.text}</span>
    </div>
  );
};

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
  const [customer, setCustomer] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchRelatedData = async () => {
      setIsLoading(true);
      try {
        // Fetch customer data if showing user details
        if (showUserDetails && order.user_id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', order.user_id)
            .single();
          
          if (userError) throw userError;
          setCustomer(userData);
        }
        
        // Fetch driver data if showing driver details
        if (showDriverDetails && order.driver_id) {
          const { data: driverData, error: driverError } = await supabase
            .from('users')
            .select('*')
            .eq('id', order.driver_id)
            .single();
          
          if (driverError) throw driverError;
          setDriver(driverData);
        }
      } catch (error) {
        console.error('Error fetching related data:', error);
        toast.error(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRelatedData();
  }, [order, showUserDetails, showDriverDetails]);
  
  const handleStatusAction = async (action: 'accept' | 'complete' | 'cancel') => {
    if (!order || !order.id) return;
    
    if (action === 'cancel' && !confirm(t('orders.confirmCancel'))) {
      return;
    }
    
    try {
      if (action === 'accept' && onAcceptOrder) {
        await onAcceptOrder(order.id);
      } else if (action === 'complete' && onCompleteOrder) {
        await onCompleteOrder(order.id);
      } else if (action === 'cancel' && onCancelOrder) {
        await onCancelOrder(order.id);
      }
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      toast.error(t('common.error'));
    }
  };

  const renderMetaItem = (icon: React.ReactNode, label: string, value: string | React.ReactNode) => (
    <div className="flex items-start space-x-3 mb-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-sunset to-purple-600 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-stone-400">{label}</p>
        <p className="font-medium text-gray-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
  
  const renderContactItem = (icon: React.ReactNode, label: string, value: string) => (
    <div className="flex items-center space-x-3 mb-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sunset/10 dark:bg-sunset/20 flex items-center justify-center text-sunset">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-stone-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
  
  return (
    <div className="p-6">
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <svg className="animate-spin h-8 w-8 text-sunset" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-stone-600/10">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-1 text-sm font-medium relative ${
                activeTab === 'details' 
                  ? 'text-sunset border-b-2 border-sunset' 
                  : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-300'
              }`}
            >
              {t('orders.detailsTab')}
            </button>
            {(showUserDetails || showDriverDetails) && (
              <button
                onClick={() => setActiveTab('people')}
                className={`pb-3 px-1 text-sm font-medium relative ${
                  activeTab === 'people' 
                    ? 'text-sunset border-b-2 border-sunset' 
                    : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-300'
                }`}
              >
                {t('orders.peopleTab')}
              </button>
            )}
          </div>
      
          {activeTab === 'details' && (
            <>
              {/* Service Info */}
              <div className="mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-r from-sunset to-purple-600 flex items-center justify-center text-white text-xl">
                    {service?.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {service?.name || t('common.unknownService')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-stone-400">
                      {service?.description || t('common.noDescription')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Order Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mb-6">
                {renderMetaItem(
                  <FaMapMarkerAlt />,
                  t('location.pickup'),
                  order.pickup_location
                )}
                
                {renderMetaItem(
                  <FaMapMarkerAlt />,
                  t('location.destination'),
                  order.delivery_location || order.destination
                )}
                
                {renderMetaItem(
                  <FaCalendarAlt />,
                  t('orders.creationDate'),
                  formatDate(order.created_at)
                )}
                
                {renderMetaItem(
                  <FaDollarSign />,
                  t('orders.price'),
                  formatCurrency(order.price || order.estimated_price || 0)
                )}
                
                {renderMetaItem(
                  <div>{/* Status icon handled by component */}</div>,
                  t('orders.status.title'),
                  <OrderStatusDisplay status={order.status} />
                )}
              </div>
              
              {/* Action Buttons */}
              {order.status === 'pending' && (
                <div className="flex flex-wrap gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-stone-600/10">
                  {isDriver && onAcceptOrder && (
                    <button
                      onClick={() => handleStatusAction('accept')}
                      className="px-4 py-2 bg-gradient-to-r from-sunset to-purple-600 hover:from-sunset/90 hover:to-purple-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200"
                    >
                      {t('orders.acceptOrder')}
                    </button>
                  )}
                  
                  {onCancelOrder && (
                    <button
                      onClick={() => handleStatusAction('cancel')}
                      className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:border-red-800/20 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg"
                    >
                      {t('orders.cancelOrder')}
                    </button>
                  )}
                </div>
              )}
              
              {order.status === 'active' && isDriver && onCompleteOrder && (
                <div className="flex flex-wrap gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-stone-600/10">
                  <button
                    onClick={() => handleStatusAction('complete')}
                    className="px-4 py-2 bg-gradient-to-r from-sunset to-purple-600 hover:from-sunset/90 hover:to-purple-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200"
                  >
                    {t('orders.markComplete')}
                  </button>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'people' && (
            <div>
              {showUserDetails && customer && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {t('orders.customerInfo')}
                  </h3>
                  <div className="bg-gray-50 dark:bg-midnight-700/50 rounded-lg p-4 border border-gray-200 dark:border-stone-600/10">
                    {renderContactItem(
                      <FaUser />,
                      t('profile.name'),
                      customer.full_name || t('common.notProvided')
                    )}
                    
                    {renderContactItem(
                      <FaPhone />,
                      t('profile.phone'),
                      customer.phone || t('common.notProvided')
                    )}
                    
                    {renderContactItem(
                      <FaEnvelope />,
                      t('profile.email'),
                      customer.email || t('common.notProvided')
                    )}
                  </div>
                </div>
              )}
              
              {showDriverDetails && driver && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {t('orders.driverInfo')}
                  </h3>
                  <div className="bg-gray-50 dark:bg-midnight-700/50 rounded-lg p-4 border border-gray-200 dark:border-stone-600/10">
                    {renderContactItem(
                      <FaUser />,
                      t('profile.name'),
                      driver.full_name || t('common.notProvided')
                    )}
                    
                    {renderContactItem(
                      <FaPhone />,
                      t('profile.phone'),
                      driver.phone || t('common.notProvided')
                    )}
                    
                    {renderContactItem(
                      <FaEnvelope />,
                      t('profile.email'),
                      driver.email || t('common.notProvided')
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderDetailsView;
