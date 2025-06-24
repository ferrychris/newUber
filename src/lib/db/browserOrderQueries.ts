import { supabase } from '../supabaseClient';
import { Order, OrderStatus } from '../../components/DriverDash/types';

// Browser-safe order queries using Supabase client
const getPastOrdersByDriverId = async (driverId: string): Promise<Order[]> => {
  // Validate driver ID
  if (!driverId || typeof driverId !== 'string' || driverId.trim() === '') {
    console.error('Invalid driver ID provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        driver_id,
        pickup_location,
        dropoff_location,
        status,
        created_at,
        distance,
        estimated_time,
        price
      `)
      .eq('driver_id', driverId)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(order => ({
      id: order.id,
      customer_id: order.customer_id,
      driver_id: order.driver_id,
      pickup_location: order.pickup_location,
      dropoff_location: order.dropoff_location,
      status: order.status as OrderStatus,
      created_at: order.created_at,
      distance: order.distance || 0,
      estimated_time: order.estimated_time || 0,
      price: order.price || 0
    }));
  } catch (error) {
    console.error('Error fetching past orders:', error);
    throw error;
  }
};

export const orderQueries = {
  getPastOrdersByDriverId,
  // Get active orders assigned to a specific driver
  getActiveOrdersByDriverId: async (driverId: string): Promise<Order[]> => {
    // Validate driver ID
    if (!driverId || typeof driverId !== 'string' || driverId.trim() === '') {
      console.error('Invalid driver ID provided');
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          driver_id,
          pickup_location,
          dropoff_location,
          status,
          created_at,
          price,
          distance,
          estimated_time
        `)
        .eq('driver_id', driverId)
        .in('status', ['active', 'assigned'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((order: any) => ({
        id: order.id,
        customer_id: order.customer_id,
        driver_id: order.driver_id,
        pickup_location: order.pickup_location,
        dropoff_location: order.dropoff_location,
        status: order.status as OrderStatus,
        created_at: order.created_at,
        price: order.price,
        distance: order.distance || 0,
        estimated_time: order.estimated_time || 0
      }));
    } catch (error) {
      console.error('Error fetching active orders:', error);
      return [];
    }
  },
  
  // Get pending orders that are not assigned to any driver
  getPendingOrders: async (): Promise<Order[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          driver_id,
          pickup_location,
          dropoff_location,
          status,
          created_at,
          price,
          distance,
          estimated_time
        `)
        .is('driver_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((order: any) => ({
        id: order.id,
        customer_id: order.customer_id,
        driver_id: order.driver_id,
        pickup_location: order.pickup_location,
        dropoff_location: order.dropoff_location,
        status: order.status as OrderStatus,
        created_at: order.created_at,
        price: order.price,
        distance: order.distance || 0,
        estimated_time: order.estimated_time || 0
      }));
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      return [];
    }
  },
  
  // Accept an order (assign to driver)
  acceptOrder: async (orderId: string, driverId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          driver_id: driverId,
          status: 'assigned'
        })
        .eq('id', orderId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error accepting order:', error);
      throw error;
    }
  },
  
  // Complete an order
  completeOrder: async (orderId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'completed'
        })
        .eq('id', orderId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error completing order:', error);
      throw error;
    }
  },
  
  // Cancel an order
  cancelOrder: async (orderId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled'
        })
        .eq('id', orderId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }
};
