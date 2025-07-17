import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemText, Button, Paper, CircularProgress, Alert, Tabs, Tab, Badge, Typography } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import { Order } from '../../../../types/order';
import { OrderCard } from '.';
// Chat utilities handled by dashboard context
import { useUser } from '@supabase/auth-helpers-react';

export type OrderStatus = Order['status'];
type TabStatus = 'active' | 'available' | 'completed' | 'cancelled';
type OrderMap = Record<TabStatus, Order[]>;

const ORDER_TABS = {
  active: {
    label: '🔵 Active',
    color: 'primary',
    statuses: ['accepted', 'en_route', 'arrived', 'picked_up', 'delivered'] as Order['status'][]
  },
  available: {
    label: '⏳ Pending',
    color: 'warning',
    statuses: ['pending'] as Order['status'][]
  },
  completed: {
    label: '✅ Completed',
    color: 'success',
    statuses: ['completed'] as Order['status'][] // Only show 'completed' status, not 'delivered'
  },
  cancelled: {
    label: '❌ Cancelled',
    color: 'error',
    statuses: ['cancelled'] as Order['status'][]
  }
} as const;

interface OrderListProps {
  onOrderClick?: (order: Order) => void;
  handleOrderAction?: (orderId: string, action: 'accept' | 'reject') => void;
  handleStatusUpdate?: (orderId: string, newStatus: Order['status']) => void;
  defaultTab?: 'active' | 'available' | 'completed' | 'cancelled';
}

interface DashboardContext {
  // New state structure
  activeOrders: Order[];
  pendingOrders: Order[];
  completedOrders: Order[];
  cancelledOrders: Order[];
  isLoadingActiveOrders: boolean;
  isLoadingPendingOrders: boolean;
  isLoadingCompletedOrders: boolean;
  isLoadingCancelledOrders: boolean;
  
  // Legacy state for backward compatibility
  currentOrders: Order[];
  pastOrders: Order[];
  unacceptedOrders: Order[];
  isLoadingCurrentOrders: boolean;
  isLoadingPastOrders: boolean;
  isLoadingUnacceptedOrders: boolean;
  
  handleOpenChat?: (orderId: string, customerId: string) => Promise<void>;
}

const getTabKey = (index: number): TabStatus => {
  const keys: TabStatus[] = ['active', 'available', 'completed', 'cancelled'];
  return keys[index] || keys[0];
};

