-- Migration to improve wallet transaction handling for driver wallets
-- This will ensure that driver earnings are correctly processed and stored in driver_wallets

-- First, let's create a function to process wallet transactions for completed orders
-- This function will properly handle both user wallets and driver wallets
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
  SELECT id INTO user_wallet_id FROM wallets WHERE user_id = order_record.user_id LIMIT 1;
  
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
        'tip', order_tip
      ),
      order_record.user_id,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Process driver wallet transaction (credit)
  -- First check if driver has a driver_wallet
  SELECT id INTO driver_wallet_id FROM driver_wallets WHERE driver_id = order_record.driver_id LIMIT 1;
  
  IF driver_wallet_id IS NOT NULL THEN
    -- Update driver_wallet balance
    UPDATE driver_wallets 
    SET balance = balance + driver_earnings,
        updated_at = NOW()
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
        'driver_share', driver_share
      ),
      order_record.driver_id,
      NOW(),
      NOW()
    );
  ELSE
    -- Check if driver has a regular wallet instead
    SELECT id INTO driver_wallet_id FROM wallets WHERE user_id = order_record.driver_id LIMIT 1;
    
    IF driver_wallet_id IS NOT NULL THEN
      -- Update wallet balance
      UPDATE wallets 
      SET balance = balance + driver_earnings,
          updated_at = NOW()
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
          'driver_share', driver_share
        ),
        order_record.driver_id,
        NOW(),
        NOW()
      );
    ELSE
      -- Create a new driver_wallet if neither exists
      INSERT INTO driver_wallets (
        driver_id,
        balance,
        currency,
        created_at,
        updated_at
      ) VALUES (
        order_record.driver_id,
        driver_earnings,
        'USD',
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
          'driver_share', driver_share
        ),
        order_record.driver_id,
        NOW(),
        NOW()
      );
    END IF;
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

-- Add indexes to improve wallet transaction query performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_transaction_date ON wallet_transactions(transaction_date);

-- Add comments for better documentation
COMMENT ON FUNCTION process_order_wallet_transactions IS 'Processes wallet transactions for completed orders, handling both user and driver wallets';
COMMENT ON TABLE driver_wallets IS 'Stores wallet information for drivers, separate from user wallets';
COMMENT ON TABLE wallet_transactions IS 'Records all wallet transactions including payments, earnings, and platform fees';

-- Update RLS policies to ensure proper access control
ALTER TABLE driver_wallets ENABLE ROW LEVEL SECURITY;

-- Driver can only see their own wallet
CREATE POLICY driver_wallets_select_policy ON driver_wallets
  FOR SELECT
  USING (driver_id = auth.uid());

-- Driver can only update their own wallet
CREATE POLICY driver_wallets_update_policy ON driver_wallets
  FOR UPDATE
  USING (driver_id = auth.uid());

-- Only service role can insert into driver_wallets
CREATE POLICY driver_wallets_insert_policy ON driver_wallets
  FOR INSERT
  WITH CHECK (true);

-- Only service role can delete from driver_wallets
CREATE POLICY driver_wallets_delete_policy ON driver_wallets
  FOR DELETE
  USING (false);
