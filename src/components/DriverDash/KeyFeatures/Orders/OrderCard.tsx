import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Badge,
  useTheme
} from '@mui/material';
import { 
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { Order } from '../../../../types/order';
import { formatCurrency } from './utils';
import DriverChatModal from '../../KeyFeatures/Messages/DriverChatModal';
import { useUser } from '@supabase/auth-helpers-react';
// Import the updateOrderStatus function from the utils file we created
import { updateOrderStatus } from '../../../../utils/orderUtils';
import { getUnreadMessageCount } from '../../../../utils/chatUtils';
import { supabase } from '../../../../lib/supabaseClient';

export interface OrderCardProps {
  order: Order;
  type: 'active' | 'completed' | 'cancelled' | 'available';
  onClick?: () => void;
  onStatusUpdate?: (orderId: string, newStatus: Order['status']) => void;
  onChatClick?: (orderId: string, customerId: string) => void;
}

type StatusConfigKey = 'accepted' | 'en_route' | 'arrived' | 'picked_up' | 'delivered';

const STATUS_CONFIG: Record<StatusConfigKey, {
  color: string;
  label: string;
  nextStatus: string | null;
  nextLabel: string | null;
}> = {
  accepted: { color: '#2196f3', label: 'Accepted', nextStatus: 'en_route', nextLabel: 'Start Delivery' },
  en_route: { color: '#3f51b5', label: 'En Route', nextStatus: 'arrived', nextLabel: 'Mark Arrived' },
  arrived: { color: '#9c27b0', label: 'Arrived', nextStatus: 'picked_up', nextLabel: 'Confirm Pickup' },
  picked_up: { color: '#009688', label: 'Picked Up', nextStatus: 'delivered', nextLabel: 'Complete Delivery' },
  delivered: { color: '#4caf50', label: 'Delivered', nextStatus: null, nextLabel: null },
};

export default function OrderCard({ 
  order, 
  onClick, 
  onStatusUpdate, 
  onChatClick 
}: OrderCardProps) {
  const user = useUser();
  const theme = useTheme();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Fetch unread message count for this order
  React.useEffect(() => {
    if (!order?.id) return;
    
    const fetchUnreadCount = async () => {
      const count = await getUnreadMessageCount(order.id);
      setUnreadCount(count);
    };
    
    // If order doesn't have customer_id or user_id, fetch the customer from orders table
    const fetchCustomerId = async () => {
      if (!order.customer_id && !order.user_id) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('user_id')
            .eq('id', order.id)
            .single();
            
          if (error) throw error;
          if (data?.user_id) {
            setCustomerId(data.user_id);
          }
        } catch (err) {
          console.error('Error fetching customer ID for order:', err);
        }
      } else if (order.customer_id) {
        setCustomerId(order.customer_id);
      } else if (order.user_id) {
        setCustomerId(order.user_id);
      }
    };
    
    fetchCustomerId();
    
    fetchUnreadCount();
    
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel(`support-messages-card-${order.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `order_id=eq.${order.id}`,
      }, () => {
        // Refresh unread count when new message arrives
        fetchUnreadCount();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_messages',
        filter: `order_id=eq.${order.id}`,
      }, () => {
        // Also refresh when messages are marked as read
        fetchUnreadCount();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [order?.id]);
  
  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      console.log('Updating order status:', orderId, newStatus);
      await updateOrderStatus(orderId, newStatus);
      if (onStatusUpdate) {
        onStatusUpdate(orderId, newStatus);
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  return (
    <Box>
      <Card 
        sx={{ 
          mb: 2, 
          cursor: 'pointer',
          '&:hover': {
            boxShadow: theme.shadows[4]
          }
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" component="div">
              Order #{order.id.slice(0, 8)}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {unreadCount > 0 && (
                <Badge badgeContent={unreadCount} color="error">
                  <ChatIcon color="action" />
                </Badge>
              )}
              <Chip 
                label={(order.status in STATUS_CONFIG) ? STATUS_CONFIG[order.status as StatusConfigKey].label : order.status.toUpperCase()}
                sx={{ 
                  backgroundColor: (order.status in STATUS_CONFIG) ? STATUS_CONFIG[order.status as StatusConfigKey].color : '#757575',
                  color: 'white'
                }}
              />
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" mb={1}>
            <PersonIcon sx={{ mr: 1 }} />
            <Typography variant="body2">
              {order.customer_name}
            </Typography>
          </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <LocationOnIcon sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            From: {order.pickup_location}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <LocationOnIcon sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            To: {order.dropoff_location}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <AccessTimeIcon sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {new Date(order.created_at).toLocaleString()}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center">
            <PaymentIcon sx={{ mr: 1 }} />
            <Typography variant="body1" fontWeight="bold">
              {formatCurrency(order.price || order.estimated_price || 0)}
            </Typography>
          </Box>
        </Box>
        <Box mt={2} display="flex" gap={1} justifyContent="space-between">
          {/* Chat with Customer Button */}
          <Chip
            icon={<ChatIcon />}
            label={`Chat with ${order.customer_name || 'Customer'}`}
            color="info"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              
              // Use the customerId from state, which is populated from order.customer_id,
              // order.user_id, or fetched from the database
              const customerIdToUse = customerId || order.customer_id || order.user_id;
              
              if (customerIdToUse) {
                console.log('Starting chat with customer:', customerIdToUse);
                
                // Set order info for the chat modal
                setOrderInfo({
                  id: order.id,
                  pickup_location: order.pickup_location,
                  dropoff_location: order.dropoff_location,
                  status: order.status
                });
                
                // Set customer ID and open modal
                setCustomerId(customerIdToUse);
                setIsChatModalOpen(true);
                
                // Also call the parent handler if provided
                if (onChatClick) {
                  onChatClick(order.id, customerIdToUse);
                }
              } else {
                console.error('Cannot start chat: No customer ID available');
              }
            }}
            sx={{
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.9,
                transform: 'scale(1.02)'
              }
            }}
          />
          
          {/* Status Update Button */}
          {onStatusUpdate && (order.status in STATUS_CONFIG) && STATUS_CONFIG[order.status as StatusConfigKey].nextStatus && (
            <Chip
              label={STATUS_CONFIG[order.status as StatusConfigKey].nextLabel}
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                if (onStatusUpdate && STATUS_CONFIG[order.status as StatusConfigKey].nextStatus) {
                  onStatusUpdate(order.id, STATUS_CONFIG[order.status as StatusConfigKey].nextStatus as Order['status']);
                }
              }}
              sx={{
                backgroundColor: STATUS_CONFIG[order.status as StatusConfigKey].color,
                color: 'white',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.9,
                  transform: 'scale(1.02)'
                }
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
      
    {/* Driver Chat Modal */}
    {customerId && (
      <DriverChatModal
        open={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        orderId={order.id}
        customerId={customerId}
        orderInfo={{
          id: order.id,
          pickup_location: order.pickup_location,
          dropoff_location: order.dropoff_location,
          status: order.status
        }}
      />
    )}
  </Box>
  );
}
