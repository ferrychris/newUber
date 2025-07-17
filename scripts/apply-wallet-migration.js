// Script to apply wallet migration to the database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key not found in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyWalletMigration() {
  try {
    console.log('Starting wallet migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250716_create_wallet_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Error applying migration:', error);
      return;
    }
    
    console.log('Wallet migration applied successfully!');
    
    // Verify the tables were created
    console.log('Verifying wallet tables...');
    
    // Check wallets table
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id')
      .limit(1);
      
    if (walletsError) {
      console.error('Error verifying wallets table:', walletsError);
    } else {
      console.log('Wallets table created successfully');
    }
    
    // Check driver_wallets table
    const { data: driverWallets, error: driverWalletsError } = await supabase
      .from('driver_wallets')
      .select('id')
      .limit(1);
      
    if (driverWalletsError) {
      console.error('Error verifying driver_wallets table:', driverWalletsError);
    } else {
      console.log('Driver wallets table created successfully');
    }
    
    // Check wallet_transactions table
    const { data: transactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select('id')
      .limit(1);
      
    if (transactionsError) {
      console.error('Error verifying wallet_transactions table:', transactionsError);
    } else {
      console.log('Wallet transactions table created successfully');
    }
    
    console.log('Migration verification complete');
    
  } catch (err) {
    console.error('Unexpected error during migration:', err);
  }
}

// Run the migration
applyWalletMigration();
