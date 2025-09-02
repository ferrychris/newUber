import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcyodecaeoeiadwyyzrz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjeW9kZWNhZW9laWFkd3l5enJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwNTEzOTQsImV4cCI6MjA1NjYyNzM5NH0.9CcesMivK0TDQ6BGvyxkar9Ezcc1Pmi2ctp4yo7ck-g';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to create a test driver
async function createTestDriver() {
  console.log('Creating test driver...');
  
  // Generate a proper UUID
  const testUserId = randomUUID();
  
  // Create driver record
  const { data, error } = await supabase
    .from('drivers')
    .insert([
      {
        id: testUserId,
        license_number: 'TEST-' + Date.now(),
        license_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        vehicle_type: 'car',
        vehicle_make: 'Test',
        vehicle_model: 'Model',
        vehicle_year: 2025,
        vehicle_color: 'Blue',
        vehicle_plate: 'TEST-' + Math.floor(Math.random() * 1000),
        total_rides: 0,
        average_rating: 0.00,
        created_at: new Date().toISOString()
      }
    ])
    .select();
    
  if (error) {
    console.error('Error creating test driver:', error);
    return null;
  }
  
  console.log('Test driver created successfully:', data[0]);
  return data[0];
}

// Function to create a test wallet for the driver
async function createTestWallet(driverUserId) {
  console.log('Creating test wallet for driver:', driverUserId);
  
  // Create wallet record
  const { data, error } = await supabase
    .from('wallets')
    .insert([
      {
        user_id: driverUserId,
        user_type: 'driver',
        balance: '0.00',
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select();
    
  if (error) {
    console.error('Error creating test wallet:', error);
    return null;
  }
  
  console.log('Test wallet created successfully:', data[0]);
  return data[0];
}

// Main setup function
async function setupTestData() {
  console.log('Setting up test data for notification system...');
  
  // Use existing driver
  const driverId = '74a4c03f-64cf-4e0b-8a51-3fd0f38fcd78';
  console.log('Using existing driver ID:', driverId);
  
  // Check if driver already has a wallet
  const { data: existingWallet, error: walletCheckError } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', driverId)
    .eq('user_type', 'driver');
    
  if (walletCheckError) {
    console.error('Error checking for existing wallet:', walletCheckError);
    process.exit(1);
  }
  
  let wallet;
  if (existingWallet && existingWallet.length > 0) {
    console.log('Driver already has a wallet:', existingWallet[0].id);
    wallet = existingWallet[0];
  } else {
    // Create test wallet for the driver
    wallet = await createTestWallet(driverId);
    if (!wallet) {
      console.error('Failed to create test wallet');
      process.exit(1);
    }
  }
  
  // Get an existing order for testing
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('driver_id', driverId)
    .limit(1);
    
  if (orderError) {
    console.error('Error fetching order:', orderError);
    process.exit(1);
  }
  
  if (!order || order.length === 0) {
    console.error('No orders found for driver');
    process.exit(1);
  }
  
  console.log('Test data setup completed successfully!');
  console.log('Driver ID:', driverId);
  console.log('Wallet ID:', wallet.id);
  console.log('Order ID:', order[0].id);
  
  // Save these IDs to environment variables for easy testing
  console.log('\nTo test notifications, run:');
  console.log(`node scripts/test-notifications.mjs ${driverId} ${order[0].id}`);
}

// Run the setup
setupTestData().catch(console.error);
