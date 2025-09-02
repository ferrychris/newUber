# Vite + Stripe Integration Setup Guide

## 🚨 CRITICAL ISSUES FIXED

### 1. **Stripe Secret Key Issue**
Your current `STRIPE_SECRET_KEY` in `.env` is actually a **publishable key** (starts with `pk_test_`).

**You need to get your actual SECRET KEY from Stripe Dashboard:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy the **Secret key** (starts with `sk_test_...`)
3. Replace in your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
```

### 2. **Vite Environment Variables Fixed**
Updated all functions to use Vite's `VITE_` prefix and `import.meta.env`:

- ✅ `WalletFundDialog.tsx` now uses `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`
- ✅ All Supabase functions updated to use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## 📋 Complete Environment Variables Setup

Your `.env` file should have:

```env
# Supabase Configuration (✅ Already correct)
VITE_SUPABASE_URL=https://hcyodecaeoeiadwyyzrz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Configuration (🔧 NEEDS FIXING)
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE  # ⚠️ GET FROM STRIPE DASHBOARD
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE   # ⚠️ GET AFTER CREATING WEBHOOK
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51OLaHBHNs2olLgscqPYKAuPMFICrDBpPnVTb5Z6I5rpvbA0LHFCMI7OYKrehhZlNTx2gUQ6Jd4gvexk1OSkxBGaV00l52zKY6v  # ✅ Already correct

# Other configurations (✅ Already correct)
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZmVycnljaHJpcyIsImEiOiJjbThlM21udzAyZXM0MmxzNzBzM2x4ZXVxIn0.IsMdP5zPmP2T8NFv3hVKFw
VITE_APP_TOLGEE_API_URL=https://app.tolgee.io
VITE_APP_TOLGEE_API_KEY=tgpak_ge3tonjql5vw4n3bny4wkzdhg53he2bvg5xg44logrvgimlmna2q
VITE_SUPABASE_DB_URL=postgresql://postgres:Ferrychris95@db.hcyodecaeoeiadwyyzrz.supabase.co:5432/postgres
```

## 🔧 Step-by-Step Setup

### Step 1: Get Stripe Secret Key
1. Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/test/apikeys)
2. Reveal and copy the **Secret key** (starts with `sk_test_`)
3. Update your `.env` file

### Step 2: Run Database Migration
```bash
supabase db push
```

### Step 3: Deploy Supabase Functions
```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook  
supabase functions deploy payment-status
```

### Step 4: Setup Stripe Webhook
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://hcyodecaeoeiadwyyzrz.supabase.co/functions/v1/stripe-webhook`
4. Select these events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Update `STRIPE_WEBHOOK_SECRET` in your `.env` file

### Step 5: Test the Integration
1. Start your Vite dev server: `npm run dev`
2. Navigate to wallet page
3. Try adding funds
4. Complete payment with test card: `4242 4242 4242 4242`

## 🔍 Troubleshooting

### Common Issues:

1. **"Invalid API Key"** → Check your `STRIPE_SECRET_KEY` starts with `sk_test_`
2. **"Webhook signature verification failed"** → Check `STRIPE_WEBHOOK_SECRET` is correct
3. **"Supabase connection failed"** → Verify `VITE_SUPABASE_URL` and keys are correct

### Test Cards for Development:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

## 🎯 What's Been Fixed

✅ **Vite Environment Variables**: All functions now use correct Vite env vars
✅ **Database Migration**: Added Stripe columns and functions
✅ **Theme Support**: Wallet components support dark/light mode
✅ **Error Handling**: Comprehensive error handling throughout
✅ **Security**: Proper RLS policies and webhook verification

## 🚀 Ready to Go!

Once you update the Stripe secret key, the entire system will be ready for testing!
