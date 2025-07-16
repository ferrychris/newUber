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
  Badge
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ChatIcon from '@mui/icons-material/Chat';
import { supabase } from '../../../../utils/supabaseClient';
import OrderMap from './OrderMap';
import { OrderStatusControl } from './OrderStatusControl';
import DriverChatModal from '../Messages/DriverChatModal';
import { updateOrderStatus } from '../../../../utils/orderUtils';

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

const VALID_STATUSES: ValidOrderStatus[] = ['accepted', 'en_route', 'arrived', 'picked_up', 'delivered'];

export default function OrderDetails({ order, open, onClose }: OrderDetailsProps) {
  const navigate = useNavigate();
  const [displayedStatus, setDisplayedStatus] = useState<ValidOrderStatus>('accepted');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('Loading...');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  
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
  


  // Fetch customer name
  useEffect(() => {
    if (!order?.user_id) {
      console.log('No user_id available in order:', order);
      setCustomerName('Unknown Customer');
      return;
    }

    const fetchCustomerName = async () => {
      try {
        console.log('Fetching name for user_id:', order.user_id);

        // Get user by id without using single()
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', order.user_id);

        console.log('User query result:', users, userError);

        // Use the first user if found
        const userData = users?.[0];

        if (userError) {
          console.error('Error fetching user:', userError);
          throw userError;
        }

        if (userData?.full_name) {
          console.log('Found name:', userData.full_name);
          setCustomerName(userData.full_name);
        } else {
          console.log('No name found for ID:', order.user_id);
          setCustomerName('Unknown Customer');
        }
      } catch (error) {
        const err = error as Error;
        console.error('Error in user fetch process:', err);
        setCustomerName('Unknown Customer');
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
    if (order?.status) {
      const status = order.status as ValidOrderStatus;
      if (VALID_STATUSES.includes(status)) {
        setDisplayedStatus(status);
      } else if (status === 'pending' && !isUpdating) {
        // Only update to accepted if we're not in the middle of another update
        setDisplayedStatus('accepted');
        handleStatusUpdate('accepted');
      }
    }
  }, [order?.status]); // Run when order status changes

  // Handle status updates
  const handleStatusUpdate = async (newStatus: ValidOrderStatus) => {
    if (!order) return;

    setIsUpdating(true);
    setError(null);

    try {
      await updateOrderStatus(order.id, newStatus);
      // Status will be updated via real-time subscription
    } catch (error) {
      const err = error as Error;
      setError(err);
      console.error('Error updating order status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

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
                          console.log(`OrderDetails: Status updated to ${newStatus}`);
                          // Let the real-time subscription handle the status update
                          // This prevents race conditions between local and server state
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
