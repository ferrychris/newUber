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

  // Log all incoming requests for debugging
  console.log('Webhook received request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  })

  try {
    // Initialize Stripe
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || ''
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error('Missing Stripe secrets in Edge Function environment')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: Stripe secrets missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client with service role key for admin operations
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase admin env (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: Supabase admin env missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )

    // Get the raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    console.log('Webhook signature verification:', {
      hasBody: !!body,
      bodyLength: body.length,
      hasSignature: !!signature,
      signature: signature ? signature.substring(0, 20) + '...' : null
    })

    if (!signature) {
      console.error('Missing stripe-signature header in webhook request')
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(`Webhook signature verification failed: ${err.message}`, {
        status: 400,
      })
    }

    console.log('Received webhook event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Extract and validate metadata
        const { 
          userId, 
          walletId, 
          amount, 
          type = 'wallet_topup',
          requestId,
          client_reference_id = session.client_reference_id
        } = session.metadata || {}
        
        // Validate required metadata
        if (!userId || !walletId || !amount) {
          const errorDetails = {
            eventId: event.id,
            sessionId: session.id,
            paymentIntent: session.payment_intent,
            metadata: session.metadata,
            error: 'Missing required metadata in session',
            required: ['userId', 'walletId', 'amount'],
            received: { userId, walletId, amount }
          }
          
          console.error('Invalid session metadata:', errorDetails)
          return new Response(
            JSON.stringify({ 
              error: 'Invalid session metadata',
              details: errorDetails
            }), 
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        const amountInDollars = parseInt(amount, 10) / 100
        const logContext = {
          eventId: event.id,
          sessionId: session.id,
          paymentIntent: session.payment_intent,
          userId,
          walletId,
          amount: amountInDollars,
          type,
          requestId,
          clientReferenceId: client_reference_id,
          timestamp: new Date().toISOString()
        }

        console.log('Processing checkout.session.completed:', logContext)

        try {
          // First, verify this is a new event we haven't processed before
          const { data: existingTx, error: lookupError } = await supabaseClient
            .from('wallet_transactions')
            .select('id, status, amount')
            .eq('stripe_payment_intent_id', session.payment_intent)
            .maybeSingle()

          if (lookupError) throw lookupError

          // If we already processed this payment successfully, just return success
          if (existingTx?.status === 'completed') {
            console.log('Payment already processed, skipping duplicate webhook:', {
              ...logContext,
              existingTxId: existingTx.id,
              existingStatus: existingTx.status
            })
            return new Response(JSON.stringify({ 
              status: 'success',
              message: 'Payment already processed',
              transactionId: existingTx.id
            }), { 
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            })
          }

          // Process the payment using the database function
          const { data: updateResult, error: updateError } = await supabaseClient
            .rpc('update_wallet_from_stripe_webhook', {
              p_stripe_session_id: session.id,
              p_stripe_payment_intent_id: session.payment_intent as string,
              p_status: 'completed',
              p_metadata: JSON.stringify({
                event_id: event.id,
                request_id: requestId,
                client_reference_id,
                payment_method: session.payment_method_types?.[0] || 'card',
                payment_status: session.payment_status,
                customer_email: session.customer_email,
                customer: session.customer,
                amount_total: session.amount_total,
                currency: session.currency,
                payment_intent: session.payment_intent,
                subscription: session.subscription
              })
            })

          if (updateError) {
            console.error('Error in update_wallet_from_stripe_webhook:', {
              ...logContext,
              error: updateError
            })
            throw updateError
          }

          if (!updateResult) {
            const errorMsg = 'Transaction not found or update failed'
            console.error(errorMsg, logContext)
            return new Response(
              JSON.stringify({ 
                error: errorMsg,
                details: 'No transaction was updated. The session may not have a matching pending transaction.'
              }), 
              { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          }

          console.log('Successfully processed payment:', {
            ...logContext,
            transactionId: updateResult,
            status: 'completed'
          })

          // Get the updated transaction for response
          const { data: updatedTx, error: fetchError } = await supabaseClient
            .from('wallet_transactions')
            .select('*')
            .eq('id', updateResult)
            .single()

          if (fetchError) {
            console.warn('Failed to fetch updated transaction:', fetchError)
            // Continue with success response even if we can't fetch the updated transaction
          }

          return new Response(
            JSON.stringify({ 
              status: 'success',
              message: 'Payment processed successfully',
              transaction: updatedTx || { id: updateResult },
              metadata: {
                eventId: event.id,
                sessionId: session.id,
                paymentIntent: session.payment_intent,
                amount: amountInDollars,
                currency: session.currency
              }
            }),
            { 
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )

        } catch (error) {
          console.error('Error processing checkout.session.completed:', {
            ...logContext,
            error: error.message,
            stack: error.stack
          })
          
          // Log the error to an error tracking system if available
          // e.g., Sentry.captureException(error)
          
          return new Response(
            JSON.stringify({ 
              error: 'Failed to process payment',
              message: error.message,
              // Don't expose internal details in production
              details: process.env.NODE_ENV === 'production' ? undefined : error.details
            }),
            { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
        
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const { userId, walletId, requestId } = session.metadata || {}
        
        const logContext = {
          eventId: event.id,
          sessionId: session.id,
          userId,
          walletId,
          requestId,
          clientReferenceId: session.client_reference_id,
          timestamp: new Date().toISOString()
        }
        
        console.log(`Processing checkout.session.expired:`, logContext)

        try {
          // Update transaction status to expired using database function
          const { data: updateResult, error: updateError } = await supabaseClient
            .rpc('update_wallet_from_stripe_webhook', {
              p_stripe_session_id: session.id,
              p_stripe_payment_intent_id: session.payment_intent as string || null,
              p_status: 'expired',
              p_metadata: JSON.stringify({
                event_id: event.id,
                request_id: requestId,
                client_reference_id: session.client_reference_id,
                reason: 'Checkout session expired',
                expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
              })
            })

          if (updateError) throw updateError
          
          if (!updateResult) {
            console.warn('No transaction found to mark as expired:', logContext)
          } else {
            console.log(`Marked transaction as expired:`, {
              ...logContext,
              transactionId: updateResult
            })
          }
          
        } catch (error) {
          console.error('Error updating expired transaction:', {
            ...logContext,
            error: error.message,
            stack: error.stack
          })
          
          // Don't return an error response to Stripe for expired sessions
          // as we don't want them to retry
        }
        
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { last_payment_error } = paymentIntent
        
        const logContext = {
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount ? paymentIntent.amount / 100 : null,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          failureCode: last_payment_error?.code,
          failureMessage: last_payment_error?.message,
          paymentMethod: paymentIntent.payment_method,
          timestamp: new Date().toISOString()
        }
        
        console.log('Processing payment_intent.payment_failed:', logContext)

        try {
          // First try to find by payment intent ID
          const { data: transaction, error: lookupError } = await supabaseClient
            .from('wallet_transactions')
            .select('id, status, amount, metadata')
            .or(`stripe_payment_intent_id.eq.${paymentIntent.id},metadata->>'stripe_payment_intent_id'=eq.${paymentIntent.id}`)
            .maybeSingle()

          if (lookupError) throw lookupError

          if (!transaction) {
            console.warn('No transaction found for failed payment intent:', logContext)
            return new Response(
              JSON.stringify({ status: 'warning', message: 'No matching transaction found' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Skip if already marked as failed
          if (transaction.status === 'failed') {
            console.log('Transaction already marked as failed:', {
              ...logContext,
              transactionId: transaction.id
            })
            return new Response(
              JSON.stringify({ status: 'skipped', message: 'Transaction already marked as failed' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Update transaction status to failed using database function
          const { data: updateResult, error: updateError } = await supabaseClient
            .rpc('update_wallet_from_stripe_webhook', {
              p_stripe_session_id: null,
              p_stripe_payment_intent_id: paymentIntent.id,
              p_status: 'failed',
              p_metadata: JSON.stringify({
                ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
                failure_event_id: event.id,
                failure_code: last_payment_error?.code,
                failure_message: last_payment_error?.message,
                payment_method: paymentIntent.payment_method,
                last_payment_error: last_payment_error || null,
                updated_at: new Date().toISOString()
              })
            })

          if (updateError) throw updateError
          
          if (!updateResult) {
            console.warn('Failed to update transaction status to failed:', logContext)
          } else {
            console.log('Marked transaction as failed:', {
              ...logContext,
              transactionId: updateResult
            })
          }
          
          // Optionally, notify the user about the failed payment
          // await notifyUserOfFailedPayment(transaction.user_id, paymentIntent)
          
        } catch (error) {
          console.error('Error processing payment_intent.payment_failed:', {
            ...logContext,
            error: error.message,
            stack: error.stack
          })
          
          // Return 200 to prevent Stripe from retrying (non-recoverable error)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to process payment failure',
              message: error.message
            }),
            { 
              status: 200, // Non-200 would cause Stripe to retry
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
        
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
