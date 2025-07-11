import React from 'react';
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

  FaCommentDots,
  FaMoneyBill,
  FaWallet
} from 'react-icons/fa';
import DriverChatModal from '../DriverDash/KeyFeatures/Messages/DriverChatModal';
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
    // Normalize status to handle hyphen vs underscore differences
    const normalizedStatus = status.replace('-', '_');
    
    switch (normalizedStatus) {
      case 'pending':
        return {
          icon: <FaClock />,
          color: 'text-sunset',
          bg: 'bg-sunset/10 dark:bg-sunset/20',
          text: t('Pending')
        };
      case 'active':
      case 'accepted': // Add support for 'accepted' status used in OrderCard
        return {
          icon: <FaCheck />,
          color: 'text-green-500',
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: t(`Status.${normalizedStatus}`)
        };
      case 'in_transit':
      case 'in-transit': // Support both underscore and hyphen versions
        return {
          icon: <FaTruck />,
          color: 'text-purple-500',
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: t('In_transit')
        };
      case 'completed':
        return {
          icon: <FaCheck />,
          color: 'text-teal-500',
          bg: 'bg-teal-100 dark:bg-teal-900/30',
          text: t('Completed')
        };
      case 'cancelled':
      case 'canceled': // Support both spelling variants
        return {
          icon: <FaTimes />,
          color: 'text-red-500',
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: t('Cancelled')
        };
      case 'delivered': // Add support for 'delivered' status used in OrderCard
        return {
          icon: <FaCheck />,
          color: 'text-blue-500',
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: t('Delivered')
        };
      default:
        return {
          icon: <FaClock />,
          color: 'text-gray-500',
          bg: 'bg-gray-100 dark:bg-gray-800/50',
          // Try to use translation if available, otherwise use the raw status
          text: t(`orders.status.${normalizedStatus}`, { defaultValue: status })
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
  // State for chat modal
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
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
            
          if (userError) {
            console.error('Error fetching customer:', userError);
            toast.error(t('errors.customerDataFailed'));
          } else if (userData) {
            setCustomer(userData);
          }
        }
        
        // Fetch driver data if showing driver details
        if (showDriverDetails && order.driver_id) {
          const { data: driverData, error: driverError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', order.driver_id)
            .single();
            
          if (driverError) {
            console.error('Error fetching driver:', driverError);
            toast.error(t('errors.driverDataFailed'));
          } else if (driverData) {
            setDriver(driverData);
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
        toast.error(t('errors.generalError'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRelatedData();
  }, [order, showUserDetails, showDriverDetails]);
  
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
          <FaWallet className="mr-2 text-sunset" />
          <span>{t('orders.paymentMethods.wallet')}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <FaMoneyBill className="mr-2 text-green-600" />
          <span>{t('orders.paymentMethods.cash')}</span>
        </div>
      );
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-midnight-800 rounded-2xl shadow-sm border border-gray-200 dark:border-stone-600/10 overflow-hidden">
        {/* Header */}
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-sunset/10 dark:bg-sunset/20 text-sunset p-2 rounded-lg">
                  {service.icon || <FaTruck />}
                </span>
                <h3 className="font-medium text-lg text-gray-900 dark:text-white">
                  {service.name}
                </h3>
              </div>
              
              <OrderStatusDisplay status={order.status} />
            </div>
            
            {order.driver_id && !isLoading && (
              <button 
                onClick={() => setIsChatModalOpen(true)}
                className="bg-sunset/10 hover:bg-sunset/20 text-sunset p-2 rounded-full flex items-center justify-center transition-colors duration-200"
                aria-label="Open chat"
              >
                <FaCommentDots size={20} />
              </button>
            )}
          </div>
        </div>
        
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
              
              <button
                onClick={() => setActiveTab('contact')}
                className={`pb-3 px-1 text-sm font-medium relative ${
                  activeTab === 'contact' 
                    ? 'text-sunset border-b-2 border-sunset' 
                    : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-300'
                }`}
              >
                {t('Contact Tab')}
              </button>
            </div>
            
            {/* Tab Content */}
            <div className="px-6 pb-6">
              {activeTab === 'details' && (
                <>
                  {/* Order Details */}
                  <div className="space-y-4">
                    {renderMetaItem(
                      <FaMapMarkerAlt />,
                      t('Pickup Location'),
                      order.pickup_location
                    )}
                    
                    {renderMetaItem(
                      <FaMapMarkerAlt />,
                      t('Dropoff Location'),
                      order.dropoff_location
                    )}
                    
                    {renderMetaItem(
                      <FaCalendarAlt />,
                      t('Order Date'),
                      formatDate(order.created_at)
                    )}
                    
                    {renderMetaItem(
                      <FaDollarSign />,
                      t('Estimated Price'),
                      formatCurrency(order.estimated_price)
                    )}
                    
                    {order.actual_price && order.status === 'completed' && renderMetaItem(
                      <FaDollarSign />,
                      t('Actual Price'),
                      formatCurrency(order.actual_price)
                    )}
                    
                    {renderMetaItem(
                      <FaMoneyBill />,
                      t('Payment Method'),
                      renderPaymentMethod()
                    )}
                  </div>
                </>
              )}
              
              {activeTab === 'contact' && (
                <div className="space-y-6">
                  {showUserDetails && customer && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {t('Customer Info')}
                      </h3>
                      <div className="bg-gray-50 dark:bg-midnight-700/50 rounded-lg p-4 border border-gray-200 dark:border-stone-600/10">
                        {renderContactItem(
                          <FaUser />,
                          t('Name'),
                          customer.full_name || t('Not Provided')
                        )}
                        
                        {renderContactItem(
                          <FaPhone />,
                          t('Phone'),
                          customer.phone || t('Not Provided')
                        )}
                        
                        {renderContactItem(
                          <FaEnvelope />,
                          t('Email'),
                          customer.email || t('Not Provided')
                        )}
                      </div>
                    </div>
                  )}
                  
                  {showDriverDetails && driver && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {t('Driver Info')}
                      </h3>
                      <div className="bg-gray-50 dark:bg-midnight-700/50 rounded-lg p-4 border border-gray-200 dark:border-stone-600/10">
                        {renderContactItem(
                          <FaUser />,
                          t('Name'),
                          driver.full_name || t('Not Provided')
                        )}
                        
                        {renderContactItem(
                          <FaPhone />,
                          t('Phone'),
                          driver.phone || t('Not Provided')
                        )}
                        
                        {renderContactItem(
                          <FaEnvelope />,
                          t('Email'),
                          driver.email || t('Not Provided')
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                  
                  {!isDriver && order.status === 'in-transit' && onCompleteOrder && (
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
          </>
        )}
      </div>
      
      {/* Chat Modal */}
      {order && order.driver_id && (
        <DriverChatModal 
          open={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          orderId={order.id}
          customerId={order.user_id}
          orderInfo={{
            id: order.id,
            pickup_location: order.pickup_location,
            dropoff_location: order.dropoff_location,
            status: order.status
          }}
        />
      )}
    </>
  );
};

export default OrderDetailsView;
