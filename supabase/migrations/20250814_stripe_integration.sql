-- Migration for Stripe Integration
-- Adds necessary columns and indexes for Stripe payment processing

-- Add Stripe-specific columns to wallet_transactions table
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'manual';

-- Create indexes for better performance on Stripe lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_stripe_session 
ON wallet_transactions(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_stripe_payment_intent 
ON wallet_transactions(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Create index for payment method filtering
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_method 
ON wallet_transactions(payment_method);

-- Update existing transaction types to include 'deposit' for wallet top-ups
-- Check if the type column has constraints and update them
DO $$
BEGIN
    -- Add 'deposit' to the transaction type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%wallet_transactions_type%'
        AND check_clause LIKE '%deposit%'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
        
        -- Add new constraint with deposit type
        ALTER TABLE wallet_transactions 
        ADD CONSTRAINT wallet_transactions_type_check 
        CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'earnings', 'refund', 'fee'));
    END IF;
END $$;

-- Update existing transaction statuses to include Stripe-specific statuses
DO $$
BEGIN
    -- Add Stripe statuses to the status constraint if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%wallet_transactions_status%'
        AND check_clause LIKE '%pending%'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;
        
        -- Add new constraint with Stripe statuses
        ALTER TABLE wallet_transactions 
        ADD CONSTRAINT wallet_transactions_status_check 
        CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'processing'));
    END IF;
END $$;

-- Create a function to handle Stripe webhook transaction updates
CREATE OR REPLACE FUNCTION update_wallet_from_stripe_webhook(
    p_stripe_session_id VARCHAR(255),
    p_stripe_payment_intent_id VARCHAR(255),
    p_status VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    transaction_record RECORD;
    wallet_record RECORD;
BEGIN
    -- Find the transaction by Stripe session ID
    SELECT * INTO transaction_record 
    FROM wallet_transactions 
    WHERE stripe_session_id = p_stripe_session_id
    LIMIT 1;
    
    IF transaction_record IS NULL THEN
        RAISE NOTICE 'Transaction not found for session ID: %', p_stripe_session_id;
        RETURN FALSE;
    END IF;
    
    -- Update transaction status and payment intent ID
    UPDATE wallet_transactions 
    SET 
        status = p_status,
        stripe_payment_intent_id = p_stripe_payment_intent_id,
        updated_at = NOW()
    WHERE id = transaction_record.id;
    
    -- If payment is completed, update wallet balance
    IF p_status = 'completed' AND transaction_record.type = 'deposit' THEN
        -- Get wallet details
        SELECT * INTO wallet_record 
        FROM wallets 
        WHERE id = transaction_record.wallet_id;
        
        IF wallet_record IS NOT NULL THEN
            -- Update wallet balance
            UPDATE wallets 
            SET 
                balance = balance + transaction_record.amount,
                updated_at = NOW()
            WHERE id = transaction_record.wallet_id;
            
            RAISE NOTICE 'Wallet balance updated for wallet ID: %, amount: %', 
                transaction_record.wallet_id, transaction_record.amount;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create pending Stripe transactions
CREATE OR REPLACE FUNCTION create_pending_stripe_transaction(
    p_wallet_id UUID,
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_stripe_session_id VARCHAR(255),
    p_description TEXT DEFAULT 'Wallet top-up via Stripe'
)
RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
BEGIN
    -- Insert pending transaction
    INSERT INTO wallet_transactions (
        wallet_id,
        user_id,
        amount,
        type,
        status,
        description,
        payment_method,
        stripe_session_id,
        transaction_date,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_id,
        p_user_id,
        p_amount,
        'deposit',
        'pending',
        p_description,
        'stripe',
        p_stripe_session_id,
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id INTO transaction_id;
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions for the functions
GRANT EXECUTE ON FUNCTION update_wallet_from_stripe_webhook(VARCHAR, VARCHAR, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION create_pending_stripe_transaction(UUID, UUID, DECIMAL, VARCHAR, TEXT) TO service_role;

-- Create RLS policies for Stripe transactions
-- Users can only see their own transactions
CREATE POLICY "Users can view own stripe transactions" ON wallet_transactions
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own pending transactions (for checkout session creation)
CREATE POLICY "Users can create own pending transactions" ON wallet_transactions
    FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Service role can update any transaction (for webhook processing)
CREATE POLICY "Service role can update transactions" ON wallet_transactions
    FOR UPDATE USING (auth.role() = 'service_role');

-- Add comment to document the migration
COMMENT ON TABLE wallet_transactions IS 'Wallet transactions table with Stripe integration support';
COMMENT ON COLUMN wallet_transactions.stripe_session_id IS 'Stripe Checkout Session ID for payment tracking';
COMMENT ON COLUMN wallet_transactions.stripe_payment_intent_id IS 'Stripe Payment Intent ID for completed payments';
COMMENT ON COLUMN wallet_transactions.payment_method IS 'Payment method used (stripe, manual, bank_transfer, etc.)';

-- Create a view for Stripe transactions for easier querying
CREATE OR REPLACE VIEW stripe_transactions AS
SELECT 
    id,
    wallet_id,
    user_id,
    amount,
    type,
    status,
    description,
    stripe_session_id,
    stripe_payment_intent_id,
    created_at,
    updated_at
FROM wallet_transactions
WHERE payment_method = 'stripe'
AND stripe_session_id IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON stripe_transactions TO authenticated;
GRANT SELECT ON stripe_transactions TO service_role;
