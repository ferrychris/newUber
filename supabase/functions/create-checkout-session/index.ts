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

    // Get the request body
    const { amount, currency = 'usd', userId, walletId } = await req.json()

    // Validate required fields
    if (!amount || !userId || !walletId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: { required: ['amount', 'userId', 'walletId'] },
          received: { amount, userId, walletId }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId) || !uuidRegex.test(walletId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid ID format',
          details: 'Both userId and walletId must be valid UUIDs'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate amount (should be in cents and at least $1)
    if (amount < 100) {
      return new Response(
        JSON.stringify({ error: 'Amount must be at least $1.00 (100 cents)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user information for the checkout session
    const { data: user, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user.user) {
      console.error('Authentication error:', userError?.message || 'No user data')
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: userError?.message || 'User not authenticated'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify the requesting user matches the userId in the request
    if (user.user.id !== userId) {
      console.error('User ID mismatch:', { 
        requestUserId: userId, 
        authenticatedUserId: user.user.id 
      })
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          details: 'User ID does not match authenticated user'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify the wallet exists and belongs to the user
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('id, user_id, balance, currency')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single()

    if (walletError) {
      console.error('Wallet lookup error:', walletError.message)
      return new Response(
        JSON.stringify({ 
          error: 'Error retrieving wallet',
          details: walletError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!wallet) {
      console.error('Wallet not found or access denied:', { walletId, userId })
      return new Response(
        JSON.stringify({ 
          error: 'Wallet not found or access denied',
          details: `No wallet found with ID ${walletId} for user ${userId}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare metadata for the session
    const timestamp = new Date().toISOString()
    const metadata = {
      userId,
      walletId,
      type: 'wallet_topup', // Always use wallet_topup for consistency
      amount: amount.toString(),
      currency: currency.toLowerCase(),
      userEmail: user.user.email || '',
      timestamp,
      source: 'web_checkout',
      app_version: '1.0.0',
      // Add request ID for better tracing
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Create the checkout session
    const origin =
      req.headers.get('origin') ||
      Deno.env.get('PUBLIC_APP_URL') ||
      Deno.env.get('APP_URL') ||
      'http://localhost:5173'

    // Create a unique client reference ID for idempotency
    const clientReferenceId = `wallet_topup_${userId}_${Date.now()}`
    
    let session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: 'Wallet Top-up',
                description: `Add $${(amount / 100).toFixed(2)} to your wallet`,
              },
              unit_amount: amount, // amount in smallest currency unit (e.g., cents)
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/dashboard/wallet?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${origin}/dashboard/wallet?canceled=true`,
        metadata,
        client_reference_id: clientReferenceId,
        customer_email: user.user.email || undefined,
        payment_intent_data: {
          metadata: {
            ...metadata,
            description: `Wallet top-up of $${(amount / 100).toFixed(2)}`,
          },
        },
        // Set a 30-minute expiration for the checkout session
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      })
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment session',
          details: error.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Store the pending transaction using the database function
    try {
      const { data: transactionData, error: transactionError } = await supabaseClient
        .rpc('create_pending_stripe_transaction', {
          p_wallet_id: walletId,
          p_user_id: userId,
          p_amount: amount / 100, // Convert back to dollars for storage
          p_stripe_session_id: session.id,
          p_description: `Wallet top-up of $${(amount / 100).toFixed(2)} via Stripe`,
          p_metadata: {
            client_reference_id: clientReferenceId,
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown'
          }
        })

      if (transactionError) throw transactionError;
      
      console.log('Created pending transaction:', {
        transactionId: transactionData,
        walletId,
        amount: amount / 100,
        sessionId: session.id
      });
      
    } catch (error) {
      console.error('Error creating pending transaction:', error)
      
      // If we can't create a pending transaction, we need to cancel the Stripe session
      // and return an error to prevent orphaned payments
      try {
        await stripe.checkout.sessions.expire(session.id)
        console.log('Expired Stripe session due to transaction creation failure:', session.id)
      } catch (expireError) {
        console.error('Failed to expire Stripe session:', expireError)
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create pending transaction',
          details: 'Unable to prepare wallet transaction. Please try again.',
          code: 'TRANSACTION_CREATION_FAILED'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare the response with additional metadata
    const responseData = {
      sessionId: session.id,
      url: session.url,
      clientReferenceId,
      expiresAt: session.expires_at,
      amount: amount / 100,
      currency: currency.toLowerCase(),
      walletId,
      metadata: {
        ...metadata,
        // Don't include sensitive data in the response
        userEmail: undefined,
        requestId: metadata.requestId
      }
    }

    console.log('Created checkout session:', {
      sessionId: session.id,
      clientReferenceId,
      userId,
      walletId,
      amount: amount / 100,
      currency: currency.toLowerCase()
    });

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      }
    )

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
