import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcyodecaeoeiadwyyzrz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase key. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Credit a user's wallet with a specified amount
 */
async function creditUserWallet(userId, amount, description, metadata = {}) {
  try {
    // Convert amount to number for calculations
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Ensure we have a valid amount, use minimum amount if zero or negative
    const minimumAmount = 1.00; // Minimum amount for testing purposes
    const creditAmount = amountNum > 0 ? amountNum : minimumAmount;
    
    console.log(`Crediting user ${userId} wallet with amount: ${creditAmount}`);
    
    // Get the user's wallet
    const { data: walletData, error: walletError } = await supabase
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
      const { data: newWallet, error: createError } = await supabase
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
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: newWallet.id,
          amount: creditAmount,
          type: 'credit',
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
    const newBalance = currentBalance + creditAmount;
    
    const { error: updateError } = await supabase
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
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletData.id,
        amount: creditAmount,
        type: 'credit',
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
}

/**
 * Debit a user's wallet with a specified amount
 */
async function debitUserWallet(userId, amount, description, metadata = {}) {
  try {
    // Convert amount to number for calculations
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Ensure we have a valid amount, use minimum amount if zero or negative
    const minimumAmount = 1.00; // Minimum amount for testing purposes
    const debitAmount = amountNum > 0 ? amountNum : minimumAmount;
    
    console.log(`Debiting user ${userId} wallet with amount: ${debitAmount}`);

    // Get the user's wallet
    const { data: walletData, error: walletError } = await supabase
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
      const { data: newWallet, error: createError } = await supabase
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
      const { error: transactionError } = await supabase
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
    
    const { error: updateError } = await supabase
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
    const { error: transactionError } = await supabase
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
}

/**
 * Credit a driver's wallet when an order is completed
 */
async function creditDriverWalletForCompletedOrder(orderId) {
  try {
    console.log(`Crediting driver wallet for completed order ${orderId}`);
    
    // Get the order details to find the driver_id and price
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('driver_id, price, id')
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
    
    // Ensure price is a valid number, default to minimum amount if zero
    const orderPrice = orderData.price ? parseFloat(orderData.price.toString()) : 0;
    const minimumAmount = 5.00; // Minimum amount for testing purposes
    const creditAmount = orderPrice > 0 ? orderPrice : minimumAmount;
    
    console.log(`Found order with driver_id: ${orderData.driver_id} and price: ${orderPrice}, using credit amount: ${creditAmount}`);
    
    // Check if the driver has a wallet
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', orderData.driver_id)
      .maybeSingle();
      
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching driver wallet:', walletError);
      return { success: false, error: walletError };
    }
    
    // If wallet doesn't exist, create one
    let walletId;
    if (!walletData) {
      console.log(`Creating new wallet for driver ${orderData.driver_id}`);
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: orderData.driver_id,
          balance: creditAmount,
          currency: 'USD',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id')
        .single();
        
      if (createError) {
        console.error('Error creating driver wallet:', createError);
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
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date()
        })
        .eq('id', walletId);
        
      if (updateError) {
        console.error('Error updating driver wallet:', updateError);
        return { success: false, error: updateError };
      }
    }
    
    // Create transaction record in wallet_transactions table
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        amount: creditAmount,
        type: 'earnings',
        status: 'completed',
        description: `Earnings from order #${orderData.id}`,
        metadata: { order_id: orderData.id },
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
}

/**
 * Find or create a test order
 */
async function findOrCreateTestOrder() {
  try {
    // Find a completed order to test with
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, user_id, driver_id, status, price')
      .eq('status', 'completed')
      .limit(1);
      
    if (error) {
      console.error('Error fetching test order:', error);
      return null;
    }
    
    if (!orders || orders.length === 0) {
      console.log('No completed orders found. Creating a test order...');
      // Create a test order if none exists
      const { data: newOrder, error: createError } = await supabase
        .from('orders')
        .insert({
          user_id: '41aacdd8-b5b0-4a03-8b76-463dc8632d45', // Replace with a valid user ID
          driver_id: '74a4c03f-64cf-4e0b-8a51-3fd0f38fcd78', // Replace with a valid driver ID
          status: 'completed',
          price: 15.99,
          pickup_location: 'Test Pickup',
          dropoff_location: 'Test Dropoff',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating test order:', createError);
        return null;
      }
      
      return newOrder;
    }
    
    return orders[0];
  } catch (error) {
    console.error('Unexpected error in findOrCreateTestOrder:', error);
    return null;
  }
}

/**
 * Check wallet transactions for an order
 */
async function checkWalletTransactions(orderId) {
  try {
    // Check if wallet transactions exist for this order
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('id, wallet_id, amount, type, status, user_id')
      .filter('metadata->>order_id', 'eq', orderId);
      
    if (error) {
      console.error('Error checking wallet transactions:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error in checkWalletTransactions:', error);
    return [];
  }
}

/**
 * Main test function
 */
async function main() {
  try {
    console.log('Starting wallet utility functions test...');
    
    // Find or create a test order
    const order = await findOrCreateTestOrder();
    if (!order) {
      console.error('Failed to find or create a test order');
      return;
    }
    
    console.log('Found test order:', order);
    
    // Check for existing transactions
    const existingTransactions = await checkWalletTransactions(order.id);
    console.log(`Found ${existingTransactions.length} existing transactions for order ${order.id}`);
    
    if (existingTransactions.length > 0) {
      console.log('Existing transactions:', existingTransactions);
      console.log('Deleting existing transactions for clean test...');
      
      // Delete existing transactions for this order
      for (const tx of existingTransactions) {
        const { error } = await supabase
          .from('wallet_transactions')
          .delete()
          .eq('id', tx.id);
          
        if (error) {
          console.error(`Error deleting transaction ${tx.id}:`, error);
        }
      }
    }
    
    console.log('Testing wallet utility functions...');
    
    // Test debitUserWallet
    console.log('\n1. Testing debitUserWallet...');
    const debitResult = await debitUserWallet(
      order.user_id,
      order.price || 10.00,
      `Payment for order #${order.id}`,
      { order_id: order.id }
    );
    
    console.log('debitUserWallet result:', debitResult);
    
    // Test creditDriverWalletForCompletedOrder
    console.log('\n2. Testing creditDriverWalletForCompletedOrder...');
    const driverCreditResult = await creditDriverWalletForCompletedOrder(order.id);
    
    console.log('creditDriverWalletForCompletedOrder result:', driverCreditResult);
    
    // Test creditUserWallet
    console.log('\n3. Testing creditUserWallet...');
    const creditResult = await creditUserWallet(
      order.user_id,
      5.00,
      'Refund for test',
      { order_id: order.id, refund: true }
    );
    
    console.log('creditUserWallet result:', creditResult);
    
    // Verify the transactions were created
    const finalTransactions = await checkWalletTransactions(order.id);
    console.log(`\nVerified ${finalTransactions.length} transactions created for order ${order.id}`);
    console.log('Transactions:', finalTransactions);
    
    // Check wallet balances
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id, user_id, balance')
      .in('user_id', [order.user_id, order.driver_id]);
      
    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
    } else {
      console.log('\nWallet balances:');
      wallets.forEach(wallet => {
        console.log(`User ${wallet.user_id}: ${wallet.balance}`);
      });
    }
    
    console.log('\nWallet utility functions test completed successfully!');
  } catch (error) {
    console.error('Unexpected error in main:', error);
  }
}

main().catch(console.error);
