-- Update the create_pending_stripe_transaction function to include metadata and fix transaction type
CREATE OR REPLACE FUNCTION create_pending_stripe_transaction(
    p_wallet_id UUID,
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_stripe_session_id VARCHAR(255),
    p_description TEXT DEFAULT 'Wallet top-up via Stripe',
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
    v_wallet_currency VARCHAR(3);
    v_wallet_balance DECIMAL(10,2);
BEGIN
    -- Get wallet details for validation
    SELECT currency, balance INTO v_wallet_currency, v_wallet_balance
    FROM wallets
    WHERE id = p_wallet_id AND user_id = p_user_id
    FOR UPDATE; -- Lock the wallet row to prevent race conditions
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found or access denied';
    END IF;

    -- Insert pending transaction with metadata
    INSERT INTO wallet_transactions (
        wallet_id,
        user_id,
        amount,
        type,
        status,
        description,
        payment_method,
        stripe_session_id,
        metadata,
        transaction_date,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_id,
        p_user_id,
        p_amount,
        'wallet_topup', -- Always use wallet_topup for consistency
        'pending',
        p_description,
        'stripe',
        p_stripe_session_id,
        COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
            'wallet_currency', v_wallet_currency,
            'wallet_balance_before', v_wallet_balance,
            'created_at', NOW()
        ),
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id INTO transaction_id;
    
    -- Log the transaction creation
    RAISE NOTICE 'Created pending transaction % for wallet % (user %), amount: %', 
        transaction_id, p_wallet_id, p_user_id, p_amount;
    
    RETURN transaction_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create pending transaction: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the update_wallet_from_stripe_webhook function to handle metadata and ensure proper transaction processing
CREATE OR REPLACE FUNCTION update_wallet_from_stripe_webhook(
    p_stripe_session_id VARCHAR(255),
    p_stripe_payment_intent_id VARCHAR(255),
    p_status VARCHAR(20),
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    transaction_record RECORD;
    wallet_record RECORD;
    v_updated_rows INTEGER;
    v_transaction_id UUID;
    v_metadata JSONB;
    v_previous_status TEXT;
    v_amount DECIMAL(10,2);
    v_wallet_id UUID;
    v_user_id UUID;
    v_wallet_balance_before DECIMAL(10,2);
    v_wallet_balance_after DECIMAL(10,2);
    v_metadata_updates JSONB;
BEGIN
    -- Start by finding the transaction by Stripe session ID
    SELECT id, status, amount, wallet_id, user_id, metadata 
    INTO transaction_record
    FROM wallet_transactions 
    WHERE stripe_session_id = p_stripe_session_id
    FOR UPDATE; -- Lock the transaction row to prevent race conditions
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No transaction found with stripe_session_id: %', p_stripe_session_id;
        
        -- If no transaction found by session ID, try payment intent ID
        IF p_stripe_payment_intent_id IS NOT NULL THEN
            SELECT id, status, amount, wallet_id, user_id, metadata 
            INTO transaction_record
            FROM wallet_transactions 
            WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
            FOR UPDATE;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'No transaction found with stripe_session_id: % or stripe_payment_intent_id: %', 
                    p_stripe_session_id, p_stripe_payment_intent_id;
            END IF;
        ELSE
            RAISE EXCEPTION 'No transaction found with stripe_session_id: %', p_stripe_session_id;
        END IF;
    END IF;
    
    -- Store values for later use
    v_transaction_id := transaction_record.id;
    v_previous_status := transaction_record.status;
    v_amount := transaction_record.amount;
    v_wallet_id := transaction_record.wallet_id;
    v_user_id := transaction_record.user_id;
    
    -- Don't process if already in the target status
    IF v_previous_status = p_status THEN
        RAISE NOTICE 'Transaction % already in status: %', v_transaction_id, p_status;
        RETURN v_transaction_id;
    END IF;
    
    -- Get current wallet balance
    SELECT balance INTO v_wallet_balance_before
    FROM wallets 
    WHERE id = v_wallet_id AND user_id = v_user_id
    FOR UPDATE; -- Lock the wallet row to prevent race conditions
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for transaction %', v_transaction_id;
    END IF;
    
    -- Prepare metadata updates
    v_metadata_updates := COALESCE(transaction_record.metadata, '{}'::jsonb) || 
        jsonb_build_object(
            'updated_at', NOW(),
            'previous_status', v_previous_status,
            'new_status', p_status,
            'wallet_balance_before', v_wallet_balance_before,
            'stripe_payment_intent_id', COALESCE(p_stripe_payment_intent_id, transaction_record.metadata->>'stripe_payment_intent_id')
        );
    
    -- Merge with provided metadata if any
    IF p_metadata IS NOT NULL THEN
        v_metadata_updates := v_metadata_updates || p_metadata;
    END IF;
    
    -- Update the transaction status and metadata
    UPDATE wallet_transactions 
    SET 
        status = p_status,
        stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
        metadata = v_metadata_updates,
        updated_at = NOW()
    WHERE id = v_transaction_id
    RETURNING metadata INTO v_metadata;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
    IF v_updated_rows = 0 THEN
        RAISE EXCEPTION 'Failed to update transaction %', v_transaction_id;
    END IF;
    
    -- If payment is completed, update wallet balance
    IF p_status = 'completed' AND v_amount > 0 THEN
        -- Update wallet balance
        UPDATE wallets 
        SET 
            balance = balance + v_amount,
            updated_at = NOW()
        WHERE id = v_wallet_id
        RETURNING balance INTO v_wallet_balance_after;
        
        -- Update metadata with balance after update
        v_metadata := v_metadata || jsonb_build_object(
            'wallet_balance_after', v_wallet_balance_after,
            'balance_updated_at', NOW()
        );
        
        -- Update transaction with final metadata
        UPDATE wallet_transactions 
        SET metadata = v_metadata
        WHERE id = v_transaction_id;
        
        RAISE NOTICE 'Updated wallet % balance: % -> % (transaction: %, amount: %)', 
            v_wallet_id, v_wallet_balance_before, v_wallet_balance_after, v_transaction_id, v_amount;
    END IF;
    
    RETURN v_transaction_id;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error with context
    RAISE WARNING 'Error in update_wallet_from_stripe_webhook: %', SQLERRM;
    RAISE WARNING 'Transaction: %, Status: %, Wallet: %', 
        v_transaction_id, p_status, v_wallet_id;
    
    -- Re-raise the exception to ensure the webhook handler knows it failed
    RAISE EXCEPTION 'Failed to process webhook: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
