// Script to test wallet transactions for orders
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Supabase client with service role key for bypassing RLS
const supabaseUrl = process.env.SUPABASE_URL || 'https://hcyodecaeoeiadwyyzrz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase key. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTestOrder() {
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
    console.error('Unexpected error in findTestOrder:', error);
    return null;
  }
}

async function checkExistingTransactions(orderId) {
  try {
    // Check if wallet transactions already exist for this order
    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('id, wallet_id, amount, type, status')
      .filter('metadata->>order_id', 'eq', orderId);
      
    if (error) {
      console.error('Error checking existing transactions:', error);
      return [];
    }
    
    return transactions || [];
  } catch (error) {
    console.error('Unexpected error in checkExistingTransactions:', error);
    return [];
  }
}

async function createWalletTransaction(userId, amount, type, description, orderId) {
  try {
    // Check if user has a wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (walletError) {
      console.error(`Error fetching ${type === 'payment' ? 'customer' : 'driver'} wallet:`, walletError);
      return { success: false, error: walletError };
    }
    
    let walletId;
    
    // Create wallet if it doesn't exist
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: type === 'payment' ? 0 : parseFloat(amount), // Start with 0 for customer, or credit amount for driver
          currency: 'USD',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id')
        .single();
        
      if (createError) {
        console.error(`Error creating ${type === 'payment' ? 'customer' : 'driver'} wallet:`, createError);
        return { success: false, error: createError };
      }
      
      walletId = newWallet.id;
    } else {
      walletId = wallet.id;
      
      // Update wallet balance
      const currentBalance = parseFloat(wallet.balance || '0');
      const newBalance = type === 'payment' 
        ? Math.max(0, currentBalance - parseFloat(amount)) // Debit for customer
        : currentBalance + parseFloat(amount); // Credit for driver
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          updated_at: new Date()
        })
        .eq('id', walletId);
        
      if (updateError) {
        console.error(`Error updating ${type === 'payment' ? 'customer' : 'driver'} wallet:`, updateError);
        return { success: false, error: updateError };
      }
    }
    
    // Create transaction record
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        amount: parseFloat(amount),
        type,
        status: 'completed',
        description,
        metadata: { order_id: orderId },
        user_id: userId,
        transaction_date: new Date(),
        created_at: new Date()
      });
      
    if (transactionError) {
      console.error(`Error creating ${type} transaction:`, transactionError);
      return { success: false, error: transactionError };
    }
    
    return { success: true, walletId };
  } catch (error) {
    console.error(`Unexpected error creating ${type} transaction:`, error);
    return { success: false, error };
  }
}

async function main() {
  try {
    console.log('Starting wallet transaction test...');
    
    // Find a test order
    const order = await findTestOrder();
    if (!order) {
      console.error('Failed to find or create a test order');
      return;
    }
    
    console.log('Found test order:', order);
    
    // Check for existing transactions
    const existingTransactions = await checkExistingTransactions(order.id);
    console.log(`Found ${existingTransactions.length} existing transactions for order ${order.id}`);
    
    if (existingTransactions.length > 0) {
      console.log('Existing transactions:', existingTransactions);
      return;
    }
    
    console.log('No transactions found, creating test transactions...');
    
    // Create customer payment transaction
    const customerResult = await createWalletTransaction(
      order.user_id,
      order.price || 10.00, // Use order price or default to 10.00
      'payment',
      `Payment for order #${order.id}`,
      order.id
    );
    
    if (!customerResult.success) {
      console.error('Failed to create customer transaction');
      return;
    }
    
    // Create driver earnings transaction
    const driverResult = await createWalletTransaction(
      order.driver_id,
      order.price || 10.00, // Use order price or default to 10.00
      'earnings',
      `Earnings from order #${order.id}`,
      order.id
    );
    
    if (!driverResult.success) {
      console.error('Failed to create driver transaction');
      return;
    }
    
    console.log('Successfully created wallet transactions for order:', order.id);
    
    // Verify the transactions were created
    const finalTransactions = await checkExistingTransactions(order.id);
    console.log(`Verified ${finalTransactions.length} transactions created for order ${order.id}`);
    console.log('Transactions:', finalTransactions);
  } catch (error) {
    console.error('Unexpected error in main:', error);
  }
}

main().catch(console.error);

// Initialize Supabase client with service role key for bypassing RLS
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function findTestOrder() {
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
}

async function checkExistingTransactions(orderId) {
  // Check if wallet transactions already exist for this order
  const { data: transactions, error } = await supabase
    .from('wallet_transactions')
    .select('id, wallet_id, amount, type, status')
    .filter('metadata->>order_id', 'eq', orderId);
    
  if (error) {
    console.error('Error checking existing transactions:', error);
    return [];
  }
  
  return transactions || [];
}

async function createWalletTransaction(userId, amount, type, description, orderId) {
  try {
    // Check if user has a wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (walletError) {
      console.error(`Error fetching ${type === 'payment' ? 'customer' : 'driver'} wallet:`, walletError);
      return { success: false, error: walletError };
    }
    
    let walletId;
    
    // Create wallet if it doesn't exist
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: type === 'payment' ? 0 : parseFloat(amount), // Start with 0 for customer, or credit amount for driver
          currency: 'USD',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id')
        .single();
        
      if (createError) {
        console.error(`Error creating ${type === 'payment' ? 'customer' : 'driver'} wallet:`, createError);
        return { success: false, error: createError };
      }
      
      walletId = newWallet.id;
    } else {
      walletId = wallet.id;
          driverWalletId = driverWallet.id;
        }
        
        // Create earnings transaction
        const earningsAmount = testOrder.price > 0 ? testOrder.price * 0.8 : 8.00; // 80% of price
        const { error: earningsError } = await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: driverWalletId,
            amount: earningsAmount.toString(),
            type: 'earnings',
            status: 'completed',
            description: `Earnings from order #${testOrder.id}`,
            payment_method: 'order_completion',
            metadata: { order_id: testOrder.id },
            user_id: testOrder.driver_id,
            transaction_date: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
          
        if (earningsError) {
          console.error('Error creating earnings transaction:', earningsError);
        } else {
          console.log(`Created earnings transaction for driver ${testOrder.driver_id}`);
        }
      }
    }
    
    // 4. Verify wallet transactions after creation
    const { data: finalTransactions, error: finalTxError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('metadata->>order_id', testOrder.id);
      
    if (finalTxError) {
      console.error('Error checking final wallet transactions:', finalTxError);
      return;
    }
    
    console.log(`Final transaction count for order ${testOrder.id}: ${finalTransactions?.length || 0}`);
    console.log('Transaction details:', finalTransactions);
    
    console.log('Wallet transaction test completed!');
  } catch (error) {
    console.error('Unexpected error during wallet transaction test:', error);
  }
}

// Run the test
testWalletTransactions();
