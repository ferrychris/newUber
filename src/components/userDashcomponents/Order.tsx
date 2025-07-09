import React, { useState, useEffect } from "react";
import { supabase, getCurrentUser } from "../../utils/supabase";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { initiateOrderChat } from "../../utils/chatUtils";
import ChatModal from "./ChatModal";
import { FaSpinner, FaMapMarkerAlt } from "react-icons/fa";
import { SERVICES } from "./orders/constants";
import { getToastConfig, validateFrenchAddress, getStatusConfig } from "./orders/utils";
import { formatCurrency, formatDate } from "../../utils/i18n";
// import OrderCard from "./orders/components/OrderCard"; // Unused import
import ServiceSelectionDialog from "./orders/components/ServiceSelectionDialog";
import OrderDetailsDialog from "./orders/components/OrderDetailsDialog";
import { Order as OrderType, Service, OrderFormData } from "./orders/types";
import { useTranslation } from "react-i18next";

const Order: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  // State for tracking when an order is being created
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for chat modal
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedChatOrder, setSelectedChatOrder] = useState<OrderType | null>(null);
  const [driverName, setDriverName] = useState<string>("");
  const [driverAuthId, setDriverAuthId] = useState<string>("");

  // Removed message tracking since we're using a dedicated message button
  
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        setIsLoading(true);
        
        // Check localStorage first
        const userSessionStr = localStorage.getItem('userSession');
        if (userSessionStr) {
          try {
            const userSession = JSON.parse(userSessionStr);
            if (userSession && userSession.id) {
              console.log("Found user in localStorage:", userSession.full_name);
              console.log("User ID from localStorage:", userSession.id);
              setUserId(userSession.id);
              // Pass the user ID explicitly
              fetchOrders(userSession.id);
              return;
            }
          } catch (e) {
            console.error("Error parsing localStorage session:", e);
          }
        }

        // Fallback to Supabase Auth
        const user = await getCurrentUser();
        
        if (user) {
          console.log("Authenticated user:", user);
          console.log("User ID:", user.id);
          setUserId(user.id);
          
          // Verify the user exists in our profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error("Error verifying user in database:", error);
            if (error.code === 'PGRST116') {
              // User exists in auth but not in our profiles table
              console.error("User not found in database. They may need to complete registration.");
              setError(t('auth.profileIncomplete'));
            } else {
              setError(t('common.error'));
            }
          } else if (!data) {
            console.error("User not found in database");
            setError(t('auth.profileIncomplete'));
          } else {
            console.log("User found in database:", data);
            // User exists in both auth and profiles table, proceed normally
            setUserId(user.id);
            fetchOrders(user.id); // Pass the user.id explicitly
          }
        } else {
          console.error('No authenticated user found');
          setError(t('common.authError'));
        }
      } catch (error) {
        console.error("Error getting user session:", error);
        setError(t('common.authError'));
      }
    }
    
    fetchCurrentUser();
    
    // Also subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      if (session) {
        console.log("New user ID:", session.user.id);
        setUserId(session.user.id);
        fetchOrders(session.user.id); // Pass the user ID explicitly
      } else {
        // Check localStorage when Supabase auth session is null
        const userSessionStr = localStorage.getItem('userSession');
        if (userSessionStr) {
          try {
            const userSession = JSON.parse(userSessionStr);
            if (userSession && userSession.id) {
              console.log("Using user ID from localStorage after auth change:", userSession.id);
              setUserId(userSession.id);
              fetchOrders(userSession.id); // Pass the user ID explicitly
              return;
            }
          } catch (e) {
            console.error("Error parsing localStorage session after auth change:", e);
          }
        }
        
        // No valid session found in any storage
        setUserId(null);
        setOrders([]); // Clear orders when user logs out
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [t]);

  useEffect(() => {
    // Fetch orders when userId changes
    if (userId) {
      console.log("userId changed, fetching orders with ID:", userId);
      fetchOrders(userId); // Pass the user ID explicitly
    }

    // Subscribe to real-time changes in the orders table
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log("Orders table changed:", payload);
        if (userId) {
          // Only refresh if the change involves the current user
          // Type check to ensure payload.new has user_id property
          if (payload.new && typeof payload.new === 'object' && 'user_id' in payload.new && payload.new.user_id === userId) {
            console.log("Change involves current user, refreshing orders...");
            // Pass the current userId explicitly
            fetchOrders(userId);
          } else {
            console.log("Change does not involve current user, skipping refresh");
          }
        }
      })
      .subscribe();

    return () => {
      console.log("Removing subscription");
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const fetchOrders = async (userIdParam?: string | null) => {
    try {
      // Use passed user ID or fall back to state
      const userIdToUse = userIdParam || userId;
      
      // Check if we have a valid user ID
      if (!userIdToUse) {
        console.error("Cannot fetch orders: No user ID available");
        setError(t('common.authError'));
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      console.log("Fetching orders for user ID:", userIdToUse);
      
      // Fetch orders
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(id, name)')
        .eq('user_id', userIdToUse)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
      
      // Log data structure for debugging
      console.log('Orders from database:', data);
      
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(t('common.error'));
      toast.error(t('orders.loadError'), getToastConfig("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async (formData: OrderFormData) => {
    // Declare loadingToast outside the try block so we can access it in the finally block
    let loadingToast: string | undefined;
    
    try {
      // Validate French addresses
      const pickupValidation = validateFrenchAddress(formData.pickupLocation);
      const destinationValidation = validateFrenchAddress(formData.destination);
      
      if (!pickupValidation.isValid || !destinationValidation.isValid) {
        toast.error(t('location.notFrenchAddress'), getToastConfig("error"));
        return;
      }

      // Use the current userId from state
      if (!userId) {
        console.error("Missing user ID for order creation");
        toast.error(t('auth.requiredLogin'), getToastConfig("error"));
        return;
      }

      if (!selectedService) {
        toast.error(t('orders.selectService'), getToastConfig("error"));
        return;
      }

      setIsCreatingOrder(true);
      loadingToast = toast.loading(t('orders.creating'));

      // Get the service ID
      let serviceId = selectedService.id;
      
      // If the selectedService doesn't have a valid database ID, fetch it
      if (!serviceId || serviceId.length < 10) {
        console.log("Finding service ID for:", selectedService.name);
        
        // First check if the service exists
        const { data: serviceList, error: listError } = await supabase
          .from('services')
          .select('id')
          .eq('name', selectedService.name);
          
        if (listError) {
          console.error("Service list error:", listError);
          throw new Error(`Error fetching services: ${listError.message}`);
        }
        
        if (!serviceList || serviceList.length === 0) {
          console.error("No service found with name:", selectedService.name);
          throw new Error(`Service not found: ${selectedService.name}`);
        }
        
        // Now we can safely use single() because we know there's at least one result
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('id')
          .eq('name', selectedService.name)
          .single();

        if (serviceError || !serviceData) {
          console.error("Service fetch error:", serviceError);
          throw new Error(`Service not found: ${selectedService.name}`);
        }
        
        serviceId = serviceData.id;
        console.log("Found service ID:", serviceId);
      }

      // Log user ID information
      console.log("Creating order for user ID:", userId);
      console.log("User ID type:", typeof userId);
      
      // Prepare price value - ensure it's a proper numeric value
      const estimatedPrice = typeof formData.price === 'string' 
        ? parseFloat(formData.price) 
        : formData.price;
      
      // Strictly follow database schema for orders table
      const orderData = {
        user_id: userId,
        service_id: serviceId,
        status: "pending",
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.destination,
        estimated_price: estimatedPrice,
        payment_method: formData.paymentMethod || 'cash'
      };
      
      console.log("Creating order with data:", JSON.stringify(orderData, null, 2));
      
      // Insert the order
      const { data: newOrder, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select();
      
      if (error) {
        console.error("Order creation error:", error);
        throw error;
      }

      console.log("Order created successfully:", newOrder);
      toast.success(t('orders.createSuccess'), getToastConfig("success"));
      setSelectedService(null);
      
      // Refresh orders list
      fetchOrders(userId);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(t('orders.createError'), getToastConfig("error"));
    } finally {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      setIsCreatingOrder(false);
    }
  };

  // We're not implementing order editing yet, so we'll just close the dialog
  const handleViewOrder = async (): Promise<void> => {
    setSelectedOrder(null);
  };

  // Helper function to find the service for an order
  const findServiceForOrder = (order: OrderType) => {
    if (!order) return null;
    
    // Cast to any to avoid TypeScript errors
    const services = order.services as any;
    
    // Try to find the service in our SERVICES array
    if (services && typeof services.name === 'string') {
      return SERVICES.find((s) => s.id === services.name || s.name === services.name) || SERVICES[0];
    }
    
    // Fallback to first service if we can't find a match
    return SERVICES[0];
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      // Display loading toast
      const loadingToast = toast.loading(t('orders.cancelling'));
      
      // Update the order status to 'cancelled'
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      
      if (error) {
        throw error;
      }
      
      // Show success message
      toast.success(t('orders.cancelled'), {
        id: loadingToast
      });
      
      // Update the local orders list
      if (userId) {
        fetchOrders(userId);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(t('orders.cancelError'));
    }
  };

  // Function to handle confirming delivery of an order
  const handleConfirmDelivery = async (orderId: string) => {
    try {
      // Display loading toast
      const loadingToast = toast.loading("Confirming delivery...");
      
      // Update the order status to 'completed'
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);
      
      if (error) {
        throw error;
      }
      
      // Show success message
      toast.success("Delivery confirmed successfully", {
        id: loadingToast
      });
      
      // Update the local orders list
      if (userId) {
        fetchOrders(userId);
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error("Could not confirm delivery. Please try again.", getToastConfig("error"));
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          {t('Orders')}
        </h1>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowServiceDialog(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sunset hover:bg-sunset/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sunset dark:focus:ring-offset-midnight-900 transition-all duration-300"
          >
            {t('Create Order')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                {t('common.error')}
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin h-8 w-8 text-sunset" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-midnight-800 shadow-sm overflow-hidden rounded-xl border border-gray-200 dark:border-stone-600/10">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              No Orders
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-stone-400 mx-auto">
              <p>Create your first order to get started!</p>
            </div>
            <div className="mt-5">
              <button
                onClick={() => setShowServiceDialog(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sunset hover:bg-sunset/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sunset"
              >
                {t('Create Order')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile view - Card layout */}
          <div className="md:hidden space-y-4">
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              return (
                <div 
                  key={order.id}
                  className="bg-white dark:bg-midnight-800 rounded-xl border border-gray-200 dark:border-stone-600/10 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                  onClick={() => {
                    const orderService = findServiceForOrder(order);
                    setSelectedOrder(order);
                    setSelectedService(orderService);
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-sunset flex items-center justify-center text-white">
                          {findServiceForOrder(order)?.icon}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {findServiceForOrder(order)?.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-stone-400">
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                        {t(`orders.status.${order.status}`)}
                      </span>
                    </div>
                    
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-gray-500 dark:text-stone-400 uppercase font-medium tracking-wide">
                        Locations
                      </div>
                      <div className="flex flex-col text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="mr-1 text-sunset flex-shrink-0" />
                          <span className="truncate">{order.pickup_location}</span>
                        </div>
                        <div className="w-px h-2 ml-2 border-l border-dashed border-gray-300 dark:border-stone-600"></div>
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="mr-1 text-purple-600 flex-shrink-0" />
                          <span className="truncate">{order.dropoff_location}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-stone-400 uppercase font-medium tracking-wide">
                          Price
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(order.estimated_price || 0)}
                        </div>
                      </div>
                      
                      <button 
                        className="text-sunset hover:text-purple-600 bg-sunset/10 hover:bg-sunset/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setSelectedService(findServiceForOrder(order));
                        }}
                      >
                        {t('Actions')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop view - Table layout */}
          <div className="hidden md:block overflow-hidden shadow rounded-xl border border-gray-200 dark:border-stone-600/10 bg-white dark:bg-midnight-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-stone-600/10">
                <thead className="bg-gray-50 dark:bg-midnight-700/30">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                      Service
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                      Locations
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Message</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-midnight-800 divide-y divide-gray-200 dark:divide-stone-600/10">
                  {orders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
              
                    return (
                      <tr 
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-midnight-700/50 cursor-pointer transition-colors duration-200"
                        onClick={() => {
                          const orderService = findServiceForOrder(order);
                          setSelectedOrder(order);
                          setSelectedService(orderService); // Set the service when clicking an order
                        }}
                      >
                       
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-sunset flex items-center justify-center text-white">
                              {findServiceForOrder(order)?.icon}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {findServiceForOrder(order)?.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-stone-400">
                                {formatDate(order.created_at)}
                              </div>
                            </div>
                          </div>
                          <button
                            className="flex items-center mt-2 px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                            onClick={async (e) => {
                              e.stopPropagation(); // Prevent triggering the row click
                              
                              // Show loading toast
                              const loadingToast = toast.loading("Starting conversation...");
                              
                              try {
                                console.log("Order details:", {
                                  orderId: order.id,
                                  driverId: order.driver_id,
                                  customerId: userId,
                                  orderStatus: order.status
                                });
                                
                                // Fetch the driver ID for this order if there is one assigned
                                if (order.driver_id) {
                                  console.log("Initiating chat between driver", order.driver_id, "and customer", userId);
                                  
                                  // We have both customer and driver IDs, initiate the conversation
                                  const success = await initiateOrderChat(
                                    order.id,
                                    order.driver_id,
                                    userId as string, // Current user is the customer
                                    // Custom message from customer perspective
                                    "I'd like to discuss my order with you."
                                  );
                                  
                                  if (success) {
                                    toast.success("Conversation started", { id: loadingToast });
                                  } else {
                                    toast.error("Could not start conversation", { id: loadingToast });
                                    // Continue anyway to the chat interface
                                  }
                                } else {
                                  // No driver assigned yet, show info message
                                  toast.success("No driver assigned yet. Check back later.", { id: loadingToast });
                                }
                                
                                // Navigate to messages view with order ID in state
                                navigate(`/dashboard/messages`, { state: { orderId: order.id } });
                              } catch (error) {
                                console.error("Error starting conversation:", error);
                                toast.error("Couldn't start conversation. Try again.", { id: loadingToast });
                              }
                            }}
                          >
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center">
                              <FaMapMarkerAlt className="mr-1 text-sunset" />
                              <span className="truncate max-w-[180px]">{order.pickup_location}</span>
                            </div>
                            <div className="w-px h-2 ml-2 border-l border-dashed border-gray-300 dark:border-stone-600"></div>
                            <div className="flex items-center">
                              <FaMapMarkerAlt className="mr-1 text-purple-600" />
                              <span className="truncate max-w-[180px]">{order.dropoff_location}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{formatCurrency(order.estimated_price || 0)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                            {t(`orders.status.${order.status}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="text-sunset hover:text-purple-600 transition-colors duration-200"
                            onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmDelivery(order.id);
                            }}
                          >
                            {t('Confirm Delivery')}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="text-sunset hover:text-purple-600 transition-colors duration-200"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const loadingToast = toast.loading("Opening conversation...");
                              
                              try {
                                // Check if there's a driver assigned
                                if (order.driver_id) {
                                  // Try to initiate conversation if needed
                                  await initiateOrderChat(
                                    order.id,
                                    order.driver_id,
                                    userId as string,
                                    "I'd like to discuss my order with you."
                                  );
                                  
                                  // Get driver name and auth user ID
                                  const { data: driverData } = await supabase
                                    .from('profiles')
                                    .select('name, user_id')
                                    .eq('id', order.driver_id)
                                    .single();
                                    
                                  if (driverData) {
                                    setDriverName(driverData.name);
                                    // Store driver's auth user ID for messaging
                                    setDriverAuthId(driverData.user_id);
                                  }
                                }
                                
                                // Open chat modal instead of navigating
                                setSelectedChatOrder(order);
                                setIsChatModalOpen(true);
                                toast.success("Chat opened", { id: loadingToast });
                              } catch (error) {
                                console.error("Error opening chat:", error);
                                toast.error("Couldn't open chat. Try again.", { id: loadingToast });
                              }
                            }}
                          >
                            {t('Messages')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {showServiceDialog && (
          <ServiceSelectionDialog
            onClose={() => setShowServiceDialog(false)}
            onSelectService={(service: Service) => {
              setSelectedService(service);
              setShowServiceDialog(false);
              setSelectedOrder({} as OrderType);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedService && selectedOrder && (
          <OrderDetailsDialog
            onClose={() => {
              setSelectedService(null);
              setSelectedOrder(null);
            }}
            service={selectedService}
            order={selectedOrder}
            viewOnly={!!selectedOrder.id}
            onSubmit={async (orderData: OrderFormData) => {
              setIsCreatingOrder(true);

              const loadingToast = toast.loading(t('orders.creating'));

              try {
                // ... existing code ...
              } catch (error) {
                // ... existing code ...
              } finally {
                setIsCreatingOrder(false);
              }
            }}
            onCancelOrder={handleCancelOrder}
          />
        )}
      </AnimatePresence>
      
      {/* Chat Modal */}
      {selectedChatOrder && (
        <ChatModal 
          isOpen={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            setSelectedChatOrder(null);
            setDriverAuthId("");
          }}
          orderId={selectedChatOrder.id}
          userId={userId as string}
          driverId={driverAuthId} // Pass the auth user ID for proper foreign key relationship
          driverName={driverName}
          orderDetails={{
            pickup_location: selectedChatOrder.pickup_location,
            dropoff_location: selectedChatOrder.dropoff_location,
            status: selectedChatOrder.status
          }}
        />
      )}
    </div>
  );
};

export default Order;
