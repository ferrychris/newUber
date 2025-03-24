import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, getCurrentUser } from '../../utils/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaTruck, FaShoppingBag, FaMapMarkerAlt, FaPhoneAlt, FaUser, FaSpinner, FaArrowRight, FaInfoCircle, FaCalendarAlt, FaClock, FaCheck, FaWallet, FaMoneyBill, FaExternalLinkAlt, FaComments } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ServiceType, Order, Service } from './orders/types';
import { formatCurrency, formatDate } from '../../utils/i18n';
import { getStatusConfig } from './orders/utils';
import toast from 'react-hot-toast';
import OrderDetailsDialog from './orders/components/OrderDetailsDialog';
import Message from './Message';

// Custom CSS to fix z-index issues with the map
const mapContainerStyle = {
  height: '100%',
  width: '100%',
  position: 'relative',
  zIndex: 1
} as React.CSSProperties;

const mapWrapperStyle = {
  position: 'relative',
  zIndex: 1
} as React.CSSProperties;

// Fix Leaflet icon issues
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons
const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter map when location changes
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
};

const OrderTracker: React.FC = () => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);
  const [selectedOrderService, setSelectedOrderService] = useState<any | null>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [pickupLocation, setPickupLocation] = useState<[number, number] | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driverDetails, setDriverDetails] = useState<any | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Messaging feature states
  const [showMessageDialog, setShowMessageDialog] = useState<boolean>(false);
  const [messageRecipientId, setMessageRecipientId] = useState<string>('');
  const [isDriverViewActive, setIsDriverViewActive] = useState<boolean>(false);

  // At the top of the component add this state
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<{[key: string]: number}>({});

  // Fetch current user
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const userSessionStr = localStorage.getItem('userSession');
        if (userSessionStr) {
          try {
            const userSession = JSON.parse(userSessionStr);
            if (userSession && userSession.id) {
              setUserId(userSession.id);
              return;
            }
          } catch (e) {
            console.error("Error parsing localStorage session:", e);
          }
        }

        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
        } else {
          setError(t('common.authError'));
        }
      } catch (error) {
        console.error("Error getting user session:", error);
        setError(t('common.authError'));
      }
    }
    
    fetchCurrentUser();
  }, [t]);

  // Fetch active orders
  useEffect(() => {
    if (userId) {
      fetchActiveOrders();
    }
  }, [userId]);

  // Setup real-time updates for driver location
  useEffect(() => {
    if (selectedOrder?.id) {
      // Start polling for driver location updates
      startLocationUpdates();
      
      // Clean up the interval when unmounting or selecting a different order
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [selectedOrder]);

  // Fetch active orders (status = accepted or active, excluding carpooling)
  const fetchActiveOrders = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch orders that are accepted or active
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(*)')
        .eq('user_id', userId)
        .in('status', ['accepted', 'active', 'pending'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Filter out carpooling orders
        const deliveryOrders = data.filter(order => 
          order.services?.name !== 'Carpooling'
        );
        
        setOrders(deliveryOrders);
        
        // If we have orders and none selected yet, select the first one
        if (deliveryOrders.length > 0 && !selectedOrder) {
          setSelectedOrder(deliveryOrders[0]);
          fetchOrderLocations(deliveryOrders[0]);
          if (deliveryOrders[0].driver_id) {
            fetchDriverDetails(deliveryOrders[0].driver_id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching active orders:', error);
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate fetching driver's current location
  // In a real app, this would come from a real-time database or API
  const fetchDriverLocation = async (driverId: string) => {
    if (!driverId) return;
    
    try {
      setIsLoadingLocation(true);
      
      // In a real app, you would fetch the actual driver location from your backend
      // For this prototype, we're generating random movements around the pickup location
      if (pickupLocation) {
        // Generate a position with small random movement from the pickup location
        const randomLat = (Math.random() * 0.01) - 0.005;
        const randomLng = (Math.random() * 0.01) - 0.005;
        
        setDriverLocation([
          pickupLocation[0] + randomLat,
          pickupLocation[1] + randomLng
        ]);
      }
    } catch (error) {
      console.error('Error fetching driver location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Fetch driver details
  const fetchDriverDetails = async (driverId: string) => {
    if (!driverId) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone, profile_image')
        .eq('id', driverId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setDriverDetails(data);
      }
    } catch (error) {
      console.error('Error fetching driver details:', error);
    }
  };

  // Fetch and geocode order locations
  const fetchOrderLocations = async (order: any) => {
    try {
      // For a real app, you would geocode these addresses to get coordinates
      // For this prototype, we'll use hardcoded coordinates for Paris, France
      // In production, use a geocoding service like Google Maps Geocoding API
      
      // Simulate pickup location in central Paris
      setPickupLocation([48.8566, 2.3522]);
      
      // Simulate destination ~2km away
      setDestinationLocation([48.8710, 2.3699]);
    } catch (error) {
      console.error('Error fetching order locations:', error);
      toast.error(t('common.error'));
    }
  };

  // Start polling for location updates
  const startLocationUpdates = () => {
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Immediately fetch the initial location
    if (selectedOrder?.driver_id) {
      fetchDriverLocation(selectedOrder.driver_id);
    }
    
    // Set up an interval to fetch location updates every 5 seconds
    timerRef.current = setInterval(() => {
      if (selectedOrder?.driver_id) {
        fetchDriverLocation(selectedOrder.driver_id);
      }
    }, 5000);
  };

  // Handle order selection
  const handleSelectOrder = (order: any) => {
    // Close any open message dialog
    setShowMessageDialog(false);
    setMessageRecipientId('');
    
    // Set the selected order
    setSelectedOrder(order);
    fetchOrderLocations(order);
    if (order.driver_id) {
      fetchDriverDetails(order.driver_id);
    } else {
      setDriverDetails(null);
    }
  };

  // Handle open order details
  const handleOpenOrderDetails = () => {
    if (selectedOrder && selectedOrder.services) {
      const serviceData = {
        id: selectedOrder.services.id,
        name: selectedOrder.services.name,
        type: selectedOrder.services.type || ServiceType.PARCELS,
        description: selectedOrder.services.description || '',
        minPrice: selectedOrder.services.min_price || 5,
        image: selectedOrder.services.image || '',
        theme: {
          bg: 'bg-purple-500/10',
          text: 'text-purple-500',
          border: 'border-purple-500/20'
        }
      };
      
      setSelectedOrderService(serviceData);
      setShowOrderDetailsDialog(true);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
        
      if (error) throw error;
      
      toast.success(t('orders.cancelSuccess'));
      fetchActiveOrders();
      setShowOrderDetailsDialog(false);
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(t('common.error'));
    }
  };

  // Handle open message dialog
  const handleOpenMessageDialog = () => {
    if (!selectedOrder) {
      console.error("No order selected");
      return;
    }
    
    if (!selectedOrder.driver_id) {
      toast.error(t('messages.noRecipient'));
      return;
    }
    
    // Ensure we have a valid driver ID string
    if (typeof selectedOrder.driver_id !== 'string' || selectedOrder.driver_id.trim() === '') {
      console.error("Invalid driver ID:", selectedOrder.driver_id);
      toast.error(t('common.error'));
      return;
    }
    
    // Set recipient ID and show dialog
    setMessageRecipientId(selectedOrder.driver_id);
    setShowMessageDialog(true);
    
    console.log("Opening message dialog with:", {
      orderId: selectedOrder.id,
      recipientId: selectedOrder.driver_id
    });
  };

  // Format order status
  const getOrderStatus = (status: string) => {
    const statusConfig = getStatusConfig(status);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
        {t(`status.${status}`)}
      </span>
    );
  };

  // Add this function to fetch unread message counts
  const fetchUnreadMessageCounts = async () => {
    if (!orders.length) return;
    
    try {
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user) return;
      
      const userId = userSession.session.user.id;
      
      // Fetch unread message counts for each order
      const orderIds = orders.map(order => order.id);
      
      // Run a raw query to get the counts since group by is not directly supported in the JS client
      const { data, error } = await supabase
        .rpc('get_unread_message_counts', { 
          user_id: userId,
          order_ids: orderIds 
        });
        
      if (error) {
        console.error('Error in RPC, falling back to manual count:', error);
        
        // Fallback: fetch all unread messages and count manually
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('order_id')
          .eq('recipient_id', userId)
          .eq('read', false)
          .in('order_id', orderIds);
          
        if (messagesError) throw messagesError;
        
        if (messages) {
          const counts: {[key: string]: number} = {};
          messages.forEach((message: any) => {
            if (!counts[message.order_id]) {
              counts[message.order_id] = 0;
            }
            counts[message.order_id]++;
          });
          setUnreadMessageCounts(counts);
        }
        
        return;
      }
      
      if (data) {
        const counts: {[key: string]: number} = {};
        data.forEach((item: any) => {
          counts[item.order_id] = item.count;
        });
        setUnreadMessageCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching unread message counts:', error);
    }
  };

  // Call this in useEffect after orders are loaded
  useEffect(() => {
    if (orders.length > 0) {
      fetchUnreadMessageCounts();
      
      // Set up subscription for new messages
      const messageSubscription = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, () => {
          // Refresh unread counts when new messages arrive
          fetchUnreadMessageCounts();
        })
        .subscribe();
        
      return () => {
        messageSubscription.unsubscribe();
      };
    }
  }, [orders]);

  // Add cleanup logic for message dialog when selectedOrder changes
  useEffect(() => {
    // Reset message dialog state when selected order changes
    setShowMessageDialog(false);
    setMessageRecipientId('');
  }, [selectedOrder]);

  return (
    <div className="container mx-auto pb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('tracking.title')}
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {t('tracking.subtitle')}
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6"
        >
          <p>{error}</p>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-midnight-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <FaTruck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('tracking.noOrders')}
          </h2>
          <p className="text-gray-500 dark:text-stone-400 mb-6">
            {t('tracking.noOrdersMessage')}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-stone-700/20">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('tracking.activeOrders')}
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-stone-700/20 max-h-[400px] overflow-y-auto">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors ${
                      selectedOrder?.id === order.id ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''
                    }`}
                    onClick={() => handleSelectOrder(order)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${order.services?.name === 'Shopping' ? 'bg-sunset-500/10' : order.services?.name === 'Parcels' ? 'bg-blue-500/10' : 'bg-teal-500/10'}`}>
                          {order.services?.name === 'Shopping' ? (
                            <FaShoppingBag className={`w-4 h-4 ${order.services?.name === 'Shopping' ? 'text-sunset-500' : order.services?.name === 'Parcels' ? 'text-blue-500' : 'text-teal-500'}`} />
                          ) : (
                            <FaTruck className={`w-4 h-4 ${order.services?.name === 'Shopping' ? 'text-sunset-500' : order.services?.name === 'Parcels' ? 'text-blue-500' : 'text-teal-500'}`} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {order.services?.name || 'Delivery'}
                          </p>
                          <div className="mt-1">
                            {getOrderStatus(order.status)}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
                            {formatDate(new Date(order.created_at).toISOString().split('T')[0])}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(order.estimated_price)}
                        </p>
                        <div className="flex items-center text-xs mt-1 text-gray-500">
                          {order.payment_method === 'wallet' ? (
                            <>
                              <FaWallet className="w-3 h-3 text-purple-500 mr-1" />
                              <span>{t('payment.wallet')}</span>
                            </>
                          ) : (
                            <>
                              <FaMoneyBill className="w-3 h-3 text-green-500 mr-1" />
                              <span>{t('payment.cash')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Driver info */}
            {selectedOrder && driverDetails && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-4"
              >
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  {t('tracking.driverInfo')}
                </h3>
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-midnight-700 flex items-center justify-center">
                    {driverDetails.profile_image ? (
                      <img 
                        src={driverDetails.profile_image} 
                        alt={driverDetails.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <FaUser className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {driverDetails.full_name}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-stone-400 mt-1">
                      <FaPhoneAlt className="w-3 h-3 mr-1" />
                      {driverDetails.phone || t('common.notAvailable')}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Map and Order Details */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <>
                {/* Map */}
                <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden h-[400px]" style={mapWrapperStyle}>
                  {pickupLocation && destinationLocation ? (
                    <MapContainer
                      style={mapContainerStyle}
                      zoom={13}
                      attributionControl={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      
                      {/* Driver marker */}
                      {driverLocation && (
                        <Marker position={driverLocation} icon={driverIcon as any}>
                          <Popup>
                            <div className="font-medium">{t('tracking.driverLocation')}</div>
                            <div className="text-sm">{driverDetails?.full_name || t('tracking.driver')}</div>
                          </Popup>
                        </Marker>
                      )}
                      
                      {/* Pickup marker */}
                      <Marker position={pickupLocation} icon={pickupIcon as any}>
                        <Popup>
                          <div className="font-medium">{t('location.pickup')}</div>
                          <div className="text-sm">{selectedOrder.pickup_location}</div>
                        </Popup>
                      </Marker>
                      
                      {/* Destination marker */}
                      <Marker position={destinationLocation} icon={destinationIcon as any}>
                        <Popup>
                          <div className="font-medium">{t('location.destination')}</div>
                          <div className="text-sm">{selectedOrder.dropoff_location}</div>
                        </Popup>
                      </Marker>
                      
                      {/* Update map center when driver location changes */}
                      <MapUpdater center={driverLocation || pickupLocation} />
                    </MapContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
                    </div>
                  )}
                </div>
                
                {/* Order details */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-4"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white">
                      {t('tracking.orderDetails')}
                    </h3>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={handleOpenOrderDetails}
                        className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        <FaInfoCircle className="mr-1" /> {t('orders.viewDetails')}
                      </button>
                      
                      {/* Message button - only show if we have a driver for the order */}
                      {selectedOrder && selectedOrder.driver_id && (
                        <button
                          onClick={handleOpenMessageDialog}
                          className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <FaComments className="mr-1" /> 
                          {t('messages.chat')}
                          {unreadMessageCounts[selectedOrder.id] > 0 && (
                            <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {unreadMessageCounts[selectedOrder.id]}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Order info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
                          <FaCalendarAlt className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-stone-400">{t('orders.orderId')}</p>
                          <p className="text-sm text-gray-900 dark:text-white font-mono">{selectedOrder.id?.slice(0, 8)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-midnight-600/50">
                          <FaClock className="w-4 h-4 text-gray-500 dark:text-stone-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-stone-400">{t('orders.createdAt')}</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {formatDate(new Date(selectedOrder.created_at).toISOString().split('T')[0])}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Locations */}
                    <div className="space-y-3 mt-4">
                      <div className="flex items-start">
                        <div className="min-w-10 pt-1 flex justify-center">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-stone-400">{t('location.pickup')}</p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedOrder.pickup_location}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center ml-5">
                        <div className="border-l-2 border-dashed border-gray-300 dark:border-stone-600 h-8"></div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="min-w-10 pt-1 flex justify-center">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-stone-400">{t('location.destination')}</p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedOrder.dropoff_location}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Payment details */}
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-midnight-700/30 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-stone-400">{t('orders.estimatedPrice')}</p>
                          <p className="text-md font-medium text-gray-900 dark:text-white">{formatCurrency(selectedOrder.estimated_price)}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-500 dark:text-stone-400">{t('payment.method')}:</p>
                          <div className="flex items-center">
                            {selectedOrder.payment_method === 'wallet' ? (
                              <>
                                <FaWallet className="w-4 h-4 text-purple-500 mr-1" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('payment.wallet')}</span>
                              </>
                            ) : (
                              <>
                                <FaMoneyBill className="w-4 h-4 text-green-500 mr-1" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{t('payment.cash')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Delivery status */}
                  <div className="mt-6 border-t border-gray-100 dark:border-stone-700/20 pt-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <FaInfoCircle className="text-indigo-500 dark:text-indigo-400" />
                      <h4 className="text-md font-medium text-gray-900 dark:text-white">
                        {t('tracking.deliveryStatus')}
                      </h4>
                    </div>
                    
                    <div className="relative">
                      <div className="flex items-center mb-6">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${selectedOrder.status === 'accepted' || selectedOrder.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          <FaCheck className="h-4 w-4" />
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {t('tracking.orderAccepted')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-stone-400">
                            {selectedOrder.status === 'pending' 
                              ? t('tracking.waitingAcceptance')
                              : t('tracking.driverAssigned')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="absolute top-8 left-4 bottom-8 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                      
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${selectedOrder.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          <FaTruck className="h-4 w-4" />
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {t('tracking.inTransit')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-stone-400">
                            {selectedOrder.status === 'active' 
                              ? t('tracking.itemInTransit') 
                              : t('tracking.waitingPickup')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cancel button for pending orders */}
                  {selectedOrder.status === 'pending' && (
                    <div className="mt-6 border-t border-gray-100 dark:border-stone-700/20 pt-4 flex justify-end">
                      <button
                        onClick={() => {
                          if (window.confirm(t('orders.confirmCancel'))) {
                            handleCancelOrder(selectedOrder.id);
                          }
                        }}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition-colors duration-200"
                      >
                        {t('orders.cancelOrder')}
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            ) : (
              <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-8 flex items-center justify-center">
                <div className="text-center">
                  <FaMapMarkerAlt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('tracking.selectOrder')}
                  </h3>
                  <p className="text-gray-500 dark:text-stone-400">
                    {t('tracking.selectOrderMessage')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Details Dialog */}
      <AnimatePresence>
        {showOrderDetailsDialog && selectedOrder && selectedOrderService && (
          <OrderDetailsDialog
            onClose={() => setShowOrderDetailsDialog(false)}
            service={selectedOrderService}
            order={selectedOrder}
            viewOnly={true}
            onSubmit={async () => {}}
            onCancelOrder={handleCancelOrder}
          />
        )}
      </AnimatePresence>

      {/* Message Dialog */}
      <AnimatePresence>
        {showMessageDialog === true && 
         selectedOrder && 
         selectedOrder.id && 
         messageRecipientId && 
         typeof selectedOrder.id === 'string' && 
         typeof messageRecipientId === 'string' && 
         selectedOrder.id.trim() !== '' && 
         messageRecipientId.trim() !== '' && (
          <Message
            key="message-dialog"
            orderId={selectedOrder.id}
            recipientId={messageRecipientId}
            isDriver={Boolean(isDriverViewActive)}
            onClose={() => {
              setShowMessageDialog(false);
              setMessageRecipientId('');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderTracker; 