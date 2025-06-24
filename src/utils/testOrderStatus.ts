import { supabase } from './supabaseClient';
import type { ValidOrderStatus } from '../types/order';

export const testOrderStatus = async (orderId: string, newStatus: ValidOrderStatus) => {
  try {
    const { error } = await supabase
      .rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus
      });

    if (error) throw error;
    
    console.log(`Successfully updated order ${orderId} to status: ${newStatus}`);
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
};
