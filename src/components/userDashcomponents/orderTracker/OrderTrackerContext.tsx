import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase, getCurrentUser } from '../../../utils/supabase';

// Define interfaces for better type safety
export interface DriverDetails {
  id: string;
  full_name: string;
  phone?: string;
  profile_image?: string;
}

// For our component, we'll use a modified version of the Order type
// that accommodates the structure we're actually working with
export interface Order {
  id: string;
  status: string;
  user_id: string;
  driver_id?: string;
  created_at: string;
  pickup_location?: string | [number, number] | { lat: number; lng: number };
  destination_location?: string | [number, number] | { lat: number; lng: number };
  dropoff_location?: string; // For compatibility with the original Order type
  delivery_confirmed?: boolean;
  confirmed_at?: string;
  confirmed_by?: string;
  services?: {
    id: string;
    name: string;
    type?: string;
    description?: string;
  };
}

// Define interface for message counts
export interface MessageCount {
  order_id: string;
  count: string | number;
}

interface OrderTrackerContextType {
  // User and order data
  userId: string | null;
  setUserId: React.Dispatch<React.SetStateAction<string | null>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  selectedOrder: Order | null;
  setSelectedOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  selectedOrderService: Order['services'] | null;
  setSelectedOrderService: React.Dispatch<React.SetStateAction<Order['services'] | null>>;
  
  // Location data
  driverLocation: [number, number] | null;
  setDriverLocation: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  pickupLocation: [number, number] | null;
  setPickupLocation: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  destinationLocation: [number, number] | null;
  setDestinationLocation: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  
  // Loading and error states
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingOrders: boolean;
  setIsLoadingOrders: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Driver details
  driverDetails: DriverDetails | null;
  setDriverDetails: React.Dispatch<React.SetStateAction<DriverDetails | null>>;
  
  // Messaging feature states
  showMessageDialog: boolean;
  setShowMessageDialog: React.Dispatch<React.SetStateAction<boolean>>;
  messageReceiverId: string;
  setMessageReceiverId: React.Dispatch<React.SetStateAction<string>>;
  unreadMessageCounts: {[key: string]: number};
  setUnreadMessageCounts: React.Dispatch<React.SetStateAction<{[key: string]: number}>>;
  
  // Order details dialog
  showOrderDetailsDialog: boolean;
  setShowOrderDetailsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  isCancelling: boolean;
  setIsCancelling: React.Dispatch<React.SetStateAction<boolean>>;
  
  // View states
  isDriverViewActive: boolean;
  setIsDriverViewActive: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Tracking states
  isTrackingSpecificOrder: boolean;
  setIsTrackingSpecificOrder: React.Dispatch<React.SetStateAction<boolean>>;
  storedOrderId: string | null;
  setStoredOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Timer reference
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  
  // Delivery confirmation
  isConfirmingDelivery: boolean;
  setIsConfirmingDelivery: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Core functions
  fetchActiveOrders: () => Promise<void>;
  fetchDriverDetails: (driverId: string) => Promise<void>;
  fetchDriverLocation: (driverId: string) => Promise<void>;
  fetchOrderLocations: (order: Order) => Promise<void>;
  startLocationUpdates: (driverId: string) => void;
  stopLocationUpdates: () => void;
  getOrderIdFromUrl: () => string | null;
  selectOrder: (order: Order) => void;
  confirmDelivery: (orderId: string) => Promise<void>;
}

// Create the context with a default undefined value
const OrderTrackerContext = createContext<OrderTrackerContextType | undefined>(undefined);

// Custom hook for using the context
export const useOrderTracker = () => {
  const context = useContext(OrderTrackerContext);
  if (context === undefined) {
    throw new Error('useOrderTracker must be used within an OrderTrackerProvider');
  }
  return context;
};

