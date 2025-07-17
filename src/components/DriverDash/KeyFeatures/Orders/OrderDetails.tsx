import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ValidOrderStatus } from '../../../../types/order';
import { getUnreadMessageCount } from '../../../../utils/chatUtils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Paper,
  Link,
  Box,
  Grid,
  Stack,
  Skeleton,
  Button,
  Badge,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ChatIcon from '@mui/icons-material/Chat';
import { supabase } from '../../../../utils/supabaseClient';
import OrderMap from './OrderMap';
import OrderStatusControl from './OrderStatusControl';
import DriverChatModal from '../Messages/DriverChatModal';

interface OrderDetailsProps {
  order: {
    id: string;
    status: string;
    user_id: string;
    pickup_location: string;
    dropoff_location: string;
    created_at: string;

    customer_name: string | null;
    customer_phone: string | null;
    base_fare: number;
    distance_fare?: number;
    time_fare?: number;
    total_fare: number;
    payment_method?: string;
    payment_status?: 'pending' | 'completed' | 'failed';
    notes?: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

const VALID_STATUSES: ValidOrderStatus[] = ['pending', 'accepted', 'en_route', 'arrived', 'picked_up', 'delivered', 'completed'];

export default function OrderDetails({ order, open, onClose }: OrderDetailsProps) {
  const navigate = useNavigate();
  const [displayedStatus, setDisplayedStatus] = useState<ValidOrderStatus>(order?.status as ValidOrderStatus || 'pending');
  // Removed unused state variables
  const [customerName, setCustomerName] = useState<string>('Loading...');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  
  // Fetch unread message count for this order
  useEffect(() => {
    if (!order?.id || !open) return;
    
    const fetchUnreadCount = async () => {
      const count = await getUnreadMessageCount(order.id);
      setUnreadCount(count);
    };
    
    fetchUnreadCount();
    
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel(`messages-${order.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${order.id}`,
      }, () => {
        // Refresh unread count when new message arrives
        fetchUnreadCount();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `order_id=eq.${order.id}`,
      }, () => {
        // Also refresh when messages are marked as read
        fetchUnreadCount();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [order?.id, open]);
  


  // Fetch customer name from profiles table
  useEffect(() => {
    if (!order?.user_id) {
      console.log('No user_id available in order:', order);
      setCustomerName('Unknown Customer');
      setProfileLoaded(true); // Mark as loaded even if no user_id
      return;
    }

    const fetchCustomerName = async () => {
      try {
        console.log('Fetching name for user_id:', order.user_id);

        // Get profile by id without using single()
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', order.user_id);

        console.log('Profile query result:', profiles);

        // Use the first profile if found
        const profileData = profiles?.[0];

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }

        if (profileData?.full_name) {
          console.log('Found name:', profileData.full_name);
          setCustomerName(profileData.full_name);
        } else {
          console.log('No name found for ID:', order.user_id);
          setCustomerName('Unknown Customer');
        }
      } catch (error) {
        const err = error as Error;
        console.error('Error in profile fetch process:', err);
        setCustomerName('Unknown Customer');
      } finally {
        setProfileLoaded(true); // Mark profile as loaded regardless of result
      }
    };

    fetchCustomerName();
  }, [order?.user_id]);

  // Format currency for display
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Initialize and sync status with order
  useEffect(() => {
    if (!order?.id) return;
    
    // Always fetch the current status directly from the database
    // This ensures we're showing the true status regardless of local state
    const fetchInitialStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('id', order.id)
          .single();
          
        if (error) {
          console.error('Error fetching initial order status:', error);
          return;
        }
        
        if (data?.status) {
          const dbStatus = data.status as ValidOrderStatus;
          console.log(`Initial status from database: ${dbStatus}`);
          
          if (VALID_STATUSES.includes(dbStatus)) {
            // Update the displayed status to match the database
            setDisplayedStatus(dbStatus);
          } else {
            console.warn(`Invalid status received from database: ${dbStatus}`);
          }
        }
      } catch (err) {
        console.error('Error in initial status fetch:', err);
      } finally {
        setStatusLoaded(true); // Mark status as loaded regardless of result
      }
    };
    
    fetchInitialStatus();
  }, [order?.id]); // Run when order ID changes
  
  // Set up real-time subscription for order status updates
  useEffect(() => {
    if (!order?.id) return;
    
    console.log(`Setting up real-time subscription for order ${order.id} status updates`);
    
    // Initial fetch to ensure we have the latest status
    const fetchCurrentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('id', order.id)
          .single();
          
        if (error) throw error;
        
        if (data && data.status) {
          const dbStatus = data.status as ValidOrderStatus;
          console.log(`Initial status from database: ${dbStatus}`);
          if (VALID_STATUSES.includes(dbStatus)) {
            setDisplayedStatus(dbStatus);
          }
        }
      } catch (err) {
        console.error('Error fetching current order status:', err);
      }
    };
    
    fetchCurrentStatus();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel(`order-status-${order.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${order.id}`,
      }, (payload) => {
        const updatedOrder = payload.new as typeof order;
        if (updatedOrder && updatedOrder.status) {
          const newStatus = updatedOrder.status as ValidOrderStatus;
          console.log(`Received real-time status update: ${newStatus}`);
          if (VALID_STATUSES.includes(newStatus)) {
            setDisplayedStatus(newStatus);
          }
        }
      })
      .subscribe((status) => {
        console.log(`Subscription status for order ${order.id}:`, status);
      });
      
