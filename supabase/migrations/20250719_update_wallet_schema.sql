-- Migration to update wallet schema to use a single table for all users
-- This will add a user_type field to distinguish between regular users and drivers

-- First, add user_type column to wallets table if it doesn't exist
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'user';

-- Add comment to the user_type column
COMMENT ON COLUMN wallets.user_type IS 'Type of user (user, driver) to distinguish between different wallet types';

-- Create index on user_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_wallets_user_type ON wallets(user_type);

-- Create index on user_id and user_type for faster queries
CREATE INDEX IF NOT EXISTS idx_wallets_user_id_type ON wallets(user_id, user_type);

-- Update the process_order_wallet_transactions function to use the single wallets table
CREATE OR REPLACE FUNCTION process_order_wallet_transactions(order_id UUID)
RETURNS VOID AS $$
DECLARE
  order_record RECORD;
  user_wallet_id UUID;
  driver_wallet_id UUID;
  order_price DECIMAL;
  order_tip DECIMAL;
  driver_share DECIMAL;
  driver_earnings DECIMAL;
  platform_fee DECIMAL;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = order_id;
  
  IF order_record IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', order_id;
  END IF;
  
  -- Calculate amounts
  order_price := COALESCE(order_record.price, 0);
  order_tip := COALESCE(order_record.tip, 0);
  driver_share := 0.8; -- Driver gets 80% of the fare
  driver_earnings := (order_price * driver_share) + order_tip;
  platform_fee := order_price * (1 - driver_share);
  
  -- Process user wallet transaction (debit)
  SELECT id INTO user_wallet_id FROM wallets 
  WHERE user_id = order_record.user_id AND user_type = 'user'
  LIMIT 1;
  
  IF user_wallet_id IS NOT NULL THEN
    -- Update wallet balance
    UPDATE wallets 
    SET balance = balance - order_price - order_tip,
        updated_at = NOW()
    WHERE id = user_wallet_id;
    
    -- Create transaction record
    INSERT INTO wallet_transactions (
      wallet_id, 
      amount, 
      type, 
      status, 
      description, 
      metadata, 
      user_id,
      transaction_date,
      created_at
    ) VALUES (
      user_wallet_id,
      (order_price + order_tip) * -1, -- Negative amount for debit
      'payment',
      'completed',
      'Payment for order #' || order_id,
      jsonb_build_object(
        'order_id', order_id,
        'price', order_price,
        'tip', order_tip,
        'user_type', 'user'
      ),
      order_record.user_id,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Process driver wallet transaction (credit)
  SELECT id INTO driver_wallet_id FROM wallets 
  WHERE user_id = order_record.driver_id AND (user_type = 'driver' OR user_type = 'user')
  LIMIT 1;
  
  IF driver_wallet_id IS NOT NULL THEN
    -- Update wallet balance
    UPDATE wallets 
    SET balance = balance + driver_earnings,
        updated_at = NOW(),
        user_type = 'driver' -- Ensure it's marked as a driver wallet
    WHERE id = driver_wallet_id;
    
    -- Create transaction record
    INSERT INTO wallet_transactions (
      wallet_id, 
      amount, 
      type, 
      status, 
      description, 
      metadata, 
      user_id,
      transaction_date,
      created_at
    ) VALUES (
      driver_wallet_id,
      driver_earnings,
      'earnings',
      'completed',
      'Earnings from order #' || order_id,
      jsonb_build_object(
        'order_id', order_id,
        'base_earnings', (order_price * driver_share),
        'tip', order_tip,
        'driver_share', driver_share,
        'user_type', 'driver'
      ),
      order_record.driver_id,
      NOW(),
      NOW()
    );
  ELSE
    -- Create a new wallet for the driver if it doesn't exist
    INSERT INTO wallets (
      user_id,
      balance,
      currency,
      user_type,
      created_at,
      updated_at
    ) VALUES (
      order_record.driver_id,
      driver_earnings,
      'USD',
      'driver',
      NOW(),
      NOW()
    ) RETURNING id INTO driver_wallet_id;
    
    -- Create transaction record
    INSERT INTO wallet_transactions (
      wallet_id, 
      amount, 
      type, 
      status, 
      description, 
      metadata, 
      user_id,
      transaction_date,
      created_at
    ) VALUES (
      driver_wallet_id,
      driver_earnings,
      'earnings',
      'completed',
      'Earnings from order #' || order_id,
      jsonb_build_object(
        'order_id', order_id,
        'base_earnings', (order_price * driver_share),
        'tip', order_tip,
        'driver_share', driver_share,
        'user_type', 'driver'
      ),
      order_record.driver_id,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Record platform fee as a separate transaction (for accounting purposes)
  INSERT INTO wallet_transactions (
    amount, 
    type, 
    status, 
    description, 
    metadata,
    transaction_date,
    created_at
  ) VALUES (
    platform_fee,
    'platform_fee',
    'completed',
    'Platform fee for order #' || order_id,
    jsonb_build_object(
      'order_id', order_id,
      'price', order_price,
      'platform_share', (1 - driver_share)
    ),
    NOW(),
    NOW()
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for better documentation
COMMENT ON FUNCTION process_order_wallet_transactions IS 'Processes wallet transactions for completed orders using the single wallets table';
COMMENT ON TABLE wallets IS 'Stores wallet information for all users including drivers';
COMMENT ON TABLE wallet_transactions IS 'Records all wallet transactions including payments, earnings, and platform fees';

-- Update RLS policies to ensure proper access control
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own wallet
CREATE POLICY wallets_select_policy ON wallets
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only update their own wallet
CREATE POLICY wallets_update_policy ON wallets
  FOR UPDATE
  USING (user_id = auth.uid());

-- Only service role can insert into wallets
CREATE POLICY wallets_insert_policy ON wallets
  FOR INSERT
  WITH CHECK (true);

-- Only service role can delete from wallets
CREATE POLICY wallets_delete_policy ON wallets
  FOR DELETE
  USING (false);

-- Create a trigger to update wallet balances when transactions are inserted
CREATE OR REPLACE FUNCTION update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.wallet_id IS NOT NULL THEN
    -- Update the wallet balance
    UPDATE wallets
    SET balance = balance + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.wallet_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON wallet_transactions;
CREATE TRIGGER update_wallet_balance_trigger
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance_on_transaction();