// Provider component
export const OrderTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User and order data
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderService, setSelectedOrderService] = useState<Order['services'] | null>(null);
  
  // Location data
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [pickupLocation, setPickupLocation] = useState<[number, number] | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<[number, number] | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Driver details
  const [driverDetails, setDriverDetails] = useState<DriverDetails | null>(null);
  
  // Messaging feature states
  const [showMessageDialog, setShowMessageDialog] = useState<boolean>(false);
  const [messageReceiverId, setMessageReceiverId] = useState<string>('');
  const [unreadMessageCounts, setUnreadMessageCounts] = useState<{[key: string]: number}>({});
  
  // Order details dialog
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  
  // Delivery confirmation
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState<boolean>(false);
  
  // View states
  const [isDriverViewActive, setIsDriverViewActive] = useState<boolean>(false);
  
  // Tracking states
  const [isTrackingSpecificOrder, setIsTrackingSpecificOrder] = useState<boolean>(false);
  const [storedOrderId, setStoredOrderId] = useState<string | null>(null);
  
  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get order ID from URL if present
  const getOrderIdFromUrl = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    return orderId;
  };

  // Fetch driver details from the users table (not profiles)
  const fetchDriverDetails = async (driverId: string): Promise<void> => {
    if (!driverId) return;
    
    try {
      // Query the users table instead of profiles
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone, avatar_url')
        .eq('id', driverId)
        .single();
      
      if (error) {
        console.error('OrderTracker - Error fetching driver details:', error);
        return;
      }
      
      if (data) {
        setDriverDetails({
          id: data.id,
          full_name: data.full_name,
          phone: data.phone,
          profile_image: data.avatar_url
        });
      }
    } catch (err) {
      console.error('OrderTracker - Error in fetchDriverDetails:', err);
    }
  };

  // Fetch driver's current location
  const fetchDriverLocation = async (driverId: string): Promise<void> => {
    if (!driverId || !selectedOrder) return;
    
    try {
      // First try to get real driver location from database
      const { data: locationData, error: locationError } = await supabase
        .from('driver_availability')
        .select('location')
        .eq('driver_id', driverId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (locationError) {
        console.error('OrderTracker - Error fetching driver location:', locationError);
        return;
      }
      
      if (locationData && locationData.location) {
        let locationCoords: [number, number] | null = null;
        
        if (typeof locationData.location === 'string') {
          try {
            const parsed = JSON.parse(locationData.location);
            locationCoords = [parsed.lat || parsed[0], parsed.lng || parsed[1]];
          } catch (e) {
            console.error('OrderTracker - Error parsing location string:', e);
          }
        } else if (Array.isArray(locationData.location)) {
          locationCoords = locationData.location as [number, number];
        } else if (typeof locationData.location === 'object') {
          const loc = locationData.location as { lat: number; lng: number };
          locationCoords = [loc.lat, loc.lng];
        }
        
        if (locationCoords) {
          setDriverLocation(locationCoords);
        }
      }
    } catch (err) {
      console.error('OrderTracker - Error in fetchDriverLocation:', err);
    }
  };

  // Fetch order locations (pickup and destination)
  const fetchOrderLocations = async (order: Order): Promise<void> => {
    if (!order) return;
    
    try {
      // Process pickup location
      if (order.pickup_location) {
        let pickupCoords: [number, number] | null = null;
        
        if (typeof order.pickup_location === 'string') {
          try {
            const parsed = JSON.parse(order.pickup_location);
            pickupCoords = [parsed.lat || parsed[0], parsed.lng || parsed[1]];
          } catch (e) {
            console.error('OrderTracker - Error parsing pickup location string:', e);
          }
        } else if (Array.isArray(order.pickup_location)) {
          pickupCoords = order.pickup_location as [number, number];
        } else if (typeof order.pickup_location === 'object') {
          const loc = order.pickup_location as { lat: number; lng: number };
          pickupCoords = [loc.lat, loc.lng];
        }
        
        if (pickupCoords) {
          setPickupLocation(pickupCoords);
        }
      }
      
      // Process destination location
      if (order.destination_location) {
        let destinationCoords: [number, number] | null = null;
        
        if (typeof order.destination_location === 'string') {
          try {
            const parsed = JSON.parse(order.destination_location);
            destinationCoords = [parsed.lat || parsed[0], parsed.lng || parsed[1]];
          } catch (e) {
            console.error('OrderTracker - Error parsing destination location string:', e);
          }
        } else if (Array.isArray(order.destination_location)) {
          destinationCoords = order.destination_location as [number, number];
        } else if (typeof order.destination_location === 'object') {
          const loc = order.destination_location as { lat: number; lng: number };
          destinationCoords = [loc.lat, loc.lng];
        }
        
        if (destinationCoords) {
          setDestinationLocation(destinationCoords);
        }
      }
    } catch (err) {
      console.error('OrderTracker - Error in fetchOrderLocations:', err);
    }
  };

  // Start location updates for a driver
  const startLocationUpdates = (driverId: string) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Set up a new timer to fetch driver location every 10 seconds
    if (driverId) {
      fetchDriverLocation(driverId);
      timerRef.current = setInterval(() => {
        fetchDriverLocation(driverId);
      }, 10000);
    }
  };

  // Stop location updates
  const stopLocationUpdates = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Fetch active orders
  const fetchActiveOrders = async () => {
    if (!userId) return;
    
    setIsLoadingOrders(true);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId)
        .in('status', ['pending', 'accepted', 'en_route', 'arrived', 'picked_up', 'delivered'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('OrderTracker - Error fetching orders:', error);
        setError(`Error fetching orders: ${error.message}`);
        setIsLoadingOrders(false);
        return;
      }
      
      if (data) {
        console.log('OrderTracker - Fetched orders:', data);
        setOrders(data);
        
        // If we have a selected order, check if it's still in the list
        if (selectedOrder) {
          const isStillActive = data.some(o => o.id === selectedOrder.id);
          if (!isStillActive) {
            setSelectedOrder(null);
          }
        }
        
        // If we have orders but no selected order, select the first one
        if (data.length > 0 && !selectedOrder) {
          const firstOrder = data[0];
          setSelectedOrder(firstOrder);
          
          // Fetch locations for the selected order
          fetchOrderLocations(firstOrder);
          
          // Fetch driver details if available
          if (firstOrder.driver_id) {
            fetchDriverDetails(firstOrder.driver_id);
            startLocationUpdates(firstOrder.driver_id);
          }
          
          // Set service details
          if (firstOrder.services) {
            setSelectedOrderService(firstOrder.services);
          }
        }
      }
      
      setIsLoadingOrders(false);
      setIsLoading(false);
    } catch (err) {
      console.error('OrderTracker - Error in fetchActiveOrders:', err);
      setIsLoadingOrders(false);
      setIsLoading(false);
    }
  };

  // Select an order
  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    
    // Fetch locations for the selected order
    fetchOrderLocations(order);
    
    // Fetch driver details if available
    if (order.driver_id) {
      fetchDriverDetails(order.driver_id);
      startLocationUpdates(order.driver_id);
    }
    
    // Set service details
    if (order.services) {
      setSelectedOrderService(order.services);
    }
    
    // Store the selected order ID in localStorage
    localStorage.setItem('selectedOrderId', order.id);
    setStoredOrderId(order.id);
  };

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Get current user
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
        } else {
          setError('User not authenticated');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('OrderTracker - Error initializing component:', err);
        setIsLoading(false);
      }
    };
    
    initializeComponent();
    
    // Check for order ID in URL
    const orderIdFromUrl = getOrderIdFromUrl();
    if (orderIdFromUrl) {
      setIsTrackingSpecificOrder(true);
    }
    
    // Check for stored order ID in localStorage
    const storedId = localStorage.getItem('selectedOrderId');
    if (storedId) {
      setStoredOrderId(storedId);
    }
    
    // Cleanup function
    return () => {
      stopLocationUpdates();
    };
  }, []);

  // Fetch orders when userId changes
  useEffect(() => {
    if (userId) {
      fetchActiveOrders();
    }
  }, [userId]);

  // Function to confirm delivery of an order
  const confirmDelivery = async (orderId: string) => {
    if (!orderId) return;
    
    setIsConfirmingDelivery(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: userId || '',
          status: 'confirmed' // Use 'confirmed' status as defined in the migration
        })
        .eq('id', orderId);
      
      if (error) {
        console.error('Error confirming delivery:', error);
        setError(`Error confirming delivery: ${error.message}`);
        setIsConfirmingDelivery(false);
        return;
      }
      
      // Refresh orders to show updated status
      await fetchActiveOrders();
      
      // If the confirmed order is the selected order, update it
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          delivery_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: userId || ''
        });
      }
      
      setIsConfirmingDelivery(false);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError('Failed to confirm delivery. Please try again.');
      setIsConfirmingDelivery(false);
    }
  };

  // Value object for the context provider
  const value: OrderTrackerContextType = {
    userId,
    setUserId,
    orders,
    setOrders,
    selectedOrder,
    setSelectedOrder,
    selectedOrderService,
    setSelectedOrderService,
    driverLocation,
    setDriverLocation,
    pickupLocation,
    setPickupLocation,
    destinationLocation,
    setDestinationLocation,
    isLoading,
    setIsLoading,
    isLoadingOrders,
    setIsLoadingOrders,
    error,
    setError,
    driverDetails,
    setDriverDetails,
    showMessageDialog,
    setShowMessageDialog,
    messageReceiverId,
    setMessageReceiverId,
    unreadMessageCounts,
    setUnreadMessageCounts,
    showOrderDetailsDialog,
    setShowOrderDetailsDialog,
    isCancelling,
    setIsCancelling,
    isDriverViewActive,
    setIsDriverViewActive,
    isTrackingSpecificOrder,
    setIsTrackingSpecificOrder,
    storedOrderId,
    setStoredOrderId,
    timerRef,
    isConfirmingDelivery,
    setIsConfirmingDelivery,
    fetchActiveOrders,
    fetchDriverDetails,
    fetchDriverLocation,
    fetchOrderLocations,
    startLocationUpdates,
    stopLocationUpdates,
    getOrderIdFromUrl,
    selectOrder,
    confirmDelivery
  };

  return (
    <OrderTrackerContext.Provider value={value}>
      {children}
    </OrderTrackerContext.Provider>
  );
};
