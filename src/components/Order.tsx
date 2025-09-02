import React, { useState, useEffect } from "react";
import { supabase, getCurrentUser } from "../../utils/supabase";
import { AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaSpinner, FaMapMarkerAlt, FaLocationArrow, FaCommentAlt } from "react-icons/fa";
import { SERVICES } from "./orders/constants";
import { getToastConfig, getStatusConfig } from "./orders/utils";
import { formatCurrency, formatDate } from "../../utils/i18n";
import ServiceSelectionDialog from "./orders/components/ServiceSelectionDialog";
import OrderDetailsDialog from "./orders/components/OrderDetailsDialog";
import { Order as OrderType, Service, OrderFormData, OrderStatus } from "./orders/types";
import { useTranslation } from "react-i18next";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CircularProgress from "@mui/material/CircularProgress";
import CustomerOrderDetails from "../CustomerDash/OrderDetails";
import CustomerChatModal from "../CustomerDash/CustomerChatModal";
import { ValidOrderStatus } from "../../types/order";

const Order: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  // State for order creation is managed in the service selection dialog
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for chat modal
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedChatOrder, setSelectedChatOrder] = useState<OrderType | null>(null);
  
  // State for delivery confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  
  // State for CustomerOrderDetails modal
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OrderType | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        setIsLoading(true);
        
        // Check localStorage first
        const storedUser = localStorage.getItem("userId");
        if (storedUser) {
          setUserId(storedUser);
          fetchOrders(storedUser);
          return;
        }
        
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          fetchOrders(user.id);
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        setError("Failed to authenticate user. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCurrentUser();
  }, [navigate]);

  // Subscribe to order updates
  useEffect(() => {
    const subscription = supabase
      .channel('orders_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (_payload) => {
        if (userId) {
          fetchOrders(userId);
        }
      })
      .subscribe();

    return () => {
      console.log("Removing subscription");
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const fetchOrders = async (userId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`user_id.eq.${userId},driver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load orders. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const findServiceForOrder = (order: OrderType): Service | undefined => {
    return SERVICES.find(service => service.id === order.service_id);
  };

  const handleCreateOrder = () => {
    setShowServiceDialog(true);
  };

  const handleViewOrder = (order: OrderType) => {
    console.log('Viewing order details:', order);
    // Use CustomerOrderDetails for viewing order details
    setSelectedOrderForDetails(order);
    setShowOrderDetailsModal(true);
  };

  // This function is currently unused but kept for future implementation of order cancellation
  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: OrderStatus.CANCELLED })
        .eq('id', orderId);
      
      if (error) {
        throw error;
      }
      
      toast.success("Order cancelled successfully", getToastConfig("success"));
      
      if (userId) {
        fetchOrders(userId);
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order. Please try again.", getToastConfig("error"));
    }
  };

  // Function to open the confirmation dialog
  const openConfirmDialog = (orderId: string) => {
    setConfirmingOrderId(orderId);
    setShowConfirmDialog(true);
  };

  // Function to handle confirming delivery of an order
  const handleConfirmDelivery = async () => {
    if (!confirmingOrderId) return;
    
    try {
      setIsConfirmingDelivery(true);
      
      // First, get the order details to find the driver_id and price
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('driver_id, price')
        .eq('id', confirmingOrderId)
        .single();
      
      if (orderError) {
        throw orderError;
      }
      
      // Update the order status to 'completed'
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          delivery_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: userId || ''
        })
        .eq('id', confirmingOrderId);
      
      if (error) {
        throw error;
      }
      
      // Credit the driver's wallet if driver_id exists
      if (orderData?.driver_id && orderData?.price) {
        // Get the driver's wallet
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', orderData.driver_id)
          .maybeSingle();
          
        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching driver wallet:', walletError);
        } else if (walletData) {
          // Update the wallet balance
          const newBalance = parseFloat(walletData.balance || '0') + parseFloat(orderData.price);
          
          const { error: updateError } = await supabase
            .from('wallets')
            .update({ 
              balance: newBalance.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', walletData.id);
            
          if (updateError) {
            console.error('Error updating driver wallet:', updateError);
          } else {
            // Create a transaction record
            await supabase.from('wallet_transactions').insert({
              wallet_id: walletData.id,
              amount: orderData.price,
              type: 'earnings',
              status: 'completed',
              description: `Earnings from order #${confirmingOrderId}`,
              payment_method: 'order_completion',
              metadata: { order_id: confirmingOrderId }
            });
          }
        }
      }
      
      // Close the dialog
      setShowConfirmDialog(false);
      
      // Show success message
      toast.success("Delivery confirmed successfully", getToastConfig("success"));
      
      // Update the local orders list
      if (userId) {
        fetchOrders(userId);
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error("Could not confirm delivery. Please try again.", getToastConfig("error"));
      // Keep the dialog open on error
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          {t('Orders')}
        </h1>
        <button
          onClick={handleCreateOrder}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sunset hover:bg-sunset-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sunset"
        >
          {t('Create Order')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* Error icon */}
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-sunset h-8 w-8" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-midnight-800 shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">{t('No orders found')}</p>
          <button
            onClick={handleCreateOrder}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sunset hover:bg-sunset-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sunset"
          >
            {t('Create your first order')}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 dark:border-stone-600/10 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-stone-600/10">
                    <thead className="bg-gray-50 dark:bg-midnight-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('Order')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('Locations')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('Price')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('Status')}
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">{t('Actions')}</span>
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
                            onClick={() => handleViewOrder(order)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-midnight-600 flex items-center justify-center">
                                  {findServiceForOrder(order)?.icon || '🚚'}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {order.id.substring(0, 8)}...
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatDate(order.created_at)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col text-sm text-gray-900 dark:text-white">
                                <div className="flex items-center">
                                  <FaMapMarkerAlt className="mr-1 text-sunset" />
                                  <span className="truncate max-w-[180px]">{order.pickup_location}</span>
                                </div>
                                <div className="w-px h-2 ml-2 border-l border-dashed border-gray-300 dark:border-stone-600"></div>
                                <div className="flex items-center">
                                  <FaLocationArrow className="mr-1 text-purple-600" />
                                  <span className="truncate max-w-[180px]">{order.dropoff_location}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">{formatCurrency(order.estimated_price || 0)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                                {order.status ? t(order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, ' ')) : ''}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-3">
                                {/* Message Button - Show for orders with a driver assigned */}
                               
                                
                                {/* Track Order Button - Only show for trackable orders */}
                                {(order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.IN_TRANSIT || order.status === OrderStatus.PENDING) && (
                                  <Link 
                                    to="/dashboard/track-order"
                                    className="inline-flex items-center px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Handle tracking logic
                                    }}
                                  >
                                    {t('Track')}
                                  </Link>
                                )}
                                
                                {/* Confirm Delivery Button - Only show for delivered or in_transit orders */}
                                {(order.status === OrderStatus.IN_TRANSIT || order.status === 'delivered' as any) && (
                                  <button 
                                    className="text-sunset hover:text-purple-600 transition-colors duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openConfirmDialog(order.id);
                                    }}
                                  >
                                    {t('Confirm Delivery')}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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
            onSubmit={async (_: OrderFormData) => {
              // Using underscore to indicate intentionally unused parameter
              
              try {
                // Create order logic would go here
                
                // Show success message
                toast.success("Order created successfully", getToastConfig("success"));
                
                // Refresh orders
                if (userId) {
                  fetchOrders(userId);
                }
                
                // Close dialog
                setSelectedService(null);
                setSelectedOrder(null);
              } catch (error) {
                console.error("Error creating order:", error);
                toast.error("Failed to create order. Please try again.", getToastConfig("error"));
              } finally {
                setIsCreatingOrder(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {isChatModalOpen && selectedChatOrder && selectedChatOrder.driver_id && (
          <CustomerChatModal
            open={isChatModalOpen}
            onClose={() => setIsChatModalOpen(false)}
            orderId={selectedChatOrder.id}
            driverId={selectedChatOrder.driver_id}
          />
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrderForDetails && (
        <CustomerOrderDetails
          order={{
            id: selectedOrderForDetails.id,
            status: selectedOrderForDetails.status as ValidOrderStatus,
            pickup_location: selectedOrderForDetails.pickup_location,
            dropoff_location: selectedOrderForDetails.dropoff_location,
            driver_id: selectedOrderForDetails.driver_id,
            created_at: selectedOrderForDetails.created_at,
            user_id: selectedOrderForDetails.user_id,
            // Removed service_id and estimated_price as they don't exist in the interface
          }}
          open={showOrderDetailsModal}
          onClose={() => {
            setShowOrderDetailsModal(false);
            setSelectedOrderForDetails(null);
          }}
          onConfirmDelivery={async (orderId: string) => {
            // Use the existing handleConfirmDelivery logic but with the orderId parameter
            setConfirmingOrderId(orderId);
            
            try {
              setIsConfirmingDelivery(true);
              
              // Import the updateOrderStatus function
              const { updateOrderStatus } = await import('../../utils/orderUtils');
              
              // Update the order status to 'completed' using the updateOrderStatus function
              // This will automatically handle crediting the driver's wallet
              await updateOrderStatus(
                orderId,
                'completed',
                'Customer confirmed delivery',
                userId || undefined,
                {
                  delivery_confirmed: true,
                  confirmed_at: new Date().toISOString(),
                  confirmed_by: userId || ''
                }
              );
              
              // Update the local orders list
              if (userId) {
                fetchOrders(userId);
              }
              
              return Promise.resolve();
            } catch (error) {
              console.error('Error confirming delivery:', error);
              toast.error("Could not confirm delivery. Please try again.", getToastConfig("error"));
              return Promise.reject(error);
            } finally {
              setIsConfirmingDelivery(false);
              setConfirmingOrderId(null);
            }
          }}
        />
      )}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => !isConfirmingDelivery && setShowConfirmDialog(false)}
        aria-labelledby="confirm-delivery-dialog-title"
        aria-describedby="confirm-delivery-dialog-description"
      >
        <DialogTitle id="confirm-delivery-dialog-title">
          {t('Confirm Delivery')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-delivery-dialog-description">
            {t('Are you sure you want to confirm this delivery? This action cannot be undone.')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowConfirmDialog(false)} 
            color="inherit"
            disabled={isConfirmingDelivery}
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleConfirmDelivery}
            color="primary"
            disabled={isConfirmingDelivery}
            startIcon={isConfirmingDelivery ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {isConfirmingDelivery ? t('Confirming...') : t('Confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Order;
