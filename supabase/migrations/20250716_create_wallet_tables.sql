-- Create wallets table for users
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance TEXT NOT NULL DEFAULT '0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_wallet UNIQUE (user_id)
);

-- Create driver_wallets table
CREATE TABLE IF NOT EXISTS driver_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    balance TEXT NOT NULL DEFAULT '0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_driver_wallet UNIQUE (driver_id)
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID,
    amount TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earnings', 'payment', 'refund', 'withdrawal', 'deposit')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    description TEXT,
    payment_method TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints with ON DELETE CASCADE
ALTER TABLE wallet_transactions
ADD CONSTRAINT fk_wallet_transactions_wallet
FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for wallets
CREATE POLICY "Users can view their own wallet"
ON wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON wallets FOR UPDATE
USING (auth.uid() = user_id);

-- Create policies for driver_wallets
CREATE POLICY "Drivers can view their own wallet"
ON driver_wallets FOR SELECT
USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own wallet"
ON driver_wallets FOR UPDATE
USING (auth.uid() = driver_id);

-- Create policies for wallet_transactions
CREATE POLICY "Users can view their own wallet transactions"
ON wallet_transactions FOR SELECT
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
        UNION
        SELECT id FROM driver_wallets WHERE driver_id = auth.uid()
    )
);

-- Create function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- For new transactions
    IF TG_OP = 'INSERT' THEN
        -- Check if this is a user wallet transaction
        IF EXISTS (SELECT 1 FROM wallets WHERE id = NEW.wallet_id) THEN
            IF NEW.type = 'earnings' OR NEW.type = 'deposit' OR NEW.type = 'refund' THEN
                -- Credit the wallet
                UPDATE wallets
                SET balance = (COALESCE(balance::numeric, 0) + NEW.amount::numeric)::text,
                    updated_at = NOW()
                WHERE id = NEW.wallet_id;
            ELSIF NEW.type = 'payment' OR NEW.type = 'withdrawal' THEN
                -- Debit the wallet
                UPDATE wallets
                SET balance = (COALESCE(balance::numeric, 0) - NEW.amount::numeric)::text,
                    updated_at = NOW()
                WHERE id = NEW.wallet_id;
            END IF;
        -- Check if this is a driver wallet transaction
        ELSIF EXISTS (SELECT 1 FROM driver_wallets WHERE id = NEW.wallet_id) THEN
            IF NEW.type = 'earnings' OR NEW.type = 'deposit' OR NEW.type = 'refund' THEN
                -- Credit the wallet
                UPDATE driver_wallets
                SET balance = (COALESCE(balance::numeric, 0) + NEW.amount::numeric)::text,
                    updated_at = NOW()
                WHERE id = NEW.wallet_id;
            ELSIF NEW.type = 'payment' OR NEW.type = 'withdrawal' THEN
                -- Debit the wallet
                UPDATE driver_wallets
                SET balance = (COALESCE(balance::numeric, 0) - NEW.amount::numeric)::text,
                    updated_at = NOW()
                WHERE id = NEW.wallet_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet_transactions
CREATE TRIGGER update_wallet_balance_trigger
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();
