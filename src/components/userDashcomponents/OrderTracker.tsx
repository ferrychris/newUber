import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, getCurrentUser } from '../../utils/supabase';
import { FaSpinner } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ServiceType } from './orders/types';
import toast from 'react-hot-toast';
import OrderDetailsDialog from './orders/components/OrderDetailsDialog';
import Message from './Message';
import OrderListPanel from './orderTracker/OrderListPanel';
import OrderMapPanel from './orderTracker/OrderMapPanel';
import OrderDetailsPanel from './orderTracker/OrderDetailsPanel';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Add this debounce utility at the component level
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
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
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driverDetails, setDriverDetails] = useState<any | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Messaging feature states
  const [showMessageDialog, setShowMessageDialog] = useState<boolean>(false);
  const [messageReceiverId, setMessageReceiverId] = useState<string>('');
  const [isDriverViewActive, setIsDriverViewActive] = useState<boolean>(false);

  // At the top of the component add this state
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<{[key: string]: number}>({});

  // Add this to control fetch timing and prevent race conditions
  const fetchController = useRef<AbortController | null>(null);

  // Create debounced versions of frequently called functions
  const debouncedFetchDriverLocation = useRef(
    debounce((driverId: string) => fetchDriverLocation(driverId), 500)
  ).current;

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

  // Fetch active orders when userId changes
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

  // Fetch active orders (status = accepted or active, excluding carpooling)
  const fetchActiveOrders = async () => {
    if (!userId) return;
    
    // Use the specific loading state for subsequent fetches
    setIsLoadingOrders(true);
    setError(null);
    
    try {
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
        // Or if the previously selected order is no longer in the active list
        const currentSelectedStillActive = selectedOrder && deliveryOrders.some(o => o.id === selectedOrder.id);
        if (deliveryOrders.length > 0 && !currentSelectedStillActive) {
          const firstOrder = deliveryOrders[0];
          setSelectedOrder(firstOrder);
          // Use Promise.all to fetch locations and driver details in parallel if possible
          await Promise.all([
            fetchOrderLocations(firstOrder),
            firstOrder.driver_id ? fetchDriverDetails(firstOrder.driver_id) : Promise.resolve()
          ]);
        } else if (deliveryOrders.length === 0) {
            setSelectedOrder(null); // Clear selection if no active orders
            setDriverDetails(null);
            setDriverLocation(null);
        }
      }
    } catch (error) {
      console.error('Error fetching active orders:', error);
      setError(t('common.error'));
      setOrders([]); // Clear orders on error
      setSelectedOrder(null);
    } finally {
      // Ensure both loading states are set to false
      setIsLoading(false); // For initial load
      setIsLoadingOrders(false); // For subsequent loads
    }
  };

  // Simulate fetching driver's current location
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

  // Modify startLocationUpdates to use debounced function
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
        debouncedFetchDriverLocation(selectedOrder.driver_id);
      }
    }, 5000);
  };

  // Handle order selection
  const handleSelectOrder = (order: any) => {
    // Cancel any in-progress fetches
    if (fetchController.current) {
      fetchController.current.abort();
    }
    
    // Create a new abort controller for this fetch session
    fetchController.current = new AbortController();
    
    // Close any open message dialog
    setShowMessageDialog(false);
    setMessageReceiverId('');
    
    // Set the selected order
    setSelectedOrder(order);
    
    // Start async fetches with the abort signal
    const signal = fetchController.current.signal;
    
    // Create a fetch wrapper that respects the abort signal
    const fetchWithSignal = async () => {
      try {
        await Promise.all([
          fetchOrderLocations(order),
          order.driver_id ? fetchDriverDetails(order.driver_id) : Promise.resolve()
        ]);
      } catch (error) {
        // Check if this is an abort error (user switched selection quickly)
        if ((error as any)?.name === 'AbortError') {
          console.log('Fetch was aborted as user changed selection');
        } else {
          console.error('Error fetching order data:', error);
          toast.error(t('common.fetchError'));
        }
      }
    };
    
    fetchWithSignal();
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
    if (!window.confirm(t('orders.confirmCancel'))) {
      return;
    }
    
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
        
      if (error) throw error;
      
      toast.success(t('orders.cancelSuccess'));
      fetchActiveOrders();
      setShowOrderDetailsDialog(false);
      // If the cancelled order was the selected one, clear selection
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(t('common.error'));
    } finally {
      setIsCancelling(false);
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
    
    // Set receiver ID and show dialog
    setMessageReceiverId(selectedOrder.driver_id);
    setShowMessageDialog(true);
    
    console.log("Opening message dialog with:", {
      orderId: selectedOrder.id,
      receiverId: selectedOrder.driver_id
    });
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
      
      // Use Promise.race to implement a timeout for the RPC call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 3000)
      );
      
      try {
        // Run a raw query to get the counts since group by is not directly supported in the JS client
        const rpcPromise = supabase.rpc('get_unread_message_counts', { 
          user_id: userId,
          order_ids: orderIds 
        });
        
        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;
        
        if (error) throw error;
        
        if (data) {
          const counts: {[key: string]: number} = {};
          data.forEach((item: any) => {
            counts[item.order_id] = item.count;
          });
          setUnreadMessageCounts(counts);
          return;
        }
      } catch (rpcError) {
        console.warn('RPC call failed or timed out, falling back to manual count:', rpcError);
        // Continue to fallback
      }
      
      // Fallback: fetch all unread messages and count manually
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('order_id')
        .eq('receiver_id', userId)
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
    } catch (error) {
      console.error('Error fetching unread message counts:', error);
    }
  };

  // Add cleanup logic for message dialog when selectedOrder changes
  useEffect(() => {
    // Reset message dialog state when selected order changes
    setShowMessageDialog(false);
    setMessageReceiverId('');
  }, [selectedOrder]);

  // Add cleanup for fetch controller on unmount
  useEffect(() => {
    return () => {
      if (fetchController.current) {
        fetchController.current.abort();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Main render function
  // Loading state for the entire component
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
      </div>
    );
  }
  
  // Main layout
  return (
    <div className="container mx-auto pb-8 px-4 sm:px-6">
      {/* Title and Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            {t('tracking.title')}
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t('tracking.subtitle')}
        </p>
      </motion.div>

      {/* Mobile Tabs - Only visible on small screens */}
      <div className="md:hidden mb-4">
        <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-1 flex">
          <button 
            onClick={() => setIsDriverViewActive(false)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${!isDriverViewActive 
              ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
              : 'text-gray-700 dark:text-gray-300'}`}
          >
            Orders
          </button>
          <button 
            onClick={() => setIsDriverViewActive(true)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium ${isDriverViewActive 
              ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
              : 'text-gray-700 dark:text-gray-300'}`}
            disabled={!selectedOrder}
          >
            Track
          </button>
        </div>
      </div>

      {/* Main Grid Layout - Modified for mobile responsiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
        {/* Order List Panel - Hidden on mobile when map view is active */}
        <div className={`${isDriverViewActive ? 'hidden md:block' : ''}`}>
          <OrderListPanel 
            orders={orders}
            isLoading={isLoading}
            isLoadingOrders={isLoadingOrders}
            error={error}
            selectedOrder={selectedOrder}
            driverDetails={driverDetails}
            handleSelectOrder={(order) => {
              handleSelectOrder(order);
              // On mobile, switch to map view when an order is selected
              if (window.innerWidth < 768) {
                setIsDriverViewActive(true);
              }
            }}
          />
        </div>

        {/* Map and Order Details - Hidden on mobile when order list view is active */}
        <div className={`lg:col-span-2 ${!isDriverViewActive ? 'hidden md:block' : ''}`}>
          {/* Map Panel */}
          <OrderMapPanel 
            selectedOrder={selectedOrder}
            driverLocation={driverLocation}
            pickupLocation={pickupLocation}
            destinationLocation={destinationLocation}
            driverDetails={driverDetails}
            isLoadingLocation={isLoadingLocation}
            mapContainerStyle={{...mapContainerStyle, height: '350px'}}
            mapWrapperStyle={mapWrapperStyle}
            driverIcon={driverIcon}
            pickupIcon={pickupIcon}
            destinationIcon={destinationIcon}
          />
          
          {/* Order Details Panel - Only render if an order is selected */}
          {selectedOrder && (
            <OrderDetailsPanel
              selectedOrder={selectedOrder}
              unreadMessageCounts={unreadMessageCounts}
              handleOpenOrderDetails={handleOpenOrderDetails}
              handleOpenMessageDialog={handleOpenMessageDialog}
              handleCancelOrder={handleCancelOrder}
              isCancelling={isCancelling}
            />
          )}
        </div>
      </div>

      {/* Dialogs remain in the main component as they overlay everything */}
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

      <AnimatePresence>
        {showMessageDialog && selectedOrder && messageReceiverId && messageReceiverId.length > 0 && (
          <Message
            key={`${selectedOrder.id}-${messageReceiverId}`}
            orderId={selectedOrder.id}
            receiverId={messageReceiverId}
            isDriver={false}
            onClose={() => {
              setShowMessageDialog(false);
              setMessageReceiverId('');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderTracker;