import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../../context/AuthContext';
import { DriverNavBar } from './DriverNavBar';
import { Sidebar } from './Sidebar';
import { OrderAction } from './types';
import { supabase } from '../../lib/supabaseClient';
import { fetchOrdersByStatus } from '../../utils/orderUtils';
import { Order, ValidOrderStatus } from '../../types/order';

export const DriverDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [totalOrders, setTotalOrders] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'orders' | 'messages' | 'settings'>('dashboard');
  
  // Orders state by status
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);
  
  // Loading states
  const [isLoadingActiveOrders, setIsLoadingActiveOrders] = useState(false);
  const [isLoadingPendingOrders, setIsLoadingPendingOrders] = useState(false);
  const [isLoadingCompletedOrders, setIsLoadingCompletedOrders] = useState(false);
  const [isLoadingCancelledOrders, setIsLoadingCancelledOrders] = useState(false);
  
  // For backward compatibility with existing components
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [unacceptedOrders, setUnacceptedOrders] = useState<Order[]>([]);
  const [isLoadingCurrentOrders, setIsLoadingCurrentOrders] = useState(false);
  const [isLoadingPastOrders, setIsLoadingPastOrders] = useState(false);
  const [isLoadingUnacceptedOrders, setIsLoadingUnacceptedOrders] = useState(false);
  
  // Fetch active orders (accepted, en_route, arrived, picked_up)
  const fetchActiveOrders = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingActiveOrders(true);
    setIsLoadingCurrentOrders(true); // For backward compatibility
    
    try {
      const activeStatuses: ValidOrderStatus[] = ['accepted', 'en_route', 'arrived', 'picked_up'];
      const { data, error } = await fetchOrdersByStatus(user.id, activeStatuses);
      
      if (error) throw error;
      
      const orders = data || [];
      console.log(`Found ${orders.length} active orders`);
      
      // Update both new and legacy state
      setActiveOrders(orders);
      setCurrentOrders(orders);
      
      // Update total orders count
      setTotalOrders(orders.length);
    } catch (err) {
      console.error('Error fetching active orders:', err);
      toast.error('Failed to load active orders');
      setActiveOrders([]);
      setCurrentOrders([]);
    } finally {
      setIsLoadingActiveOrders(false);
      setIsLoadingCurrentOrders(false);
    }
  }, [user]);
  
  // Fetch completed orders (delivered)
  const fetchCompletedOrders = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingCompletedOrders(true);
    
    try {
      const { data, error } = await fetchOrdersByStatus(user.id, ['delivered'] as ValidOrderStatus[]);
      
      if (error) throw error;
      
      const orders = data || [];
      console.log(`Found ${orders.length} completed orders`);
      setCompletedOrders(orders);
      
      // Update pastOrders for backward compatibility
      updatePastOrdersState();
    } catch (err) {
      console.error('Error fetching completed orders:', err);
      toast.error('Failed to load completed orders');
      setCompletedOrders([]);
    } finally {
      setIsLoadingCompletedOrders(false);
      // Only set isLoadingPastOrders to false if cancelled orders are also done loading
      if (!isLoadingCancelledOrders) {
        setIsLoadingPastOrders(false);
      }
    }
  }, [user]);
  
  // Fetch cancelled orders
  const fetchCancelledOrders = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingCancelledOrders(true);
    
    try {
      const { data, error } = await fetchOrdersByStatus(user.id, ['cancelled'] as ValidOrderStatus[]);
      
      if (error) throw error;
      
      const orders = data || [];
      console.log(`Found ${orders.length} cancelled orders`);
      setCancelledOrders(orders);
      
      // Update pastOrders for backward compatibility
      updatePastOrdersState();
    } catch (err) {
      console.error('Error fetching cancelled orders:', err);
      toast.error('Failed to load cancelled orders');
      setCancelledOrders([]);
    } finally {
      setIsLoadingCancelledOrders(false);
      // Only set isLoadingPastOrders to false if completed orders are also done loading
      if (!isLoadingCompletedOrders) {
        setIsLoadingPastOrders(false);
      }
    }
  }, [user]);
  
  // Helper function to update pastOrders state for backward compatibility
  const updatePastOrdersState = useCallback(() => {
    setIsLoadingPastOrders(true);
    const combinedPastOrders = [...completedOrders, ...cancelledOrders];
    setPastOrders(combinedPastOrders);
    setIsLoadingPastOrders(false);
  }, [completedOrders, cancelledOrders]);
  
  // Fetch pending orders that need driver assignment
  const fetchPendingOrders = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingPendingOrders(true);
    setIsLoadingUnacceptedOrders(true); // For backward compatibility
    
    try {
      // For pending orders, we want both assigned and unassigned orders
      // First, get orders assigned to this driver with pending status
      const { data: assignedData, error: assignedError } = await fetchOrdersByStatus(user.id, ['pending'] as ValidOrderStatus[]);
      
      if (assignedError) throw assignedError;
      
      // Then get unassigned pending orders (no driver_id)
      const { data: unassignedData, error: unassignedError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false });
      
      if (unassignedError) throw unassignedError;
      
      // Combine both sets of orders
      const assigned = assignedData || [];
      const unassigned = unassignedData || [];
      const allPendingOrders = [...assigned, ...unassigned];
      
      console.log(`Found ${assigned.length} pending orders assigned to driver`);
      console.log(`Found ${unassigned.length} pending orders available for assignment`);
      
      setPendingOrders(allPendingOrders);
      setUnacceptedOrders(unassigned); // For backward compatibility
    } catch (err) {
      console.error('Error fetching pending orders:', err);
      toast.error('Failed to load pending orders');
      setPendingOrders([]);
      setUnacceptedOrders([]);
    } finally {
      setIsLoadingPendingOrders(false);
      setIsLoadingUnacceptedOrders(false);
    }
  }, [user]);
  
  // Handle status updates
  const handleStatusUpdate = useCallback(async (orderId: string, newStatus: Order['status']) => {
    try {
      console.log('Updating order status:', orderId, newStatus);
      
      // Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Send status as order_status type
      const { error } = await supabase.rpc('update_order_status_v2', {
        p_order_id: orderId,
        p_new_status: newStatus as Order['status']
      });

      if (error) throw error;

      // Refresh all order lists based on the new status
      if (['accepted', 'en_route', 'arrived', 'picked_up'].includes(newStatus)) {
        fetchActiveOrders();
      } else if (newStatus === 'delivered') {
        fetchCompletedOrders();
      } else if (newStatus === 'cancelled') {
        fetchCancelledOrders();
      } else if (newStatus === 'pending') {
        fetchPendingOrders();
      }

      toast.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error('Failed to update order status');
    }
  }, [fetchActiveOrders, fetchCompletedOrders, fetchCancelledOrders, fetchPendingOrders]);

  // Handle order actions
  const handleOrderAction = useCallback(async (orderId: string, action: OrderAction) => {
    try {
      // Check if the order exists
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (orderError) throw orderError;
      
      // Log the order data for debugging
      console.log('Order being updated:', orderData);
      
      let newStatus = '';
      let updateData: any = {};
      
      // Determine the new status based on the action
      switch (action) {
        case 'accept':
          newStatus = 'accepted';
          // When accepting an unassigned order, assign it to this driver
          if (!orderData.driver_id) {
            updateData.driver_id = user?.id;
          }
          break;
        case 'complete':
          newStatus = 'completed';
          break;
        case 'cancel':
          newStatus = 'cancelled';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
      }
      
      if (!newStatus) {
        throw new Error('Invalid action');
      }
      
      // Update the order status and other fields
      updateData.status = newStatus;
      updateData.updated_at = new Date();
      
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (updateError) throw updateError;
      
      // Refresh all order lists
      await Promise.all([
        fetchActiveOrders(),
        fetchCompletedOrders(),
        fetchCancelledOrders(),
        fetchPendingOrders()
      ]);
      
      toast.success(`Order ${action} successful!`);
    } catch (err) {
      console.error('Error handling order action:', err);
      toast.error('Failed to update order');
    }
  }, [fetchActiveOrders, fetchCompletedOrders, fetchCancelledOrders, fetchPendingOrders, user]);
  
  // Set active section based on current path
  useEffect(() => {
    const path = location.pathname;
    
    if (path.includes('/driver/orders')) {
      setActiveSection('orders');
    } else if (path.includes('/driver/messages')) {
      setActiveSection('messages');
    } else if (path.includes('/driver/settings')) {
      setActiveSection('settings');
    } else {
      setActiveSection('dashboard');
    }
  }, [location]);
  
  // Fetch all order types on component mount
  useEffect(() => {
    if (user) {
      fetchActiveOrders();
      fetchCompletedOrders();
      fetchCancelledOrders();
      fetchPendingOrders();
    }
  }, [user, fetchActiveOrders, fetchCompletedOrders, fetchCancelledOrders, fetchPendingOrders]);

  // Handle navigation between sections
  const handleNavigate = (section: 'dashboard' | 'orders' | 'messages' | 'settings') => {
    setActiveSection(section);
    
    switch (section) {
      case 'dashboard':
        navigate('/driver/dashboard');
        break;
      case 'orders':
        navigate('/driver/orders');
        break;

      case 'messages':
        navigate('/driver/messages');
        break;
      case 'settings':
        navigate('/driver/settings');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] overflow-hidden">
      <DriverNavBar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        driverName={user?.email?.split('@')[0] || 'Driver'}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />
      
      <main className="flex-1 p-8 pt-24 ml-0 lg:ml-64 transition-all duration-300">
        <Outlet context={{ 
          // New state
          activeOrders,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          isLoadingActiveOrders,
          isLoadingPendingOrders,
          isLoadingCompletedOrders,
          isLoadingCancelledOrders,
          
          // Legacy state for backward compatibility
          totalOrders,
          currentOrders,
          pastOrders,
          unacceptedOrders,
          isLoadingCurrentOrders,
          isLoadingPastOrders,
          isLoadingUnacceptedOrders,
          
          // Actions
          handleOrderAction,
          handleStatusUpdate,
          user
        }} />
      </main>
    </div>
  );
};