    return () => {
      console.log(`Cleaning up subscription for order ${order.id}`);
      subscription.unsubscribe();
    };
  }, [order?.id]);

  // Note: Direct status updates are now handled by the OrderStatusControl component
  // We rely on the real-time subscription to keep the UI in sync with the database
  
  // Update overall loading state when all data is loaded
  useEffect(() => {
    if (profileLoaded && statusLoaded) {
      console.log('All data loaded, setting isLoading to false');
      setIsLoading(false);
    }
  }, [profileLoaded, statusLoaded]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        aria-labelledby="order-details-dialog-title"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Order Details</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Loading order details...
            </Typography>
          </Box>
        ) : (
        <Grid container spacing={3}>
          {order ? (
            <>
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  {/* Customer Details */}
                  <Paper elevation={1} sx={{ p: 3 }}>
                    <Typography variant="h6">Customer Details</Typography>
                    <div className="mt-2 space-y-2">
                      <div>
                        <Typography variant="subtitle2" color="textSecondary">
                          Customer
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                          {order.customer_name || customerName}
                        </Typography>
                      </div>
                      {order.customer_phone && (
                        <div>
                          <Typography variant="subtitle2" color="textSecondary">
                            Contact
                          </Typography>
                          <Link href={`tel:${order.customer_phone}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneIcon fontSize="small" />
                            <span>{order.customer_phone}</span>
                          </Link>
                        </div>
                      )}
                      <div>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={
                            <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
                              <ChatIcon />
                            </Badge>
                          }
                          onClick={() => {
                            setIsChatModalOpen(true);
                          }}
                          sx={{ mt: 2 }}
                          fullWidth
                        >
                          Chat with Customer {unreadCount > 0 && `(${unreadCount})`}
                        </Button>
                      </div>
                      {order.base_fare && (
                        <div>
                          <Typography variant="subtitle2" color="textSecondary">
                            Base Fare
                          </Typography>
                          <Typography>{formatPrice(order.base_fare)}</Typography>
                        </div>
                      )}
                      {order.payment_method && (
                        <div>
                          <Typography variant="subtitle2" color="textSecondary">
                            Payment Method
                          </Typography>
                          <Typography>{order.payment_method}</Typography>
                        </div>
                      )}
                      {order.payment_status && (
                        <div>
                          <Typography variant="subtitle2" color="textSecondary">
                            Payment Status
                          </Typography>
                          <Typography color={order.payment_status === 'completed' ? 'success' : order.payment_status === 'failed' ? 'error' : 'warning'}>
                            {order.payment_status}
                          </Typography>
                        </div>
                      )}
                    </div>
                  </Paper>

                  {/* Locations */}
                  <Paper elevation={1} sx={{ p: 3 }}>
                    <Typography variant="h6">Locations</Typography>
                    <div className="mt-2 space-y-2">
                      <div>
                        <Typography variant="subtitle2" color="textSecondary">
                          Pickup Location
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOnIcon color="primary" />
                          <Typography>{order.pickup_location}</Typography>
                        </Box>
                      </div>
                      <div>
                        <Typography variant="subtitle2" color="textSecondary">
                          Dropoff Location
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOnIcon color="success" />
                          <Typography>{order.dropoff_location}</Typography>
                        </Box>
                      </div>
                    </div>
                  </Paper>

                  {/* Status */}
                  <Paper elevation={1} sx={{ p: 3 }}>
                    <Typography variant="h6">Status</Typography>
                    <div className="mt-2">
                      <OrderStatusControl 
                        orderId={order.id}
                        currentStatus={displayedStatus}
                        onStatusUpdate={(_orderId: string, newStatus: ValidOrderStatus) => {
                          console.log(`OrderDetails: Status update received: ${newStatus}`);
                          // Don't update local state here - let the database subscription handle it
                          // This ensures we always show the actual status from the database
                          // and prevents UI from getting out of sync with the actual data
                        }}
                      />
                    </div>
                  </Paper>

                  {/* Notes */}
                  {order.notes && (
                    <Paper elevation={1} sx={{ p: 3 }}>
                      <Typography variant="h6">Notes</Typography>
                      <div className="mt-2">
                        <Typography>{order.notes}</Typography>
                      </div>
                    </Paper>
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ height: '400px', overflow: 'hidden' }}>
                  <OrderMap
                    pickupLocation={order.pickup_location}
                    dropoffLocation={order.dropoff_location}
                  />
                </Paper>
              </Grid>
            </>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  <Paper elevation={1} sx={{ p: 3 }}>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="80%" />
                  </Paper>
                  <Paper elevation={1} sx={{ p: 3 }}>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="rectangular" height={100} />
                  </Paper>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ height: '400px' }}>
                  <Skeleton variant="rectangular" height="100%" />
                </Paper>
              </Grid>
            </Grid>
          )}
        </Grid>
        )}
      </DialogContent>
    </Dialog>

    {/* Driver Chat Modal */}
    {order && (
      <DriverChatModal
        open={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        orderId={order.id}
        customerId={order.user_id}
        orderInfo={{
          id: order.id,
          pickup_location: order.pickup_location,
          dropoff_location: order.dropoff_location,
          status: order.status,
          customer_name: order.customer_name || undefined
        }}
      />
    )}
    </>
  );
}
