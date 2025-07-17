// Script to test wallet transactions for orders
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key not found in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWalletTransactions() {
  try {
    console.log('Starting wallet transaction test...');
    
    // 1. Find a completed order with a driver
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, driver_id, status, price')
      .in('status', ['delivered', 'completed'])
      .not('driver_id', 'is', null)
      .limit(1);
      
    if (orderError) {
      console.error('Error fetching orders:', orderError);
      return;
    }
    
    if (!orders || orders.length === 0) {
      console.log('No completed orders with drivers found. Creating a test order...');
      // You could create a test order here if needed
      return;
    }
    
    const testOrder = orders[0];
    console.log('Found test order:', testOrder);
    
    // 2. Check if wallet transactions exist for this order
    const { data: transactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .filter('metadata->order_id', 'eq', testOrder.id);
      
    if (txError) {
      console.error('Error checking wallet transactions:', txError);
      return;
    }
    
    console.log(`Found ${transactions?.length || 0} existing transactions for order ${testOrder.id}`);
    
    // 3. If no transactions exist, create them manually
    if (!transactions || transactions.length === 0) {
      console.log('No transactions found, creating test transactions...');
      
      // 3a. Create a customer wallet transaction (payment)
      const { data: customerWallet, error: customerWalletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', testOrder.user_id)
        .maybeSingle();
        
      if (customerWalletError) {
        console.error('Error fetching customer wallet:', customerWalletError);
      }
      
      let customerWalletId;
      if (!customerWallet) {
        // Create customer wallet
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            user_id: testOrder.user_id,
            balance: '100.00', // Give them some balance
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
          
        if (createError) {
          console.error('Error creating customer wallet:', createError);
          return;
        }
        
        customerWalletId = newWallet.id;
        console.log(`Created new customer wallet with ID: ${customerWalletId}`);
      } else {
        customerWalletId = customerWallet.id;
      }
      
      // Create payment transaction
      const paymentAmount = testOrder.price > 0 ? testOrder.price : 10.00;
      const { error: paymentError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: customerWalletId,
          amount: paymentAmount.toString(),
          type: 'payment',
          status: 'completed',
          description: `Payment for order #${testOrder.id}`,
          payment_method: 'order_payment',
          metadata: { order_id: testOrder.id },
          user_id: testOrder.user_id,
          transaction_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        
      if (paymentError) {
        console.error('Error creating payment transaction:', paymentError);
      } else {
        console.log(`Created payment transaction for customer ${testOrder.user_id}`);
      }
      
      // 3b. Create a driver wallet transaction (earnings)
      if (testOrder.driver_id) {
        const { data: driverWallet, error: driverWalletError } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', testOrder.driver_id)
          .maybeSingle();
          
        if (driverWalletError) {
          console.error('Error fetching driver wallet:', driverWalletError);
        }
        
        let driverWalletId;
        if (!driverWallet) {
          // Create driver wallet
          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert({
              user_id: testOrder.driver_id,
              balance: '0.00',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();
            
          if (createError) {
            console.error('Error creating driver wallet:', createError);
            return;
          }
          
          driverWalletId = newWallet.id;
          console.log(`Created new driver wallet with ID: ${driverWalletId}`);
        } else {
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
      .filter('metadata->order_id', 'eq', testOrder.id);
      
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
