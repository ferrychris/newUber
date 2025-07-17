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
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcyodecaeoeiadwyyzrz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase key. Please check your .env file.');
  process.exit(1);
}

// Initialize Supabase client with admin privileges to bypass RLS
// For production, this should be replaced with proper authentication
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Function to authenticate as a test user
async function authenticateTestUser() {
  try {
    // For testing purposes, we'll use the email/password sign-in method
    // In a real application, you would use proper authentication
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    
    // Try to sign in with the test credentials
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log('Could not sign in, trying to create test user...');
      
      // If sign in fails, try to create the test user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (signUpError) {
        console.error('Error creating test user:', signUpError);
        return false;
      }
      
      console.log('Test user created successfully');
      return true;
    }
    
    console.log('Authenticated as test user');
    return true;
  } catch (error) {
    console.error('Error in authentication:', error);
    return false;
  }
}

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
    
    // Authenticate first
    const isAuthenticated = await authenticateTestUser();
    if (!isAuthenticated) {
      console.error('Authentication failed. Cannot proceed with test.');
      return;
    }
    
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
