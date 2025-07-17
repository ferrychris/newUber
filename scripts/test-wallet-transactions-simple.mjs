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

async function processOrderWalletTransactions(orderId) {
  try {
    // Call the database function to process wallet transactions
    const { data, error } = await supabase.rpc('process_order_wallet_transactions', {
      p_order_id: orderId
    });
    
    if (error) {
      console.error('Error processing wallet transactions:', error);
      return { success: false, error };
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in processOrderWalletTransactions:', error);
    return { success: false, error };
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
    } else {
      console.log('No transactions found, creating test transactions...');
      
      // Process wallet transactions for the order
      const result = await processOrderWalletTransactions(order.id);
      console.log('Process result:', result);
      
      if (result && result.success) {
        console.log('Successfully processed wallet transactions for order:', order.id);
        
        // Verify the transactions were created
        const finalTransactions = await checkWalletTransactions(order.id);
        console.log(`Verified ${finalTransactions.length} transactions created for order ${order.id}`);
        console.log('Transactions:', finalTransactions);
      } else {
        console.error('Failed to process wallet transactions');
      }
    }
  } catch (error) {
    console.error('Unexpected error in main:', error);
  }
}

main().catch(console.error);
