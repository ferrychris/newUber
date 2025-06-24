import { supabase } from '../lib/supabaseClient';
import { ValidOrderStatus } from '../types/order';

interface StatusChangeParams {
  orderId: string;
  oldStatus: ValidOrderStatus | null;
  newStatus: ValidOrderStatus;
  updatedBy?: string;
  notes?: string;
  location?: {
    lat: number;
    lng: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Records a status change in the order_status_history table
 * @param params Status change parameters
 * @returns Promise with the result of the insert operation
 */
export async function recordStatusChange({
  orderId,
  oldStatus,
  newStatus,
  updatedBy,
  notes,
  location,
  metadata
}: StatusChangeParams) {
  try {
    const { data, error } = await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        status: newStatus, // Assuming the enum type matches ValidOrderStatus values
        updated_by: updatedBy,
        notes,
        location_lat: location?.lat,
        location_lng: location?.lng,
        metadata
      });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error recording status change:', error);
    return { data: null, error };
  }
}

/**
 * Fetches the status history for an order
 * @param orderId The ID of the order
 * @returns Promise with the status history data
 */
export async function fetchOrderStatusHistory(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('order_status_history')
      .select(`
        id,
        timestamp,
        old_status,
        new_status,
        notes,
        updated_by,
        location_lat,
        location_lng,
        metadata,
        profiles:updated_by(id, full_name, avatar_url)
      `)
      .eq('order_id', orderId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching order status history:', error);
    return { data: null, error };
  }
}
