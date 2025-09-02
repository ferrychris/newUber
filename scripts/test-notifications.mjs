import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcyodecaeoeiadwyyzrz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjeW9kZWNhZW9laWFkd3l5enJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwNTEzOTQsImV4cCI6MjA1NjYyNzM5NH0.9CcesMivK0TDQ6BGvyxkar9Ezcc1Pmi2ctp4yo7ck-g';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test function to simulate a wallet top-up
async function testWalletTopUp(driverId) {
  console.log('Testing wallet top-up notification...');
  
  // First, get the driver's wallet (using the single wallets table with user_type)
  const { data: driverWallet, error: walletError } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', driverId)
    .eq('user_type', 'driver')
    .single();
    
  if (walletError) {
    console.error('Error fetching driver wallet:', walletError);
    return;
  }
  
  // Create a wallet transaction (deposit)
  const { error } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: driverWallet.id,
      amount: '50.00',
      type: 'deposit',
      status: 'completed',
      description: 'Test deposit',
      metadata: JSON.stringify({ test: true })
    });
    
  if (error) {
    console.error('Error creating wallet transaction:', error);
    return;
  }
  
  console.log('Wallet top-up transaction created successfully!');
}

// Test function to simulate an order status change
async function testOrderStatusChange(orderId, newStatus) {
  console.log('Testing order status change notification...');
  
  // Update the order status
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);
    
  if (error) {
    console.error('Error updating order status:', error);
    return;
  }
  
  console.log(`Order status updated to ${newStatus} successfully!`);
}

// Main test function
async function runTests() {
  // Get driver ID and order ID from command line arguments or environment variables
  const args = process.argv.slice(2);
  const driverId = args[0] || process.env.TEST_DRIVER_ID;
  const orderId = args[1] || process.env.TEST_ORDER_ID;
  
  // If no driver ID provided, try to find an existing one
  let actualDriverId = driverId;
  if (!driverId) {
    console.log('No driver ID provided, checking for existing drivers...');
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('id, user_id')
      .limit(1);
    
    if (driversError || !drivers || drivers.length === 0) {
      console.log('No existing drivers found. Please provide a driver ID or create a driver first.');
      console.log('Usage: node test-notifications.mjs <driverId> <orderId>');
      process.exit(1);
    }
    
    actualDriverId = drivers[0].user_id;
    console.log(`Using existing driver ID: ${actualDriverId}`);
  }
  
  // If no order ID provided, use an existing one
  let actualOrderId = orderId;
  if (!orderId) {
    console.log('No order ID provided, checking for existing orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (ordersError || !orders || orders.length === 0) {
      console.log('No existing orders found. Please provide an order ID.');
      process.exit(1);
    }
    
    actualOrderId = orders[0].id;
    console.log(`Using existing order ID: ${actualOrderId}`);
  }
  
  console.log('Starting notification system tests...');
  console.log(`Driver ID: ${actualDriverId}`);
  console.log(`Order ID: ${actualOrderId}`);
  
  // Test wallet top-up
  await testWalletTopUp(actualDriverId);
  
  // Wait a bit before testing order status change
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test order status change
  await testOrderStatusChange(actualOrderId, 'accepted');
  
  console.log('All tests completed!');
}

// Run the tests
runTests().catch(console.error);
