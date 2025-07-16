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
  FaInfoCircle,
  FaCommentDots,
  FaCommentAlt,
  FaMoneyBill,
  FaWallet
} from 'react-icons/fa';
import { Dialog, DialogContent } from '@mui/material';
import Message from '../userDashcomponents/messages/Message';
import CustomerDashboardChat from '../CustomerDash/CustomerDashboardChat';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../utils/i18n';
import { supabase } from '../../utils/supabase';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Define interfaces directly instead of importing
interface Order {
  id: string;
  user_id: string;
  driver_id?: string;
  service_id: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  created_at: string;
  updated_at: string;
  price: number;
  payment_method: string;
  payment_status: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  profile_image?: string;
}

// OrderDetailsViewProps is defined below with service as Service type

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
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [driver, setDriver] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchRelatedData = async () => {
      setIsLoading(true);
      try {
        // Fetch customer data if showing user details
        if (showUserDetails && order.user_id) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('id, full_name, email, phone, profile_image')
              .eq('id', order.user_id)
              .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error
                
            if (userError) {
              console.error('Error fetching customer:', userError);
              toast.error(t('errors.customerDataFailed'));
            } else if (userData) {
              setCustomer(userData);
            } else {
              // No customer data found but no error (empty result)
              console.warn(`No customer profile found for ID: ${order.user_id}`);
              // Create a minimal customer object with just the ID
              setCustomer({ id: order.user_id, full_name: t('Customer Not Found'), email: '', phone: '' });
            }
          } catch (err) {
            console.error('Exception fetching customer data:', err);
            toast.error(t('errors.customerDataFailed'));
          }
        }

        
        // Always fetch driver data if driver_id is available
        if (order.driver_id) {
          try {
            // Fetch driver profile data from public.profiles table
            const { data: driverData, error: driverError } = await supabase
              .from('profiles')
              .select('id, full_name, email, phone, profile_image')
              .eq('id', order.driver_id)
              .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error
              
            if (driverError) {
              console.error('Error fetching driver:', driverError);
              toast.error(t('errors.driverDataFailed'));
            } else if (driverData) {
              // Ensure phone number is available
              if (!driverData.phone) {
                console.warn('Driver phone number not found in database');
              }
              setDriver(driverData);
            } else {
              // No driver data found but no error (empty result)
              console.warn(`No driver profile found for ID: ${order.driver_id}`);
              // Create a minimal driver object with just the ID
              setDriver({ id: order.driver_id, full_name: t('Driver Not Found'), email: '', phone: '' });
            }
          } catch (err) {
            console.error('Exception fetching driver data:', err);
            toast.error(t('errors.driverDataFailed'));
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
  
  const renderContactItem = (icon: React.ReactNode, label: string, value: string, isPhone: boolean = false, showChat: boolean = false) => (
    <div className="flex items-center space-x-3 mb-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sunset/10 dark:bg-sunset/20 flex items-center justify-center text-sunset">
        {icon}
      </div>
      <div className="flex-grow">
        <p className="text-xs text-gray-500 dark:text-stone-400">{label}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
          <div className="flex">
            {isPhone && value !== t('Not Provided') && (
              <a 
                href={`tel:${value}`} 
                className="ml-2 p-2 bg-sunset/10 hover:bg-sunset/20 text-sunset rounded-full flex items-center justify-center transition-colors duration-200"
                aria-label="Call"
              >
                <FaPhone size={14} />
              </a>
            )}
            {showChat && (
              <button
                onClick={() => setIsChatModalOpen(true)}
                className="ml-2 p-2 bg-sunset/10 hover:bg-sunset/20 text-sunset rounded-full flex items-center justify-center transition-colors duration-200"
                aria-label="Chat"
              >
                <FaCommentDots size={14} />
              </button>
            )}
          </div>
        </div>
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
                  {service?.icon || <FaTruck />}
                </span>
                <h3 className="font-medium text-lg text-gray-900 dark:text-white">
                  {service?.name || t('Service')}
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
                      t('Price'),
                      formatCurrency(order.price)
                    )}
                    
                    {/* Price is already shown above */}
                    
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
                  {/* Driver information - show first if available */}
                  {order.driver_id && (
                    <div className="animate-fadeIn">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {t('Driver Info')}
                        </h3>
                        {driver && driver.phone && (
                          <a 
                            href={`tel:${driver.phone}`}
                            className="flex items-center gap-2 px-3 py-1.5 bg-sunset text-white rounded-full hover:bg-sunset/90 transition-colors duration-200"
                          >
                            <FaPhone size={14} />
                            <span className="text-sm font-medium">{t('Call Driver')}</span>
                          </a>
                        )}
                      </div>
                      
                      {driver ? (
                        <div className="bg-gray-50 dark:bg-midnight-700/50 rounded-lg p-4 border border-gray-200 dark:border-stone-600/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1">
                              {/* Driver basic info */}
                              {renderContactItem(
                                <FaUser />,
                                t('Name'),
                                driver.full_name || t('Not Provided')
                              )}
                              
                              {/* Phone with click-to-call */}
                              {renderContactItem(
                                <FaPhone />,
                                t('Phone'),
                                driver.phone || t('Not Provided'),
                                true,
                                !isDriver && !!order.driver_id
                              )}
                              
                              {renderContactItem(
                                <FaEnvelope />,
                                t('Email'),
                                driver.email || t('Not Provided')
                              )}
                            </div>
                            
                            <div className="col-span-1">
                              {/* Contact instructions */}
                              <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
                                  {t('Contact Instructions')}
                                </h4>
                                
                                <div className="bg-sunset/5 p-3 rounded-lg border border-sunset/10">
                                  <div className="flex items-start space-x-3">
                                    <div className="mt-1">
                                      <FaInfoCircle className="text-sunset" size={16} />
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-stone-300">
                                      {t('If you need to contact your driver, you can call them directly using the phone number or the Call Driver button above.')}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Message button */}
                                <button
                                  onClick={() => setIsChatModalOpen(true)}
                                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-midnight-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-midnight-600 transition-colors duration-200"
                                >
                                  <FaCommentAlt size={14} />
                                  <span>{t('Send Message')}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-midnight-700/50 rounded-lg p-4 border border-gray-200 dark:border-stone-600/10 flex items-center justify-center">
                          <div className="text-center py-6">
                            <div className="animate-pulse flex justify-center mb-3">
                              <FaUser className="text-gray-400 dark:text-stone-500" size={24} />
                            </div>
                            <p className="text-gray-500 dark:text-stone-400">{t('Loading driver information...')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Customer information */}
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
                          customer.phone || t('Not Provided'),
                          true,
                          isDriver && !!order.user_id
                        )}
                        
                        {renderContactItem(
                          <FaEnvelope />,
                          t('Email'),
                          customer.email || t('Not Provided')
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* No contact information available */}
                  {!showUserDetails && !order.driver_id && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-stone-400">{t('No contact information available')}</p>
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
      {order && (
        isDriver ? (
          // Driver perspective - chat with customer
          order.user_id && (
            <Dialog
              open={isChatModalOpen}
              onClose={() => setIsChatModalOpen(false)}
              fullWidth
              maxWidth="md"
              PaperProps={{
                style: {
                  borderRadius: '12px',
                  overflow: 'hidden'
                }
              }}
            >
              <DialogContent sx={{ p: 0, height: '70vh', overflow: 'hidden' }}>
                <Message
                  orderId={order.id}
                  receiverId={order.user_id}
                  isDriver={true}
                  onClose={() => setIsChatModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )
        ) : (
          // Customer perspective - chat with driver
          order.driver_id && (
            <CustomerDashboardChat
              open={isChatModalOpen}
              onClose={() => setIsChatModalOpen(false)}
              orderId={order.id}
              driverId={order.driver_id}
              orderInfo={{
                id: order.id,
                pickup_location: order.pickup_location,
                dropoff_location: order.dropoff_location,
                status: order.status
              }}
            />
          )
        )
      )}
    </>
  );
};

export default OrderDetailsView;
