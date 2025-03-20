import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Parse request body
    const { fromWalletId, toWalletId, amount, description } = await req.json();
    
    if (!fromWalletId || !toWalletId || !amount) {
      return new Response(
        JSON.stringify({ error: 'fromWalletId, toWalletId, and amount are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get source wallet balance
    const { data: sourceWallet, error: sourceWalletError } = await supabase
      .from('wallets')
      .select('balance, user_id')
      .eq('id', fromWalletId)
      .single();

    if (sourceWalletError) {
      return new Response(
        JSON.stringify({ error: 'Source wallet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check sufficient balance
    if (sourceWallet.balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance in source wallet' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get destination wallet
    const { data: destWallet, error: destWalletError } = await supabase
      .from('wallets')
      .select('balance, user_id')
      .eq('id', toWalletId)
      .single();

    if (destWalletError) {
      return new Response(
        JSON.stringify({ error: 'Destination wallet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Begin transaction to update both wallets
    const timestamp = new Date().toISOString();
    const transferRef = `transfer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 1. Update source wallet (subtract amount)
    const { error: updateSourceError } = await supabase
      .from('wallets')
      .update({ 
        balance: sourceWallet.balance - amount,
        last_updated: timestamp
      })
      .eq('id', fromWalletId);

    if (updateSourceError) {
      throw updateSourceError;
    }

    // 2. Update destination wallet (add amount)
    const { error: updateDestError } = await supabase
      .from('wallets')
      .update({ 
        balance: destWallet.balance + amount,
        last_updated: timestamp
      })
      .eq('id', toWalletId);

    if (updateDestError) {
      // If this fails, we should try to rollback the source wallet update
      await supabase
        .from('wallets')
        .update({ 
          balance: sourceWallet.balance,
          last_updated: timestamp
        })
        .eq('id', fromWalletId);
        
      throw updateDestError;
    }

    // 3. Create source transaction record (payment)
    const { error: sourceTransactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: fromWalletId,
        amount: amount,
        type: 'payment',
        status: 'completed',
        reference: transferRef,
        description: description || 'Transfer to another user',
        payment_method: 'wallet',
        metadata: {
          to_wallet_id: toWalletId,
          to_user_id: destWallet.user_id
        }
      });

    if (sourceTransactionError) {
      throw sourceTransactionError;
    }

    // 4. Create destination transaction record (earnings)
    const { error: destTransactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: toWalletId,
        amount: amount,
        type: 'earnings',
        status: 'completed',
        reference: transferRef,
        description: description || 'Received from another user',
        payment_method: 'wallet',
        metadata: {
          from_wallet_id: fromWalletId,
          from_user_id: sourceWallet.user_id
        }
      });

    if (destTransactionError) {
      throw destTransactionError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transfer_reference: transferRef,
        from_wallet: {
          id: fromWalletId,
          new_balance: sourceWallet.balance - amount
        },
        to_wallet: {
          id: toWalletId,
          new_balance: destWallet.balance + amount
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing wallet transfer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