function OrderList({ onOrderClick, handleOrderAction, handleStatusUpdate, defaultTab }: OrderListProps) {
  const user = useUser();
  const { 
    // Use new state structure
    activeOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    isLoadingActiveOrders,
    isLoadingPendingOrders,
    isLoadingCompletedOrders,
    isLoadingCancelledOrders,
    
    // Legacy state for backward compatibility
    currentOrders: contextCurrentOrders,
    pastOrders: contextPastOrders,
    unacceptedOrders: contextUnacceptedOrders,
    isLoadingCurrentOrders,
    isLoadingPastOrders,
    isLoadingUnacceptedOrders,
    handleOpenChat,
  } = useOutletContext<DashboardContext>();
  
  // Set initial tab value based on defaultTab prop if provided
  const getInitialTabValue = (): number => {
    if (!defaultTab) return 0;
    const tabIndex = ['active', 'available', 'completed', 'cancelled'].indexOf(defaultTab);
    return tabIndex >= 0 ? tabIndex : 0;
  };
  
  const [tabValue, setTabValue] = useState(getInitialTabValue());
  const [orders, setOrders] = useState<OrderMap | null>(null);

  const currentTabKey = getTabKey(tabValue);
  
  // Determine if we're loading based on current tab
  let isLoading = false;
  if (currentTabKey === 'active') {
    isLoading = isLoadingActiveOrders || isLoadingCurrentOrders;
  } else if (currentTabKey === 'completed') {
    isLoading = isLoadingCompletedOrders || isLoadingPastOrders;
  } else if (currentTabKey === 'cancelled') {
    isLoading = isLoadingCancelledOrders || isLoadingPastOrders;
  } else if (currentTabKey === 'available') {
    isLoading = isLoadingPendingOrders || isLoadingUnacceptedOrders;
  }

  useEffect(() => {
    // Use new state structure first, fall back to legacy state if needed
    const active = activeOrders || contextCurrentOrders?.filter(order => 
      ['accepted', 'en_route', 'arrived', 'picked_up', 'delivered'].includes(order.status)
    ) || [];
    
    const completed = completedOrders || contextPastOrders?.filter(order => 
      order.status === 'completed' // Only show orders with status 'completed'
    ) || [];
    
    const cancelled = cancelledOrders || contextPastOrders?.filter(order => 
      order.status === 'cancelled'
    ) || [];
    
    const available = pendingOrders || contextUnacceptedOrders?.filter(order => 
      order.status === 'pending'
    ) || [];
    
    // Log detailed information about each type of order
    console.log('--- Order Counts in OrderList Component ---');
    console.log(`Active orders: ${active.length}`);
    if (active.length > 0) {
      const statusCounts = active.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Active order status breakdown:', statusCounts);
    }
    
    console.log(`Completed orders: ${completed.length}`);
    if (completed.length > 0) {
      const statusCounts = completed.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Completed order status breakdown:', statusCounts);
    }
    
    console.log(`Cancelled orders: ${cancelled.length}`);
    console.log(`Available orders: ${available.length}`);
    console.log('----------------------------------------');
    
    setOrders({
      active,
      completed,
      cancelled,
      available
    });
  }, [activeOrders, pendingOrders, completedOrders, cancelledOrders, contextCurrentOrders, contextPastOrders, contextUnacceptedOrders]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  const getNoOrdersMessage = (tab: TabStatus): string => {
    switch (tab) {
      case 'active':
        return 'You have no active orders at the moment.';
      case 'completed':
        return 'You have no completed orders.';
      case 'cancelled':
        return 'You have no cancelled orders.';
      case 'available':
        return 'No available orders at the moment.';
      default:
        return '';
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle r
  const handleChatClick = async (orderId: string, customerId: string) => {
    if (!user?.id || !handleOpenChat) return;
    
    // Use the handleOpenChat function from context
    await handleOpenChat(orderId, customerId);
  };



  const showNoOrdersMessage = !orders?.[currentTabKey]?.length;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          {Object.entries(ORDER_TABS).map(([key, { label, color }]) => (
            <Tab
              key={key}
              label={
                <Badge color={color} badgeContent={orders?.[key as TabStatus]?.length || 0}>
                  {label}
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Box>

      {showNoOrdersMessage && !isLoading && (
        <Alert severity="info">{getNoOrdersMessage(currentTabKey)}</Alert>
      )}

      <List>
        {!isLoading && orders?.[currentTabKey]?.map((order) => (
          currentTabKey === 'available' ? (
            <Paper key={order.id} sx={{ mb: 2 }}>
              <ListItem
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  gap: 2,
                  p: 2
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1">
                      Order #{order.id.slice(0, 8)}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        From: {order.pickup_location}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        To: {order.dropoff_location}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Price: ${order.price || order.estimated_price || 0}
                      </Typography>
                    </>
                  }
                />
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: { xs: 'space-between', sm: 'flex-end' },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleOrderAction?.(order.id, 'accept')}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleOrderAction?.(order.id, 'reject')}
                  >
                    Reject
                  </Button>
                </Box>
              </ListItem>
            </Paper>
          ) : (
            <OrderCard 
              key={order.id} 
              order={order} 
              type={currentTabKey} 
              onClick={() => onOrderClick?.(order)}
              onStatusUpdate={(orderId, newStatus) => {
                console.log('Status update requested:', orderId, newStatus);
                handleStatusUpdate?.(orderId, newStatus);
              }}
              onChatClick={handleChatClick}
            />
          )
        ))}
      </List>
    </Box>
  );
}

export default OrderList;
