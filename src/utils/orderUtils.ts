import { Order } from '../types/order';
import { supabase } from '../lib/supabaseClient';
import { initiateOrderChat } from './chatUtils';
import { creditDriverWalletForCompletedOrder, debitUserWallet } from './walletUtils';

/**
 * Fetches orders by status
 * @param driverId The ID of the driver (optional)
 * @param statuses Array of order statuses to filter by
 * @param limit Maximum number of orders to return
 * @returns Promise with the orders data and any error
 */
export async function fetchOrdersByStatus(
  driverId?: string,
  statuses?: Order['status'][],
  limit: number = 50
) {
  try {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Add driver filter if provided
    if (driverId) {
      query = query.eq('driver_id', driverId);
    }
    
    // Add status filter if provided
    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return { data, error: null, count };
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    return { data: null, error, count: 0 };
  }
}

/**
 * Updates the status of an order in the database
 * @param orderId The ID of the order to update
 * @param newStatus The new status to set for the order
 * @param notes Optional notes about the status update
 * @param updatedBy Optional identifier of who updated the status
 * @returns A promise that resolves when the update is complete
 */
export async function updateOrderStatus(
  orderId: string, 
  newStatus: Order['status'], 
  notes?: string,
  updatedBy?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Validate the status
    const validStatuses: Order['status'][] = ['accepted', 'en_route', 'arrived', 'picked_up', 'delivered', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    console.log(`Updating order ${orderId} status to ${newStatus}`);
    
    // Get current order to know the previous status
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching current order status:', fetchError);
      throw fetchError;
    }
    
    const oldStatus = currentOrder?.status;
    
    // Start a transaction to update both the order and the status history
    const { error: updateError } = await supabase
      .rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus
      });
    
    if (updateError) {
      console.error('Error updating order status:', updateError);
      throw updateError;
    }
    
    // Create geolocation data if available
    let location_lat: number | null = null;
    let location_lng: number | null = null;

    if (navigator?.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        location_lat = position.coords.latitude;
        location_lng = position.coords.longitude;
      } catch (geoError) {
        console.warn('Could not get location for status update:', geoError);
        // Continue without location data
      }
    }
    
    // Add to status history using RPC function
    const { error: historyError } = await supabase
      .rpc('add_order_status_history', {
        p_order_id: orderId,
        p_old_status: oldStatus,
        p_new_status: newStatus,
        p_notes: notes,
        p_updated_by: updatedBy || null,
        p_metadata: metadata,
        p_location_lat: location_lat,
        p_location_lng: location_lng
      });
    
    if (historyError) {
      console.error('Error recording status history:', historyError);
      // We'll still consider the update successful even if history recording fails
    }
    
    console.log(`Successfully updated order ${orderId} status to ${newStatus}`);
    
    // Handle wallet transactions based on order status changes
    try {
      // Get order details including price, customer ID, and driver ID
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('price, user_id, driver_id')
        .eq('id', orderId)
        .single();
        
      if (orderError) {
        console.error(`Error fetching order details for wallet transactions: ${orderId}`, orderError);
      } else if (orderData) {
        const { price, user_id: customerId, driver_id: driverId } = orderData;
        
        // When order is accepted, debit the customer's wallet
        if (newStatus === 'accepted' && customerId) {
          // Check if the customer's wallet has already been debited for this order
          const { data: existingCustomerTransactions, error: checkCustomerError } = await supabase
            .from('wallet_transactions')
            .select('id')
            .eq('metadata->order_id', orderId)
            .eq('type', 'payment');
            
          if (checkCustomerError) {
            console.error(`Error checking for existing customer transactions for order ${orderId}:`, checkCustomerError);
          }
          
          // Only debit the wallet if no previous transaction exists for this order
          if (!existingCustomerTransactions || existingCustomerTransactions.length === 0) {
            console.log(`Debiting customer's wallet for order ${orderId}`);
            const { success, error } = await debitUserWallet(
              customerId,
              price,
              `Payment for order #${orderId}`,
              { order_id: orderId }
            );
            
            if (success) {
              console.log(`Successfully debited customer's wallet for order ${orderId}`);
            } else {
              console.error(`Failed to debit customer's wallet for order ${orderId}:`, error);
            }
          } else {
            console.log(`Customer wallet already debited for order ${orderId}, skipping duplicate payment`);
          }
        }
        
        // When order is delivered or completed, credit the driver's wallet
        if ((newStatus === 'delivered' || newStatus === 'completed') && driverId) {
          // Check if the driver's wallet has already been credited for this order
          const { data: existingDriverTransactions, error: checkDriverError } = await supabase
            .from('wallet_transactions')
            .select('id')
            .eq('metadata->order_id', orderId)
            .eq('type', 'earnings');
            
          if (checkDriverError) {
            console.error(`Error checking for existing driver transactions for order ${orderId}:`, checkDriverError);
          }
          
          // Only credit the wallet if no previous transaction exists for this order
          if (!existingDriverTransactions || existingDriverTransactions.length === 0) {
            console.log(`Crediting driver's wallet for order ${orderId}`);
            const { success, error } = await creditDriverWalletForCompletedOrder(orderId);
            
            if (success) {
              console.log(`Successfully credited driver's wallet for order ${orderId}`);
            } else {
              console.error(`Failed to credit driver's wallet for order ${orderId}:`, error);
            }
          } else {
            console.log(`Driver wallet already credited for order ${orderId}, skipping duplicate payment`);
          }
        }
      }
    } catch (walletError) {
      console.error(`Error handling wallet transactions for order ${orderId}:`, walletError);
      // We don't throw the error here to avoid failing the status update
    }
    
    // If the order status changed to 'accepted', initiate a chat between driver and customer
    if (newStatus === 'accepted') {
      try {
        // Get driver ID and customer ID from the order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('driver_id, user_id')
          .eq('id', orderId)
          .single();
          
        if (orderError) {
          console.error('Error fetching order details for chat initialization:', orderError);
        } else if (orderData && orderData.driver_id && orderData.user_id) {
          // Initialize chat between driver and customer
          const driverId = orderData.driver_id;
          const customerId = orderData.user_id;
          
          await initiateOrderChat(
            orderId,
            driverId,
            customerId,
            'Your driver has been assigned. You can now communicate directly regarding your order.'
          );
        }
      } catch (chatError) {
        console.error('Error initiating order chat:', chatError);
        // We don't throw the error here as the status update was successful
      }
    }
    
    return;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Gets the status history for an order
 * @param orderId The ID of the order
 * @returns A promise that resolves to the status history
 */
export async function getOrderStatusHistory(orderId: string) {
  try {
    console.log('Fetching status history for order:', orderId);
    
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching order status history:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getOrderStatusHistory:', error);
    // Return empty array rather than throwing error
    return [];
  }
}
