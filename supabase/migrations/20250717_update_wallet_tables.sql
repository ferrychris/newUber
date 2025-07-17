-- Add user_id column to wallet_transactions table for better tracking
ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add transaction_date column to wallet_transactions table
ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add status column if it doesn't exist (might already be there)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'wallet_transactions' 
                  AND column_name = 'status') THEN
        ALTER TABLE wallet_transactions
        ADD COLUMN status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed'));
    END IF;
END $$;

-- Create policies for inserting into wallets
CREATE POLICY "Service role can create wallets"
ON wallets FOR INSERT
TO authenticated
USING (true);

-- Create policies for inserting into wallet_transactions
CREATE POLICY "Service role can create wallet transactions"
ON wallet_transactions FOR INSERT
TO authenticated
USING (true);

-- Create policies for inserting into driver_wallets
CREATE POLICY "Service role can create driver wallets"
ON driver_wallets FOR INSERT
TO authenticated
USING (true);

-- Create index for faster wallet transaction lookups by order_id
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id
ON wallet_transactions ((metadata->>'order_id'));

-- Create index for faster wallet transaction lookups by user_id
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id
ON wallet_transactions (user_id);

-- Create index for faster wallet lookups by user_id
CREATE INDEX IF NOT EXISTS idx_wallets_user_id
ON wallets (user_id);

-- Create index for faster driver wallet lookups by driver_id
CREATE INDEX IF NOT EXISTS idx_driver_wallets_driver_id
ON driver_wallets (driver_id);
