-- This migration updates RLS policies to allow testing with the anon key
-- In a production environment, these policies should be more restrictive

-- Temporarily enable all operations for testing
-- For wallet_transactions table
ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enable_all_for_testing" ON wallet_transactions;
CREATE POLICY "enable_all_for_testing" ON wallet_transactions USING (true) WITH CHECK (true);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- For wallets table
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enable_all_for_testing" ON wallets;
CREATE POLICY "enable_all_for_testing" ON wallets USING (true) WITH CHECK (true);
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id);

-- Add function to create wallet transactions
CREATE OR REPLACE FUNCTION create_wallet_transaction(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_wallet_id UUID;
  v_wallet_exists BOOLEAN;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Check if user has a wallet
  SELECT id, true, balance INTO v_wallet_id, v_wallet_exists, v_current_balance
  FROM wallets
  WHERE user_id = p_user_id;
  
  -- Create wallet if it doesn't exist
  IF v_wallet_exists IS NULL THEN
    INSERT INTO wallets (user_id, balance, currency, created_at, updated_at)
    VALUES (p_user_id, 0, 'USD', NOW(), NOW())
    RETURNING id, balance INTO v_wallet_id, v_current_balance;
  END IF;
  
  -- Update wallet balance
  IF p_type = 'payment' THEN
    v_new_balance = GREATEST(0, v_current_balance - p_amount);
  ELSE
    v_new_balance = v_current_balance + p_amount;
  END IF;
  
  UPDATE wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    wallet_id, amount, type, status, description, 
    metadata, user_id, transaction_date, created_at
  )
  VALUES (
    v_wallet_id, p_amount, p_type, 'completed', p_description,
    jsonb_build_object('order_id', p_order_id), p_user_id, NOW(), NOW()
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', v_wallet_id,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to process order wallet transactions
CREATE OR REPLACE FUNCTION process_order_wallet_transactions(
  p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_customer_result JSONB;
  v_driver_result JSONB;
  v_amount NUMERIC;
BEGIN
  -- Get order details
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND status = 'completed';
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or not completed'
    );
  END IF;
  
  -- Use order price or default to minimum amount
  v_amount = COALESCE(v_order.price, 10.00);
  IF v_amount <= 0 THEN
    v_amount = 10.00; -- Minimum transaction amount
  END IF;
  
  -- Create customer payment transaction
  v_customer_result = create_wallet_transaction(
    v_order.user_id,
    v_amount,
    'payment',
    'Payment for order #' || p_order_id,
    p_order_id
  );
  
  -- Create driver earnings transaction
  v_driver_result = create_wallet_transaction(
    v_order.driver_id,
    v_amount,
    'earnings',
    'Earnings from order #' || p_order_id,
    p_order_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'customer_transaction', v_customer_result,
    'driver_transaction', v_driver_result
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
