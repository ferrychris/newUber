import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcyodecaeoeiadwyyzrz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test real-time wallet notification
async function testRealWalletNotification() {
  console.log('🔔 Testing real-time wallet notification...');
  
  try {
    // First, get or create a test driver
    const { data: drivers, error: driverError } = await supabase
      .from('drivers')
      .select('id, user_id')
      .limit(1);
      
    if (driverError) {
      console.error('Error fetching drivers:', driverError);
      return;
    }
    
    if (!drivers || drivers.length === 0) {
      console.log('No drivers found. Please create a driver first.');
      return;
    }
    
    const driver = drivers[0];
    console.log(`Using driver: ${driver.id}`);
    
    // Get or create driver wallet
    let { data: driverWallet, error: walletError } = await supabase
      .from('driver_wallets')
      .select('id, balance')
      .eq('driver_id', driver.id)
      .single();
      
    if (walletError && walletError.code === 'PGRST116') {
      // Create driver wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from('driver_wallets')
        .insert({
          driver_id: driver.id,
          balance: 0.00
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating driver wallet:', createError);
        return;
      }
      
      driverWallet = newWallet;
      console.log('Created new driver wallet');
    } else if (walletError) {
      console.error('Error fetching driver wallet:', walletError);
      return;
    }
    
    console.log(`Driver wallet ID: ${driverWallet.id}, Current balance: $${driverWallet.balance}`);
    
    // Create a real wallet transaction (deposit)
    const transactionAmount = 25.00;
    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: driverWallet.id,
        amount: transactionAmount,
        type: 'deposit',
        status: 'completed',
        description: 'Test deposit for notification system',
        metadata: JSON.stringify({ 
          test: true, 
          timestamp: new Date().toISOString(),
          source: 'notification_test'
        })
      })
      .select()
      .single();
      
    if (transactionError) {
      console.error('Error creating wallet transaction:', transactionError);
      return;
    }
    
    console.log('✅ Wallet transaction created successfully!');
    console.log(`Transaction ID: ${transaction.id}`);
    console.log(`Amount: $${transaction.amount}`);
    console.log(`Type: ${transaction.type}`);
    console.log('This should trigger a real-time notification in the frontend.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Test real-time order notification
async function testRealOrderNotification() {
  console.log('📦 Testing real-time order notification...');
  
  try {
    // Get an existing order with a driver
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, driver_id, status')
      .not('driver_id', 'is', null)
      .limit(1);
      
    if (orderError) {
      console.error('Error fetching orders:', orderError);
      return;
    }
    
    if (!orders || orders.length === 0) {
      console.log('No orders with drivers found. Creating a test order...');
      
      // Get a driver for the test order
      const { data: drivers, error: driverError } = await supabase
        .from('drivers')
        .select('user_id')
        .limit(1);
        
      if (driverError || !drivers || drivers.length === 0) {
        console.log('No drivers found. Cannot create test order.');
        return;
      }
      
      // Create a test order
      const { data: newOrder, error: createOrderError } = await supabase
        .from('orders')
        .insert({
          customer_id: drivers[0].user_id, // Using driver as customer for test
          driver_id: drivers[0].user_id,
          status: 'pending',
          pickup_location: JSON.stringify({
            address: 'Test Pickup Location',
            lat: 40.7128,
            lng: -74.0060
          }),
          dropoff_location: JSON.stringify({
            address: 'Test Dropoff Location',
            lat: 40.7589,
            lng: -73.9851
          }),
          fare: 15.50
        })
        .select()
        .single();
        
      if (createOrderError) {
        console.error('Error creating test order:', createOrderError);
        return;
      }
      
      console.log('Created test order:', newOrder.id);
      orders.push(newOrder);
    }
    
    const order = orders[0];
    console.log(`Using order: ${order.id}, Current status: ${order.status}`);
    
    // Update order status to trigger notification
    const newStatus = order.status === 'pending' ? 'accepted' : 'en_route';
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);
      
    if (updateError) {
      console.error('Error updating order status:', updateError);
      return;
    }
    
    console.log('✅ Order status updated successfully!');
    console.log(`Order ID: ${order.id}`);
    console.log(`Status changed from: ${order.status} → ${newStatus}`);
    console.log('This should trigger a real-time notification in the frontend.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Test real-time message notification
async function testRealMessageNotification() {
  console.log('💬 Testing real-time message notification...');
  
  try {
    // Get a driver to send message to
    const { data: drivers, error: driverError } = await supabase
      .from('drivers')
      .select('user_id')
      .limit(1);
      
    if (driverError || !drivers || drivers.length === 0) {
      console.log('No drivers found for message test.');
      return;
    }
    
    const driver = drivers[0];
    console.log(`Sending message to driver: ${driver.user_id}`);
    
    // Get an existing order for the message context
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('driver_id', driver.user_id)
      .limit(1);
      
    if (orderError || !orders || orders.length === 0) {
      console.log('No orders found for message test.');
      return;
    }
    
    // Create a message using the messages table
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        order_id: orders[0].id,
        sender_id: driver.user_id, // Using driver as sender for test
        receiver_id: driver.user_id, // Self-message for test
        message: 'This is a test notification message from the system.',
        read: false
      })
      .select()
      .single();
      
    if (messageError) {
      console.error('Error creating message:', messageError);
      return;
    }
    
    console.log('✅ Message created successfully!');
    console.log(`Message ID: ${message.id}`);
    console.log(`Content: ${message.message}`);
    console.log('This should trigger a real-time notification in the frontend.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Main function to run all tests
async function runRealNotificationTests() {
  console.log('🚀 Starting real-time notification tests...\n');
  
  await testRealWalletNotification();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testRealOrderNotification();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testRealMessageNotification();
  
  console.log('\n✨ All real-time notification tests completed!');
  console.log('Check your frontend application to see the notifications appear.');
}

// Run the tests
runRealNotificationTests().catch(console.error);
