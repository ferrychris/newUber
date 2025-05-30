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
  FaTimes,
  FaComment,
  FaCommentDots,
  FaMoneyBill,
  FaWallet,
  FaCar,
  FaPhoneAlt
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../utils/i18n';
import { supabase } from '../../utils/supabase';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Define interfaces directly instead of importing
interface Order {
  id: string;
  user_id: string;
  service_id: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  estimated_price: number;
  actual_price?: number;
  created_at: string;
  payment_method?: 'wallet' | 'cash';
  driver_id?: string;
  services?: {
    id: string;
    name: string;
    [key: string]: any;
  };
}

interface Service {
  id: string;
  name: string;
  type: string;
  description: string;
  minPrice: number;
  image: string;
  icon?: React.ReactElement;
  baseRate?: number;
  theme: {
    bg: string;
    text: string;
    border: string;
  };
}

interface OrderDetailsViewProps {
  order: Order;
  service: Service;
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
          text: t('orders.status.pending')
        };
      case 'active':
        return {
          icon: <FaCheck />,
          color: 'text-green-500',
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: t('orders.status.active')
        };
      case 'in_transit':
        return {
          icon: <FaTruck />,
          color: 'text-purple-500',
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: t('orders.status.in_transit')
        };
      case 'completed':
        return {
          icon: <FaCheck />,
          color: 'text-teal-500',
          bg: 'bg-teal-100 dark:bg-teal-900/30',
          text: t('orders.status.completed')
        };
      case 'cancelled':
        return {
          icon: <FaTimes />,
          color: 'text-red-500',
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: t('orders.status.cancelled')
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
            .from('profiles')
            .select('*')
            .eq('id', order.user_id)
            .single();
          
          if (userError) throw userError;
          setCustomer(userData);
        }
        
        // Fetch driver data if showing driver details
        if (showDriverDetails && order.driver_id) {
          const { data: driverData, error: driverError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', order.driver_id)
            .single();
          
          if (driverError) throw driverError;
          setDriver(driverData);
        }
      } catch (error) {
        console.error('Error fetching related data:', error);
        toast.error(t('Error fetching related data'));
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
      toast.error(t('Error updating order'));
    }
  };

  const renderMetaItem = (icon: React.ReactNode, label: string, value: string | React.ReactNode) => (
    <div className="flex items-start space-x-3 mb-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sunset flex items-center justify-center text-white">
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
  
  // Payment method renderer
  const renderPaymentMethod = () => {
    const paymentMethod = order.payment_method || 'cash';
    
    if (paymentMethod === 'wallet') {
      return (
        <div className="flex items-center">
          <FaWallet className="text-purple-500 mr-2" />
          <span>{t('payment.wallet')}</span>
            </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <FaMoneyBill className="text-green-500 mr-2" />
          <span>{t('Cash')}</span>
        </div>
      );
    }
  };

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
              {t('Details Tab')}
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
              <div className="mb-6 flex items-center">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-r from-sunset to-purple-600 flex items-center justify-center text-white text-xl">
                  {service?.icon}
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {service?.name || t('Unknown Service')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-stone-400">
                    {service?.description || t('No Description')}
                  </p>
                </div>
              </div>
              
              {/* Order Status */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-stone-400 mb-2">
                  {t('orders.status.title')}
                </h4>
                <OrderStatusDisplay status={order.status} />
              </div>
              
              {/* Order Details */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-stone-400 mb-2">
                  {t('orders.details')}
                </h4>
                <div className="space-y-4">
                  {renderMetaItem(
                    <FaCalendarAlt />,
                    t('orders.createdAt'),
                    formatDate(order.created_at)
                  )}
                  
                  {renderMetaItem(
                    <FaMapMarkerAlt />,
                    t('Pickup Location'),
                    order.pickup_location
                  )}
                  
                  {renderMetaItem(
                    <FaMapMarkerAlt />,
                    t('location.destination'),
                    order.dropoff_location
                  )}
                  
                  {renderMetaItem(
                    <FaDollarSign />,
                    t('Price'),
                    formatCurrency(order.estimated_price || 0)
                  )}
                  
                  {renderMetaItem(
                    order.payment_method === 'wallet' ? <FaWallet /> : <FaMoneyBill />,
                    t('Payment Method'),
                    renderPaymentMethod()
                  )}
                </div>
              </div>
              
              {/* Payment Details */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-stone-400 mb-2">
                  {t('Payment Details')}
                </h4>
                <div className="bg-gray-50 dark:bg-midnight-700/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-700 dark:text-stone-300">{t('orders.estimatedPrice')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(order.estimated_price)}</span>
            </div>
                  
                  {order.actual_price && (
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-700 dark:text-stone-300">{t('orders.actualPrice')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(order.actual_price)}</span>
        </div>
      )}

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-stone-600/10">
                    <span className="text-gray-700 dark:text-stone-300">{t('payment.method')}</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {renderPaymentMethod()}
            </div>
                </div>
                </div>
              </div>
              
              {/* Message Button for Active Orders */}
              {order.status === 'active' && (
                <div className="mb-6">
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-midnight-700 hover:bg-gray-50 dark:hover:bg-midnight-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sunset dark:focus:ring-offset-midnight-900">
                    <FaCommentDots className="mr-2" />
                    {t('messages.contactDriver')}
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
                      customer.full_name || t('Not Provided')
                    )}
                    
                    {renderContactItem(
                      <FaPhone />,
                      t('profile.phone'),
                      customer.phone || t('Not Provided')
                    )}
                    
                    {renderContactItem(
                      <FaEnvelope />,
                      t('profile.email'),
                      customer.email || t('Not Provided')
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
                      driver.full_name || t('Not Provided')
                    )}
                    
                    {renderContactItem(
                      <FaPhone />,
                      t('profile.phone'),
                      driver.phone || t('Not Provided')
                    )}
                    
                    {renderContactItem(
                      <FaEnvelope />,
                      t('profile.email'),
                      driver.email || t('Not Provided')
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      {order.status !== 'completed' && order.status !== 'cancelled' && (
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-stone-600/10">
          {onCancelOrder && order.status === 'pending' && (
            <button
              onClick={() => {
                if (window.confirm(t('orders.confirmCancel'))) {
                  onCancelOrder(order.id);
                }
              }}
              className="px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors duration-200"
            >
              {t('orders.cancelOrder')}
            </button>
          )}
          
          {isDriver && order.status === 'pending' && onAcceptOrder && (
            <button
              onClick={() => onAcceptOrder(order.id)}
              className="px-4 py-2 bg-purple-500 text-white hover:bg-purple-600 rounded-lg font-medium transition-colors duration-200"
            >
              {t('orders.acceptOrder')}
            </button>
          )}
          
          {isDriver && order.status === 'in-transit' && onCompleteOrder && (
            <button
              onClick={() => onCompleteOrder(order.id)}
              className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg font-medium transition-colors duration-200"
            >
              {t('orders.completeOrder')}
            </button>
        )}
      </div>
      )}
    </div>
  );
};

export default OrderDetailsView;
