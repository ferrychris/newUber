import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@11.18.0?target=deno';
import { supabase } from '../../utils/supabase';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Deno.createHttpClient({
    caCerts: [],
  }),
});

export const assignWalletAmount = async (userId: string, amount: number) => {
  const { data, error } = await supabase
    .from("wallets")
    .update({ balance: amount })
    .eq("user_id", userId);

  if (error) throw error;
  return data;
};

serve(async (req) => {
  try {
    // Parse request body
    const { amount, userId } = await req.json();
    
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be greater than 0' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the user's wallet balance from Supabase
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      console.error('Error fetching wallet balance:', walletError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch wallet balance' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (walletData.balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient funds in wallet' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deduct the amount from the wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: walletData.balance - amount })
      .eq('user_id', userId);

    if (deductError) {
      console.error('Error deducting from wallet:', deductError);
      return new Response(
        JSON.stringify({ error: 'Failed to deduct from wallet' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a transaction record in the transactions table
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        order_id: null, // This can be updated later once the order is created
        amount: amount,
        status: 'completed',
        payment_method: 'wallet',
      });

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction record' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a PaymentIntent with the specified amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents
      currency: 'usd',
      metadata: { userId },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Return the client secret to the client
    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
