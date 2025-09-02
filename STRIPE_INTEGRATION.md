# Stripe Integration Setup Guide

This document outlines the complete Stripe integration for wallet top-up functionality in the DavidUberLikeProject.

## Overview

The integration consists of:
1. **Frontend**: React components with Stripe Checkout
2. **Backend**: Supabase Edge Functions for session creation and webhook handling
3. **Database**: Transaction tracking and wallet balance updates

## Files Created

### Supabase Edge Functions

1. **`supabase/functions/create-checkout-session/index.ts`**
   - Creates Stripe Checkout sessions
   - Validates user authentication and wallet ownership
   - Stores pending transactions in the database

2. **`supabase/functions/stripe-webhook/index.ts`**
   - Handles Stripe webhook events
   - Updates wallet balances on successful payments
   - Manages transaction status updates

3. **`supabase/functions/payment-status/index.ts`**
   - Retrieves payment status for frontend
   - Returns updated wallet balance after payments

### Frontend Components

1. **`src/hooks/usePaymentStatus.ts`**
   - React hook for handling payment status
   - Auto-detects payment completion from URL parameters
   - Refreshes wallet data after successful payments

2. **Updated Components**:
   - `WalletFundDialog.tsx` - Now uses Stripe Checkout exclusively
   - `Wallet.tsx` - Integrated with payment status hook

## Environment Variables Required

Add these to your `.env` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Configuration (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Schema

Ensure your `wallet_transactions` table has these columns:

```sql
CREATE TABLE wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id),
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal'
  status VARCHAR(20) NOT NULL, -- 'pending', 'completed', 'failed'
  description TEXT,
  payment_method VARCHAR(50),
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Deployment Steps

### 1. Deploy Supabase Functions

```bash
# Deploy the checkout session function
supabase functions deploy create-checkout-session

# Deploy the webhook function
supabase functions deploy stripe-webhook

# Deploy the payment status function
supabase functions deploy payment-status
```

### 2. Configure Stripe Webhook

1. Go to your Stripe Dashboard → Webhooks
2. Add a new webhook endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select these events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret to your environment variables

### 3. Test the Integration

1. Ensure all environment variables are set
2. Start your development server
3. Navigate to the wallet page
4. Try adding funds using the "Add Funds" button
5. Complete the Stripe Checkout flow
6. Verify the wallet balance updates automatically

## Security Features

- **Authentication**: All functions verify user authentication
- **Authorization**: Users can only access their own wallets
- **Webhook Verification**: Stripe webhook signatures are validated
- **Transaction Tracking**: All payments are logged with status updates
- **Error Handling**: Comprehensive error handling and logging

## Theme Support

Both the Wallet and WalletFundDialog components now support dark/light theme switching:
- Automatically detects system theme preference
- Respects user's theme selection from the dashboard
- Smooth transitions between themes
- Maintains accessibility in both modes

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**:
   - Check webhook URL is correct
   - Verify webhook secret in environment variables
   - Check Supabase function logs

2. **Payment successful but wallet not updated**:
   - Check webhook function logs
   - Verify database permissions
   - Ensure transaction table exists

3. **Checkout session creation fails**:
   - Verify Stripe keys are correct
   - Check user authentication
   - Ensure wallet exists for user

### Logs

Check function logs in Supabase Dashboard:
- Go to Edge Functions → Function Name → Logs
- Look for error messages and debug information

## Next Steps

1. **Testing**: Thoroughly test with Stripe test cards
2. **Production**: Switch to live Stripe keys for production
3. **Monitoring**: Set up alerts for failed payments
4. **Enhancement**: Consider adding refund functionality
