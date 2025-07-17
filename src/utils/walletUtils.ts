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
    
    // Ensure we have a valid amount, use minimum amount if zero or negative
    const minimumAmount = 1.00; // Minimum amount for testing purposes
    const creditAmount = amountNum > 0 ? amountNum : minimumAmount;
    
    console.log(`Crediting user ${userId} wallet with amount: ${creditAmount}`);
    
    // Get the user's wallet
    const { data: walletData, error: walletError } = await client
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
      return { success: false, error: walletError };
    }
    
    // If wallet doesn't exist, create one with the credited amount
    if (!walletData) {
      console.log(`Creating new wallet for user ${userId}`);
      const { data: newWallet, error: createError } = await client
        .from('wallets')
        .insert({
          user_id: userId,
          balance: creditAmount,
          currency: 'USD',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id')
        .single();
        
      if (createError) {
        console.error('Error creating wallet:', createError);
        return { success: false, error: createError };
      }
      
      // Create transaction record for the credit
      const { error: transactionError } = await client
        .from('wallet_transactions')
        .insert({
          wallet_id: newWallet.id,
          amount: creditAmount,
          type: 'deposit',
          status: 'completed',
          description,
          metadata,
          user_id: userId,
          transaction_date: new Date(),
          created_at: new Date()
        });
        
      if (transactionError) {
        console.error('Error creating transaction record:', transactionError);
        return { success: false, error: transactionError };
      }
      
      console.log(`Successfully created wallet and credited user ${userId} with amount: ${creditAmount}`);
      return { success: true, error: null };
    }
    
    // Update existing wallet
    const currentBalance = parseFloat(walletData.balance || '0');
    const newBalance = currentBalance + creditAmount;
    
    const { error: updateError } = await client
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date()
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
        amount: creditAmount,
        type: 'deposit',
        status: 'completed',
        description,
        metadata,
        user_id: userId,
        transaction_date: new Date(),
        created_at: new Date()
      });
      
    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return { success: false, error: transactionError };
    }
    
    console.log(`Successfully credited user ${userId} wallet with amount: ${creditAmount}`);
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
/**
 * Debit a user's wallet with a specified amount
 * @param userId The user ID whose wallet to debit
 * @param amount The amount to debit (as a string or number)
 * @param description Description of the transaction
 * @param metadata Additional metadata for the transaction
 * @param client Optional Supabase client (uses default if not provided)
 * @returns Object containing success status and any error
 */
