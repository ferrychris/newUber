import React, { useState, useEffect } from "react";
import { supabase, getCurrentUser } from "../../utils/supabase";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FaSpinner, FaMapMarkerAlt } from "react-icons/fa";
import { SERVICES } from "./orders/constants";
import { getToastConfig, validateFrenchAddress, getStatusConfig } from "./orders/utils";
import { formatCurrency, formatDate } from "../../utils/i18n";
import OrderCard from "./orders/components/OrderCard";
import ServiceSelectionDialog from "./orders/components/ServiceSelectionDialog";
import OrderDetailsDialog from "./orders/components/OrderDetailsDialog";
import { Order as OrderType, Service, OrderFormData } from "./orders/types";
import { useTranslation } from "react-i18next";

const Order: React.FC = () => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          
          // Verify the user exists in our users table
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error("Error verifying user in database:", error);
            if (error.code === 'PGRST116') {
              // User exists in auth but not in our users table
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
            // User exists in both auth and users table, proceed normally
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
        estimated_price: estimatedPrice
        // Remove metadata field as it's not in the database schema
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

  // Function to cancel an order
  const handleCancelOrder = async (orderId: string): Promise<void> => {
    try {
      // Show confirmation dialog
      if (!confirm(t('orders.confirmCancel'))) {
        return; // User cancelled the operation
      }
      
      // Show loading toast
      const loadingToast = toast.loading(t('orders.cancelling'));
      
      // Update the order status to cancelled
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      
      if (error) {
        console.error('Error cancelling order:', error);
        toast.error(t('orders.cancelError'), getToastConfig("error"));
        throw error;
      }
      
      // Show success toast
      toast.success(t('orders.cancelSuccess'), getToastConfig("success"));
      
      // Refresh orders
      fetchOrders(userId);
      
      // Close the dialog
      setSelectedOrder(null);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(t('orders.cancelError'), getToastConfig("error"));
    }
  };

  // Helper function to find the service for an order
  const findServiceForOrder = (order: OrderType): Service | null => {
    if (!order) return null;
    
    // Try to find service from joined data
    if (order.services && typeof (order.services as any).name === 'string') {
      const serviceName = (order.services as any).name;
      const foundService = SERVICES.find(s => s.name === serviceName);
      if (foundService) return foundService;
    }
    
    // Try to find by service_id
    if (order.service_id) {
      const foundService = SERVICES.find(s => s.id === order.service_id);
      if (foundService) return foundService;
    }
    
    // Default to first service if no match
    return SERVICES.length > 0 ? SERVICES[0] : null;
  };

  return (
    <div className="container mx-auto">
      {/* Header section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('orders.title')}</h1>
          <button
            onClick={() => setShowServiceDialog(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            disabled={isCreatingOrder}
          >
            {isCreatingOrder ? (
              <><FaSpinner className="animate-spin" /> {t('orders.creating')}</>
            ) : (
              <>{t('orders.create')}</>
            )}
          </button>
        </div>
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
        <div className="flex justify-center items-center h-40">
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
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('orders.empty')}</h2>
          <p className="text-gray-500 dark:text-stone-400 mb-6">{t('orders.emptyMessage')}</p>
          <button
            onClick={() => setShowServiceDialog(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            {t('orders.createFirst')}
          </button>
        </motion.div>
      ) : (
        <div className="bg-white dark:bg-midnight-800 shadow-sm rounded-xl border border-gray-100 dark:border-stone-700/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-midnight-700/50 border-b border-gray-100 dark:border-stone-700/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                    {t('orders.service')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                    {t('location.title')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                    {t('orders.estimatedPrice')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                    {t('orders.status.title')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                    {t('orders.date')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                    {t('orders.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-stone-700/20">
                {orders.map((order) => {
                  const service = findServiceForOrder(order) as Service;
                  const statusConfig = getStatusConfig(order.status);
                  
                  // Skip orders with no service
                  if (!service) return null;
                  
                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 dark:hover:bg-midnight-700/30 transition-colors cursor-pointer"
                      onClick={() => {
                        const orderService = findServiceForOrder(order);
                        setSelectedOrder(order);
                        setSelectedService(orderService); // Set the service when clicking an order
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${service.theme.bg ? service.theme.bg.replace('bg-', 'bg-') : 'bg-indigo-100 dark:bg-indigo-900/30'} mr-3`}>
                            {service.icon || <FaMapMarkerAlt className={`w-4 h-4 ${service.theme.text ? service.theme.text.replace('text-', 'text-') : 'text-indigo-600 dark:text-indigo-400'}`} />}
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {service.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 mr-2"></div>
                              <p className="text-sm truncate max-w-[200px]">{order.pickup_location.split(',')[0]}</p>
                            </div>
                            <div className="border-l-2 h-4 border-dashed border-gray-300 dark:border-stone-600 ml-1"></div>
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 mr-2"></div>
                              <p className="text-sm truncate max-w-[200px]">{order.dropoff_location.split(',')[0]}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(order.estimated_price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                          {t(`status.${order.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-stone-400">
                        {formatDate(new Date(order.created_at).toISOString().split('T')[0])}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button 
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-200 dark:border-stone-700/20 text-xs font-medium rounded text-gray-700 dark:text-stone-300 bg-white dark:bg-midnight-700/50 hover:bg-gray-50 dark:hover:bg-midnight-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-midnight-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setSelectedService(findServiceForOrder(order));
                          }}
                        >
                          {t('orders.details')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Service Selection Dialog */}
      {showServiceDialog && (
        <ServiceSelectionDialog
          onClose={() => setShowServiceDialog(false)}
          onSelectService={(service: Service) => {
            setSelectedService(service);
            setShowServiceDialog(false);
            // Show order details form after service selection
            setSelectedOrder({ service_id: service.id } as OrderType);
          }}
        />
      )}

      {/* Order Details Dialog */}
      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          service={selectedService}
          onClose={() => setSelectedOrder(null)}
          onSubmit={handleCreateOrder}
          isSubmitting={isCreatingOrder}
          viewOnly={!!selectedOrder.id} // Only view mode for existing orders
          onCancelOrder={handleCancelOrder}
        />
      )}
    </div>
  );
};

export default Order;
