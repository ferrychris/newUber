import { supabase } from '@/lib/supabaseClient';
import { Order } from './types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// List of valid order status values
export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'en_route',
  'arrived',
  'picked_up',
  'delivered',
  'cancelled'
] as const;

export const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
  try {
    // Validate the status value against our known statuses
    if (!ORDER_STATUSES.includes(newStatus as any)) {
      throw new Error(`Invalid status value: ${newStatus}`);
    }

    // Call the RPC function with the correct parameter types
    const { data, error } = await supabase.rpc('update_order_status_v2', {
      p_new_status: newStatus,
      p_order_id: orderId
    });

    if (error) {
      console.error('RPC Error:', error);
      throw new Error(`Failed to update order status: ${error.message}`);
    }

    // Check if the function returned an error
    if (data && typeof data === 'object' && 'success' in data && !data.success) {
      const errorMsg = (data as any).error || 'Unknown error updating status';
      throw new Error(errorMsg);
    }

    console.log('Status update successful:', data);
    return data;
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    throw error;
  }
};
