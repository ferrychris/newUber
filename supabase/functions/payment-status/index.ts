import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || ''
    if (!STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY in Edge Function environment')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: STRIPE_SECRET_KEY is missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY') || ''
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in Edge Function environment')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: Supabase URL/Anon Key missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    )

    // Get the session ID from the request
    const url = new URL(req.url)
    const sessionId = url.searchParams.get('session_id')

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get the transaction details from our database
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('wallet_transactions')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single()

    if (transactionError) {
      console.error('Error fetching transaction:', transactionError)
    }

    // Get updated wallet balance
    const { userId, walletId } = session.metadata || {}
    let walletBalance = null

    if (userId && walletId) {
      const { data: wallet, error: walletError } = await supabaseClient
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .eq('user_id', userId)
        .single()

      if (!walletError && wallet) {
        walletBalance = wallet.balance
      }
    }

    // Return the payment status and details
    return new Response(
      JSON.stringify({
        sessionId,
        paymentStatus: session.payment_status,
        paymentIntentStatus: session.payment_intent ? 'succeeded' : null,
        amount: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email,
        transaction: transaction || null,
        walletBalance,
        metadata: session.metadata,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error retrieving payment status:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to retrieve payment status',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
