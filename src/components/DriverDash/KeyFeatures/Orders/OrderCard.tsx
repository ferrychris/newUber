import React, { useState } from 'react';
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
  Payment as PaymentIcon,
  Chat as ChatIcon,
  CheckCircle as CheckCircleIcon,
  DirectionsCar as DirectionsCarIcon,
  LocalShipping as LocalShippingIcon,
  Home as HomeIcon,
  DoneAll as DoneAllIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { Order } from '../../../../types/order';
import { formatCurrency } from './utils';
import DriverChatModal from '../../KeyFeatures/Messages/DriverChatModal';
import { getUnreadMessageCount } from '../../../../utils/chatUtils';
import { supabase } from '../../../../lib/supabaseClient';

export interface OrderCardProps {
  order: Order;
  type: 'active' | 'completed' | 'cancelled' | 'available';
  onClick?: () => void;
  onStatusUpdate?: (orderId: string, newStatus: Order['status']) => void;
  onChatClick?: (orderId: string, customerId: string) => void;
}

type StatusConfigKey = 'pending' | 'accepted' | 'en_route' | 'arrived' | 'picked_up' | 'delivered' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<StatusConfigKey, {
  color: string;
  label: string;
  nextStatus: string | null;
  nextLabel: string | null;
  icon: JSX.Element;
}> = {
  pending: { color: 'warning', label: 'Pending', nextStatus: 'accepted', nextLabel: 'Accept Order', icon: <PendingIcon /> },
  accepted: { color: 'info', label: 'Accepted', nextStatus: 'en_route', nextLabel: 'Start Delivery', icon: <CheckCircleIcon /> },
  en_route: { color: 'info', label: 'En Route', nextStatus: 'arrived', nextLabel: 'Mark Arrived', icon: <DirectionsCarIcon /> },
  arrived: { color: 'info', label: 'Arrived', nextStatus: 'picked_up', nextLabel: 'Confirm Pickup', icon: <LocationOnIcon /> },
  picked_up: { color: 'info', label: 'Picked Up', nextStatus: 'delivered', nextLabel: 'Complete Delivery', icon: <LocalShippingIcon /> },
  delivered: { color: 'primary', label: 'Delivered', nextStatus: null, nextLabel: null, icon: <HomeIcon /> },
  completed: { color: 'success', label: 'Completed', nextStatus: null, nextLabel: null, icon: <DoneAllIcon /> },
  cancelled: { color: 'error', label: 'Cancelled', nextStatus: null, nextLabel: null, icon: <CancelIcon /> }
};

export default function OrderCard({ 
  order, 
  onClick, 
  onStatusUpdate, 
  onChatClick 
}: OrderCardProps) {
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
  
  // Status update is now handled directly by the parent component

  return (
    <Box>
      <Card
        sx={{
          mb: 1.5, // Reduced margin bottom
          cursor: 'pointer',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)', // Reduced hover effect
            boxShadow: 2
          },
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderLeft: (theme) => {
            if (order.status === 'cancelled') {
              return `4px solid ${theme.palette.error.main}`;
            } else if (order.status === 'completed') {
              return `4px solid ${theme.palette.success.main}`;
            } else if (order.status === 'delivered') {
              return `4px solid ${theme.palette.primary.main}`;
            } else {
              return `4px solid ${theme.palette.grey[300]}`;
            }
          },
          // Reduce overall padding
          '& .MuiCardContent-root': {
            padding: '12px', // Reduced padding
            '&:last-child': {
              paddingBottom: '12px'
            }
          }
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}> {/* Reduced margin */}
            <Typography variant="subtitle1" component="div"> {/* Changed from h6 to subtitle1 */}
              Order #{order.id.slice(0, 8)}
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}> {/* Reduced gap */}
              {unreadCount > 0 && (
                <Badge badgeContent={unreadCount} color="error" sx={{ mr: 0.5 }}>
                  <ChatIcon fontSize="small" color="action" /> {/* Smaller icon */}
                </Badge>
              )}
              <Chip 
                size="small" /* Smaller chip */
                label={(order.status in STATUS_CONFIG) ? STATUS_CONFIG[order.status as StatusConfigKey].label : order.status.toUpperCase()}
                sx={{ 
                  backgroundColor: (order.status in STATUS_CONFIG) ? STATUS_CONFIG[order.status as StatusConfigKey].color : '#757575',
                  color: 'white',
                  height: '24px', // Smaller height
                  '& .MuiChip-label': {
                    padding: '0 8px',
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Box>
          </Box>
          
          {/* Two-column layout for pickup and dropoff */}
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Box flex={1}>
              <Box display="flex" alignItems="center">
                <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} /> {/* Smaller icon */}
                <Typography variant="caption" color="text.secondary"> {/* Smaller text */}
                  From: 
                </Typography>
              </Box>
              <Typography variant="body2" noWrap sx={{ maxWidth: '95%', pl: 3 }}>
                {order.pickup_location}
              </Typography>
            </Box>
            
            <Box flex={1}>
              <Box display="flex" alignItems="center">
                <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} /> {/* Smaller icon */}
                <Typography variant="caption" color="text.secondary"> {/* Smaller text */}
                  To: 
                </Typography>
              </Box>
              <Typography variant="body2" noWrap sx={{ maxWidth: '95%', pl: 3 }}>
                {order.dropoff_location}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center">
              <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} /> {/* Smaller icon */}
              <Typography variant="caption" color="text.secondary"> {/* Smaller text */}
                {new Date(order.created_at).toLocaleString()}
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" sx={{ bgcolor: 'background.paper', p: 0.5, borderRadius: 1, boxShadow: 1 }}>
              <PaymentIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
              {order.status === 'completed' ? (
                <Box display="flex" flexDirection="column">
                  <Typography variant="body1" fontWeight="bold" color="success.main">
                    {formatCurrency(order.price || order.actual_price || order.estimated_price || 0)}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    Added to wallet
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  {formatCurrency(order.price || order.actual_price || order.estimated_price || 0)}
                </Typography>
              )}
            </Box>
          </Box>
        {/* Action bar for all orders */}
        <Box mt={1} display="flex" gap={0.5} justifyContent="flex-end"> {/* Reduced margin and gap */}
          {/* Chat with Customer Button - available for all orders */}
          <Chip
            icon={<ChatIcon fontSize="small" />} /* Smaller icon */
            label="Chat"
            size="small"
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
              height: '24px',
              '&:hover': {
                backgroundColor: theme.palette.info.light
              }
            }}
          />
          
          {/* Status Update Button - only for orders that are not delivered */}
          {onStatusUpdate && 
           (order.status in STATUS_CONFIG) && 
           STATUS_CONFIG[order.status as StatusConfigKey].nextStatus && 
           order.status !== 'delivered' && (
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
          
          {/* Status indicator for delivered orders */}
          {order.status === 'delivered' && (
            <Chip
              label="Delivered"
              size="small"
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                height: '24px',
                cursor: 'default'
              }}
            />
          )}
          
          {/* Status indicator for completed orders */}
          {order.status === 'completed' && (
            <Chip
              label="Completed"
              size="small"
              sx={{
                backgroundColor: theme.palette.success.main,
                color: 'white',
                height: '24px',
                cursor: 'default'
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
