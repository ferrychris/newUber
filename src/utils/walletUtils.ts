import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

/**
 * Credit a user's wallet with a specified amount
 * @param userId The user ID whose wallet to credit
 * @param amount The amount to credit (as a string or number)
 * @param description Description of the transaction
 * @param metadata Additional metadata for the transaction
 * @param client Optional Supabase client (uses default if not provided)
 * @returns Object containing success status and any error
 */
export const creditUserWallet = async (
  userId: string,
  amount: string | number,
  description: string,
  metadata: Record<string, any> = {},
  client: SupabaseClient = supabase
): Promise<{ success: boolean; error: any }> => {
  try {
    // Convert amount to number for calculations
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(amountNum) || amountNum <= 0) {
      return { 
        success: false, 
        error: new Error('Invalid amount: must be a positive number') 
      };
    }

    // Start a Supabase transaction
    const { data: walletData, error: walletError } = await client
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
      return { success: false, error: walletError };
    }
    
    // If wallet doesn't exist, create one
    if (!walletData) {
      const { data: newWallet, error: createError } = await client
        .from('wallets')
        .insert({
          user_id: userId,
          balance: amountNum.toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (createError) {
        console.error('Error creating wallet:', createError);
        return { success: false, error: createError };
      }
      
      // Create transaction record for the new wallet
      const { error: transactionError } = await client
        .from('wallet_transactions')
        .insert({
          wallet_id: newWallet.id,
          amount: amountNum.toString(),
          type: 'earnings',
          status: 'completed',
          description,
          payment_method: 'order_completion',
          metadata
        });
        
      if (transactionError) {
        console.error('Error creating transaction record:', transactionError);
        return { success: false, error: transactionError };
      }
      
      return { success: true, error: null };
    }
    
    // Update existing wallet
    const newBalance = parseFloat(walletData.balance || '0') + amountNum;
    
    const { error: updateError } = await client
      .from('wallets')
      .update({ 
        balance: newBalance.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', walletData.id);
      
    if (updateError) {
      console.error('Error updating wallet:', updateError);
      return { success: false, error: updateError };
    }
    
    // Create transaction record
    const { error: transactionError } = await client
      .from('wallet_transactions')
      .insert({
        wallet_id: walletData.id,
        amount: amountNum.toString(),
        type: 'earnings',
        status: 'completed',
        description,
        payment_method: 'order_completion',
        metadata
      });
      
    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return { success: false, error: transactionError };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error in creditUserWallet:', error);
    return { success: false, error };
  }
};

/**
 * Credit a driver's wallet when an order is completed
 * @param orderId The ID of the completed order
 * @param client Optional Supabase client (uses default if not provided)
 * @returns Object containing success status and any error
 */
export const creditDriverWalletForCompletedOrder = async (
  orderId: string,
  client: SupabaseClient = supabase
): Promise<{ success: boolean; error: any }> => {
  try {
    // Get the order details to find the driver_id and price
    const { data: orderData, error: orderError } = await client
      .from('orders')
      .select('driver_id, price, id')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('Error fetching order details:', orderError);
      return { success: false, error: orderError };
    }
    
    if (!orderData?.driver_id || !orderData?.price) {
      console.error('Missing driver_id or price in order data');
      return { 
        success: false, 
        error: new Error('Order is missing driver_id or price') 
      };
    }
    
    // Credit the driver's wallet
    return await creditUserWallet(
      orderData.driver_id,
      orderData.price,
      `Earnings from order #${orderData.id}`,
      { order_id: orderData.id },
      client
    );
  } catch (error) {
    console.error('Unexpected error in creditDriverWalletForCompletedOrder:', error);
    return { success: false, error };
  }
};
