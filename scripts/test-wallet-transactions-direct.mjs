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

async function findOrCreateWallet(userId) {
  try {
    // Check if user has a wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (walletError) {
      console.error(`Error fetching wallet for user ${userId}:`, walletError);
      return null;
    }
    
    if (!wallet) {
      console.log(`No wallet found for user ${userId}, creating one...`);
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          currency: 'USD',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();
        
      if (createError) {
        console.error(`Error creating wallet for user ${userId}:`, createError);
        return null;
      }
      
      return newWallet;
    }
    
    return wallet;
  } catch (error) {
    console.error(`Unexpected error in findOrCreateWallet for user ${userId}:`, error);
    return null;
  }
}

async function createWalletTransaction(walletId, userId, amount, type, description, orderId) {
  try {
    // Create transaction record
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        user_id: userId,
        amount: parseFloat(amount),
        type,
        status: 'completed',
        description,
        metadata: { order_id: orderId },
        transaction_date: new Date(),
        created_at: new Date()
      })
      .select()
      .single();
      
    if (error) {
      console.error(`Error creating ${type} transaction:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Unexpected error creating ${type} transaction:`, error);
    return null;
  }
}

async function updateWalletBalance(walletId, amount, isDebit = false) {
  try {
    // Get current balance
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching wallet balance:', fetchError);
      return false;
    }
    
    // Calculate new balance
    const currentBalance = parseFloat(wallet.balance || 0);
    const newBalance = isDebit 
      ? Math.max(0, currentBalance - parseFloat(amount)) 
      : currentBalance + parseFloat(amount);
    
    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date()
      })
      .eq('id', walletId);
      
    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error updating wallet balance:', error);
    return false;
  }
}

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

async function main() {
  try {
    console.log('Starting wallet transaction test...');
    
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
      return;
    }
    
    console.log('No transactions found, creating test transactions...');
    
    // Ensure we have a valid amount (minimum 10.00)
    const amount = order.price > 0 ? order.price : 10.00;
    
    // Process customer payment
    console.log('Processing customer payment...');
    const customerWallet = await findOrCreateWallet(order.user_id);
    if (!customerWallet) {
      console.error('Failed to find or create customer wallet');
      return;
    }
    
    const customerTx = await createWalletTransaction(
      customerWallet.id,
      order.user_id,
      amount,
      'payment',
      `Payment for order #${order.id}`,
      order.id
    );
    
    if (!customerTx) {
      console.error('Failed to create customer transaction');
      return;
    }
    
    const customerBalanceUpdated = await updateWalletBalance(customerWallet.id, amount, true);
    if (!customerBalanceUpdated) {
      console.error('Failed to update customer wallet balance');
      return;
    }
    
    console.log('Customer transaction created:', customerTx);
    
    // Process driver earnings
    console.log('Processing driver earnings...');
    const driverWallet = await findOrCreateWallet(order.driver_id);
    if (!driverWallet) {
      console.error('Failed to find or create driver wallet');
      return;
    }
    
    const driverTx = await createWalletTransaction(
      driverWallet.id,
      order.driver_id,
      amount,
      'earnings',
      `Earnings from order #${order.id}`,
      order.id
    );
    
    if (!driverTx) {
      console.error('Failed to create driver transaction');
      return;
    }
    
    const driverBalanceUpdated = await updateWalletBalance(driverWallet.id, amount, false);
    if (!driverBalanceUpdated) {
      console.error('Failed to update driver wallet balance');
      return;
    }
    
    console.log('Driver transaction created:', driverTx);
    
    // Verify the transactions were created
    const finalTransactions = await checkWalletTransactions(order.id);
    console.log(`Verified ${finalTransactions.length} transactions created for order ${order.id}`);
    console.log('Transactions:', finalTransactions);
    
    console.log('Wallet transaction test completed successfully!');
  } catch (error) {
    console.error('Unexpected error in main:', error);
  }
}

main().catch(console.error);
