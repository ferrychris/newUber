import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  CircularProgress,
  Box,
  Divider,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Circle as StatusIcon
} from '@mui/icons-material';
import { supabase } from '../../../../utils/supabase';
import { useUser } from '@supabase/auth-helpers-react';

interface ChatSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectChat: (orderId: string, customerId: string) => void;
}

interface OrderWithCustomer {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  customer_id: string;
  customer_name: string;
  customer_image?: string;
  has_unread_messages?: boolean;
}

const ChatSelectionModal: React.FC<ChatSelectionModalProps> = ({
  open,
  onClose,
  onSelectChat
}) => {
  const user = useUser();
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch active orders with customer info
  useEffect(() => {
    if (!open || !user?.id) return;

    const fetchOrdersWithCustomers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get active orders for this driver (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, pickup_location, dropoff_location, status, customer_id')
          .eq('driver_id', user.id)
          .gt('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        
        if (!ordersData || ordersData.length === 0) {
          setOrders([]);
          setFilteredOrders([]);
          setIsLoading(false);
          return;
        }

        // Get unread messages
        const { data: unreadMessagesData } = await supabase
          .from('messages')
          .select('order_id')
          .eq('receiver_id', user.id)
          .eq('read', false);
        
        const unreadMessagesByOrder: Record<string, boolean> = {};
        if (unreadMessagesData) {
          unreadMessagesData.forEach(msg => {
            unreadMessagesByOrder[msg.order_id] = true;
          });
        }
        
        // Get customer info for each order
        const customerIds = [...new Set(ordersData.map(order => order.customer_id))];
        
        const { data: customersData, error: customersError } = await supabase
          .from('profiles')
          .select('id, full_name, profile_image')
          .in('id', customerIds);
          
        if (customersError) throw customersError;
        
        // Create a lookup for customer information
        const customerLookup: Record<string, { full_name: string; profile_image?: string }> = {};
        if (customersData) {
          customersData.forEach(customer => {
            customerLookup[customer.id] = {
              full_name: customer.full_name || 'Unknown Customer',
              profile_image: customer.profile_image
            };
          });
        }
        
        // Combine order and customer data
        const ordersWithCustomers: OrderWithCustomer[] = ordersData.map(order => ({
          id: order.id,
          pickup_location: order.pickup_location || 'Unknown location',
          dropoff_location: order.dropoff_location || 'Unknown destination',
          status: order.status,
          customer_id: order.customer_id,
          customer_name: customerLookup[order.customer_id]?.full_name || 'Unknown Customer',
          customer_image: customerLookup[order.customer_id]?.profile_image,
          has_unread_messages: !!unreadMessagesByOrder[order.id]
        }));
        
        setOrders(ordersWithCustomers);
        setFilteredOrders(ordersWithCustomers);
      } catch (err) {
        console.error('Error fetching orders and customers:', err);
        setError('Failed to load recent orders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrdersWithCustomers();
  }, [open, user?.id]);

  // Handle search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(order => 
      order.customer_name.toLowerCase().includes(query) ||
      order.pickup_location.toLowerCase().includes(query) ||
      order.dropoff_location.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)
    );
    
    setFilteredOrders(filtered);
  }, [searchQuery, orders]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in progress':
      case 'active':
        return '#4caf50'; // Green
      case 'pending':
        return '#ff9800'; // Orange
      case 'completed':
        return '#2196f3'; // Blue
      case 'cancelled':
        return '#f44336'; // Red
      default:
        return '#9e9e9e'; // Gray
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        pb: 1
      }}>
        <Typography variant="h6">Select a conversation</Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <TextField
          fullWidth
          placeholder="Search by customer, location or order ID..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : filteredOrders.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <Typography color="textSecondary">
              {searchQuery ? 'No orders match your search' : 'No recent orders found'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredOrders.map((order, index) => (
              <React.Fragment key={order.id}>
                <ListItem 
                  component="div"
                  alignItems="flex-start" 
                  onClick={() => onSelectChat(order.id, order.customer_id)}
                  sx={{ 
                    py: 1.5, 
                    px: 2,
                    bgcolor: order.has_unread_messages ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)'
                    },
                    cursor: 'pointer'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      src={order.customer_image || undefined}
                      alt={order.customer_name}
                      sx={{ 
                        position: 'relative',
                        border: order.has_unread_messages ? '2px solid #1976d2' : 'none' 
                      }}
                    >
                      {order.customer_name[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography 
                          variant="subtitle1" 
                          component="span"
                          fontWeight={order.has_unread_messages ? 700 : 400}
                        >
                          {order.customer_name}
                        </Typography>
                        <Box display="flex" alignItems="center">
                          <StatusIcon 
                            sx={{ 
                              fontSize: 12, 
                              mr: 0.5, 
                              color: getStatusColor(order.status) 
                            }} 
                          />
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            fontWeight={order.has_unread_messages ? 600 : 400}
                          >
                            {order.status}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <>
                        <Box display="flex" alignItems="center" mt={0.5}>
                          <LocationIcon color="action" sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography 
                            variant="body2" 
                            color="textSecondary" 
                            noWrap 
                            sx={{ maxWidth: '90%' }}
                            fontWeight={order.has_unread_messages ? 600 : 400}
                          >
                            {order.pickup_location}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center">
                          <LocationIcon color="action" sx={{ fontSize: 16, mr: 0.5, visibility: 'hidden' }} />
                          <Typography 
                            variant="body2" 
                            color="textSecondary" 
                            noWrap 
                            sx={{ maxWidth: '90%' }}
                            fontWeight={order.has_unread_messages ? 600 : 400}
                          >
                            {order.dropoff_location}
                          </Typography>
                        </Box>
                      </>
                    }
                  />
                </ListItem>
                {index < filteredOrders.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatSelectionModal;
