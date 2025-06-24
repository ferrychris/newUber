import { supabase } from '../lib/supabaseClient';
import { Order } from '../types/order';

// Define the valid order statuses type to match app's existing types
type ValidOrderStatus = Order['status'];

// PostgreSQL requires explicit type casting for enum types
export const SQL_FRAGMENTS = {
  // Use the PostgreSQL syntax for casting to enum type
  cast_to_order_status: (value: string) => `'${value}'::order_status`
};

/**
 * Updates an order status using the dedicated RPC function to handle PostgreSQL enum type
 * This uses a custom PostgreSQL function that handles enum casting correctly
 * 
 * @param orderId The order ID to update
 * @param newStatus The new status (enum value)
 * @returns Promise with update result
 */
export async function updateOrderStatusWithCast(orderId: string, newStatus: ValidOrderStatus) {
  try {
    // Use the basic function with better error handling
    const { data, error } = await supabase.rpc('update_order_status_basic', {
      order_id: orderId,
      new_status: newStatus
    });
    
    if (error) {
      console.error('RPC update_order_status_basic failed:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error in updateOrderStatusWithCast:', err);
    return { data: null, error: err };
  }
}

/**
 * Adds a status history record using a dedicated RPC function to handle PostgreSQL enum types
 * 
 * @param params The parameters for the history record
 * @returns Promise with insert result
 */
export async function addOrderStatusHistory(params: {
  orderId: string;
  oldStatus: ValidOrderStatus | null;
  newStatus: ValidOrderStatus;
  notes?: string;
  updatedBy?: string;
  locationData?: any;
  metadata?: any;
}) {
  const { orderId, oldStatus, newStatus, notes, updatedBy, locationData, metadata } = params;
  
  try {
    // Prepare RPC parameters
    const rpcParams: any = {
      order_id: orderId,
      new_status: newStatus,
      updated_by: updatedBy || 'system',
      notes: notes || ''
    };
    
    // Add old status if available
    if (oldStatus) {
      rpcParams.old_status = oldStatus;
    }
    
    // Add metadata if available
    if (metadata) {
      rpcParams.metadata = metadata;
    }
    
    // Add location data if available
    if (locationData) {
      if ('location_lat' in locationData) {
        rpcParams.location_lat = locationData.location_lat;
      }
      if ('location_lng' in locationData) {
        rpcParams.location_lng = locationData.location_lng;
      }
    }

    // Use the fixed and properly typed RPC function for order status history
    const { data, error } = await supabase.rpc('add_status_history', {
      order_id: orderId,
      status_value: newStatus,
      notes: notes || null,
      updated_by: updatedBy || null,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
    
    // Fallback to standard insert if RPC doesn't exist or fails
    if (error) {
      console.error('RPC add_status_history failed:', error);
      
      // Try the standard insert approach as fallback
      const insertData = {
        order_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        created_at: new Date().toISOString(),
        notes: notes || '',
        updated_by: updatedBy || 'system',
        metadata: metadata || {}
      };

      // Add location data if available
      if (locationData) {
        if ('location_lat' in locationData) {
          Object.assign(insertData, { location_lat: locationData.location_lat });
        }
        if ('location_lng' in locationData) {
          Object.assign(insertData, { location_lng: locationData.location_lng });
        }
      }

      // Try direct insert with all fields
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('order_status_history')
        .insert(insertData);
        
      if (fallbackError) {
        throw fallbackError;
      }
      
      return { data: fallbackData, error: null };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error in addOrderStatusHistory:', err);
    return { data: null, error: err };
  }
}

/**
 * Gets status history for an order with proper typing
 * @param orderId The ID of the order
 * @returns A promise with the status history
 */
export async function getOrderStatusHistoryWithTyping(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching order status history:', err);
    return { data: [], error: err };
  }
}

/**
 * This function is a placeholder for a feature that would require direct SQL execution.
 * Currently not implemented as it requires special database permissions or extensions.
 * 
 * @param query The SQL query with proper type casting
 */
export async function executeRawSQL(_sql: string) {
  console.warn('Direct SQL execution not available - requires database extensions');
  return { 
    data: null, 
    error: new Error('Direct SQL execution not available. Consider creating PostgreSQL functions in your database.') 
  };
}

/**
 * Alternative approach for updating order status that works directly with RPC functions
 * This uses a fallback approach to try different methods for updating the status
 * 
 * @param orderId The order ID to update
 * @param newStatus The new status value
 * @returns Promise with update result
 */
export async function updateOrderStatusAlternative(orderId: string, newStatus: ValidOrderStatus) {
  try {
    // Try the basic function with better error handling
    const { data, error } = await supabase.rpc('update_order_status_basic', {
      order_id: orderId,
      new_status: newStatus
    });
    
    if (error) {
      console.error('RPC update_order_status_basic failed:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error in updateOrderStatusAlternative:', err);
    return { data: null, error: err };
  }
}
