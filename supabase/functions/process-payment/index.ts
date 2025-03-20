import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@11.18.0?target=deno';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Deno.createHttpClient({
    caCerts: [],
  }),
});

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Parse request body
    const { paymentIntentId, walletId, amount } = await req.json();
    
    if (!paymentIntentId || !walletId || !amount) {
      return new Response(
        JSON.stringify({ error: 'paymentIntentId, walletId, and amount are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment intent is successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return new Response(
        JSON.stringify({ error: 'Payment has not succeeded' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single();

    if (walletError) {
      throw walletError;
    }

    // Update wallet balance
    const newBalance = wallet.balance + (amount / 100); // Convert cents to dollars
    
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance, last_updated: new Date().toISOString() })
      .eq('id', walletId);

    if (updateError) {
      throw updateError;
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        amount: amount / 100, // Convert cents to dollars
        type: 'deposit',
        status: 'completed',
        reference: paymentIntentId,
        description: 'Wallet top-up via Stripe',
        payment_method: 'stripe',
        metadata: {
          payment_intent: paymentIntentId,
          stripe_status: paymentIntent.status
        }
      });

    if (transactionError) {
      throw transactionError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        walletId,
        newBalance
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
