import React, { useState, useEffect } from "react";
import { supabase, getCurrentUser } from "../../utils/supabase";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";
import { SERVICES } from "./orders/constants";
import { getToastConfig, validateFrenchAddress } from "./orders/utils";
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

  const findServiceForOrder = (order: OrderType): Service => {
    // Try to find service using service_id from the joined services data
    let service: Service | undefined;
    
    // Access services data if it exists in the joined query result
    const serviceName = order.services?.name;
    
    if (serviceName) {
      // Try to match by name from the joined query
      service = SERVICES.find((s: Service) => s.name === serviceName);
    }
    
    // Fallback to first service if we can't find a match
    if (!service) {
      service = SERVICES[0];
      console.warn(`No matching service found for order ${order.id}, using default service`);
    }
    
    // We know this will never be undefined since we fallback to SERVICES[0]
    return service as Service;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="space-y-6 p-4 bg-midnight-900/90 rounded-lg backdrop-blur-sm border border-stone-800/50"
    >
      <div className="flex items-center justify-between">
        <motion.h2 
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          className="text-2xl font-semibold text-stone-200"
        >
          {t('nav.orders')}
        </motion.h2>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowServiceDialog(true)}
          className="px-4 py-2 bg-sunset text-white font-medium rounded-lg 
            shadow-lg hover:bg-sunset/90 transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isCreatingOrder}
        >
          {isCreatingOrder ? (
            <span className="flex items-center space-x-2">
              <FaSpinner className="animate-spin" />
              <span>{t('common.loading')}</span>
            </span>
          ) : (
            t('nav.placeOrder')
          )}
        </motion.button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="flex space-x-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0 }}
              className="w-3 h-3 bg-sunset rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
              className="w-3 h-3 bg-sunset rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
              className="w-3 h-3 bg-sunset rounded-full"
            />
          </div>
          <p className="mt-4 text-stone-400">{t('orders.loading')}</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <p className="text-red-400 mb-2">{error}</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchOrders(userId)}
            className="text-sunset hover:text-sunset/80 underline transition-colors"
          >
            {t('common.retry')}
          </motion.button>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !error && orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-midnight-800/50 rounded-lg border border-stone-800/30"
        >
          <p className="text-stone-400 mb-4">{t('orders.noOrders')}</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowServiceDialog(true)}
            className="text-sunset hover:text-sunset/80 underline transition-colors"
          >
            {t('orders.createFirst')}
          </motion.button>
        </motion.div>
      )}

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {orders.map((order, index) => {
            // Find the corresponding service
            // Try to find service using service_id from the joined services data
            let service: Service | undefined;
            
            // Access services data if it exists in the joined query result
            const serviceName = order.services?.name;
            
            if (serviceName) {
              // Try to match by name from the joined query
              service = SERVICES.find((s: Service) => s.name === serviceName);
            }
            
            // Fallback to first service if we can't find a match
            if (!service) {
              service = SERVICES[0];
              console.warn(`No matching service found for order ${order.id}, using default service`);
            }
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
              >
                <OrderCard
                  order={order}
                  service={service as Service}
                  onClick={() => setSelectedOrder(order)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Service Selection Dialog */}
      <AnimatePresence>
        {showServiceDialog && (
          <ServiceSelectionDialog
            onClose={() => setShowServiceDialog(false)}
            onSelectService={(service: Service) => {
              setSelectedService(service);
              setShowServiceDialog(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Order Details Dialog */}
      <AnimatePresence>
        {selectedService && (
          <OrderDetailsDialog
            service={selectedService}
            onClose={() => setSelectedService(null)}
            onSubmit={handleCreateOrder}
            isSubmitting={isCreatingOrder}
          />
        )}
      </AnimatePresence>

      {/* View Order Dialog */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsDialog
            order={selectedOrder}
            service={findServiceForOrder(selectedOrder)}
            onClose={() => setSelectedOrder(null)}
            onSubmit={handleViewOrder}
            viewOnly
            isDriver={false}
            onCancelOrder={async (_orderId: string) => Promise.resolve()}
            onCompleteOrder={async (_orderId: string) => Promise.resolve()}
            onAcceptOrder={async (_orderId: string) => Promise.resolve()}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Order;
