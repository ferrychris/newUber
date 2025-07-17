#!/usr/bin/env node

/**
 * Test script for order status tracking
 * 
 * This script tests the order status tracking functionality by:
 * 1. Finding an existing order or creating a new test order
 * 2. Cycling through all the possible order statuses
 * 3. Verifying that the status updates are reflected in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Initialize Supabase client with service role key for testing
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcyodecaeoeiadwyyzrz.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY is required for this test script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define the order status progression for testing
// Only include statuses that are valid in the database's order_status enum
const ORDER_STATUS_PROGRESSION = [
  'pending',
  'accepted',
  'en_route',
  'arrived',
  'picked_up',
  'delivered',
  'completed'
];

// Function to find or create a test order
async function findOrCreateTestOrder() {
  console.log('Looking for an existing test order...');
  
  // Try to find an existing test order
  const { data: existingOrders, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('metadata->is_test', true)
    .limit(1);
  
  if (findError) {
    console.error('Error finding test order:', findError);
    process.exit(1);
  }
  
  if (existingOrders && existingOrders.length > 0) {
    console.log('Found existing test order:', existingOrders[0].id);
    return existingOrders[0];
  }
  
  console.log('No test order found. Creating a new test order...');
  
  // Find a test user or any user from profiles table
  const { data: profiles, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  
  if (userError || !profiles || profiles.length === 0) {
    console.error('Error finding a profile for test order:', userError);
    process.exit(1);
  }
  
  const userId = profiles[0].id;
  
  // Create a new test order
  const { data: newOrder, error: createError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      status: 'pending',
      price: 25.00,
      pickup_location: '123 Test St, Paris, France',
      dropoff_location: '456 Test Ave, Paris, France',
      metadata: { is_test: true, test_created_at: new Date().toISOString() }
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating test order:', createError);
    process.exit(1);
  }
  
  console.log('Created new test order:', newOrder.id);
  return newOrder;
}

// Function to update order status
async function updateOrderStatus(orderId, status) {
  console.log(`Updating order ${orderId} to status: ${status}`);
  
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating order status to ${status}:`, error);
    return false;
  }
  
  console.log(`Successfully updated order status to ${status}`);
  return data;
}

// Function to verify order status
async function verifyOrderStatus(orderId, expectedStatus) {
  console.log(`Verifying order ${orderId} has status: ${expectedStatus}`);
  
  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();
  
  if (error) {
    console.error('Error verifying order status:', error);
    return false;
  }
  
  const actualStatus = data.status;
  const isMatch = actualStatus === expectedStatus;
  
  if (isMatch) {
    console.log(`✅ Status verification passed: ${actualStatus}`);
  } else {
    console.error(`❌ Status verification failed: Expected ${expectedStatus}, got ${actualStatus}`);
  }
  
  return isMatch;
}

// Function to check order status history
async function checkOrderStatusHistory(orderId) {
  console.log(`Checking status history for order ${orderId}`);
  
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching order status history:', error);
    return;
  }
  
  console.log(`Found ${data.length} status history records:`);
  data.forEach((record, index) => {
    console.log(`${index + 1}. ${record.old_status} -> ${record.new_status} at ${record.created_at}`);
  });
}

// Main test function
async function testOrderStatusTracking() {
  try {
    console.log('=== Starting Order Status Tracking Test ===');
    
    // Find or create a test order
    const testOrder = await findOrCreateTestOrder();
    console.log('Test order:', testOrder);
    
    // Reset the order to pending status if it's not already
    if (testOrder.status !== 'pending') {
      await updateOrderStatus(testOrder.id, 'pending');
      await setTimeout(1000); // Wait for the update to propagate
    }
    
    // Cycle through all statuses
    for (const status of ORDER_STATUS_PROGRESSION) {
      // Update the status
      await updateOrderStatus(testOrder.id, status);
      
      // Wait for the update to propagate
      await setTimeout(1000);
      
      // Verify the status was updated correctly
      const isVerified = await verifyOrderStatus(testOrder.id, status);
      if (!isVerified) {
        console.error(`Failed to verify status update to ${status}`);
      }
      
      // Wait between status updates
      await setTimeout(2000);
    }
    
    // Check the order status history
    await checkOrderStatusHistory(testOrder.id);
    
    console.log('=== Order Status Tracking Test Completed ===');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testOrderStatusTracking();