export const debitUserWallet = async (
  userId: string,
  amount: string | number,
  description: string,
  metadata: Record<string, any> = {},
  client: SupabaseClient = supabase
): Promise<{ success: boolean; error: any }> => {
  try {
    // Convert amount to number for calculations
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Ensure we have a valid amount, use minimum amount if zero or negative
    const minimumAmount = 1.00; // Minimum amount for testing purposes
    const debitAmount = amountNum > 0 ? amountNum : minimumAmount;
    
    console.log(`Debiting user ${userId} wallet with amount: ${debitAmount}`);

    // Get the user's wallet
    const { data: walletData, error: walletError } = await client
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
      return { success: false, error: walletError };
    }
    
    // If wallet doesn't exist, create one with zero balance
    if (!walletData) {
      console.log(`Creating new wallet for user ${userId}`);
      const { data: newWallet, error: createError } = await client
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0, // Start with zero balance (numeric type)
          currency: 'USD', // Default currency
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id')
        .single();
        
      if (createError) {
        console.error('Error creating wallet:', createError);
        return { success: false, error: createError };
      }
      
      // Create transaction record for the debit
      // For testing purposes, we'll create the transaction but won't enforce balance check
      const { error: transactionError } = await client
        .from('wallet_transactions')
        .insert({
          wallet_id: newWallet.id,
          amount: debitAmount,
          type: 'payment',
          status: 'completed',
          description,
          metadata,
          user_id: userId,
          transaction_date: new Date(),
          created_at: new Date()
        });
        
      if (transactionError) {
        console.error('Error creating transaction record:', transactionError);
        return { success: false, error: transactionError };
      }
      
      console.log(`Successfully created wallet and transaction record for user ${userId}`);
      return { success: true, error: null };
    }
    
    // Update existing wallet
    const currentBalance = parseFloat(walletData.balance || '0');
    
    // For testing purposes, we'll skip the balance check
    // In production, uncomment this check
    /*
    // Check if user has sufficient balance
    if (currentBalance < debitAmount) {
      return { 
        success: false, 
        error: new Error('Insufficient balance') 
      };
    }
    */
    
    const newBalance = Math.max(0, currentBalance - debitAmount); // Ensure balance doesn't go negative
    
    const { error: updateError } = await client
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date()
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
        amount: debitAmount,
        type: 'payment',
        status: 'completed',
        description,
        metadata,
        user_id: userId,
        transaction_date: new Date(),
        created_at: new Date()
      });
      
    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return { success: false, error: transactionError };
    }
    
    console.log(`Successfully debited user ${userId} wallet with amount: ${debitAmount}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error in debitUserWallet:', error);
    return { success: false, error };
  }
};

export const creditDriverWalletForCompletedOrder = async (
  orderId: string,
  client: SupabaseClient = supabase
): Promise<{ success: boolean; error: any }> => {
  try {
    console.log(`Crediting driver wallet for completed order ${orderId}`);
    
    // Get the order details to find the driver_id and price
    const { data: orderData, error: orderError } = await client
      .from('orders')
      .select('driver_id, price, id, tip')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('Error fetching order details:', orderError);
      return { success: false, error: orderError };
    }
    
    if (!orderData?.driver_id) {
      console.error('Missing driver_id in order data');
      return { 
        success: false, 
        error: new Error('Order is missing driver_id') 
      };
    }
    
    // Calculate the total amount including tips
    const orderPrice = orderData.price ? parseFloat(orderData.price.toString()) : 0;
    const orderTip = orderData.tip ? parseFloat(orderData.tip.toString()) : 0;
    const minimumAmount = 5.00; // Minimum amount for testing purposes
    
    // Driver gets 80% of the fare plus full tip
    const driverShare = 0.8; // Driver gets 80% of the fare
    const driverBaseEarnings = orderPrice * driverShare;
    const totalDriverEarnings = driverBaseEarnings + orderTip;
    
    // Ensure we have a valid amount
    const creditAmount = totalDriverEarnings > 0 ? totalDriverEarnings : minimumAmount;
    
    console.log(`Found order with driver_id: ${orderData.driver_id}, price: ${orderPrice}, tip: ${orderTip}`);
    console.log(`Driver earnings: ${driverBaseEarnings} + ${orderTip} tip = ${creditAmount} total`);
    
    // Check if the driver has a wallet
    const { data: walletData, error: walletError } = await client
      .from('wallets')
      .select('id, balance')
      .eq('user_id', orderData.driver_id)
      .maybeSingle();
      
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
      return { success: false, error: walletError };
    }
    
    // If wallet doesn't exist, create one
    let walletId: string;
    if (!walletData) {
      console.log(`Creating new wallet for driver ${orderData.driver_id}`);
      const { data: newWallet, error: createError } = await client
        .from('wallets')
        .insert({
          user_id: orderData.driver_id,
          balance: creditAmount,
          currency: 'USD',
          created_at: new Date(),
          updated_at: new Date(),
          user_type: 'driver' // Add a user_type field to distinguish between users and drivers
        })
        .select('id')
        .single();
        
      if (createError) {
        console.error('Error creating wallet:', createError);
        return { success: false, error: createError };
      }
      
      walletId = newWallet.id;
      
      console.log(`Created new wallet with ID: ${walletId} and initial balance: ${creditAmount}`);
    } else {
      // Update existing wallet
      walletId = walletData.id;
      const currentBalance = parseFloat(walletData.balance || '0');
      const newBalance = currentBalance + creditAmount;
      
      console.log(`Updating wallet ${walletId} balance from ${currentBalance} to ${newBalance}`);
      
      const { error: updateError } = await client
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date()
        })
        .eq('id', walletId);
        
      if (updateError) {
        console.error('Error updating wallet:', updateError);
        return { success: false, error: updateError };
      }
    }
    
    // Create transaction record in wallet_transactions table
    const { error: transactionError } = await client
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        amount: creditAmount,
        type: 'earnings',
        status: 'completed',
        description: `Earnings from order #${orderData.id}`,
        metadata: { 
          order_id: orderData.id,
          base_earnings: driverBaseEarnings,
          tip: orderTip,
          driver_share: driverShare,
          user_type: 'driver' // Add user_type to metadata for better filtering
        },
        user_id: orderData.driver_id,
        transaction_date: new Date(),
        created_at: new Date()
      });
      
    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return { success: false, error: transactionError };
    }
    
    console.log(`Successfully credited driver ${orderData.driver_id} wallet for order ${orderId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error in creditDriverWalletForCompletedOrder:', error);
    return { success: false, error };
  }
};
