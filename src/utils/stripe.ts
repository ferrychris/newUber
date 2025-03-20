import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Load Stripe with the publishable key from environment
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export { stripePromise };

/**
 * Create a payment intent for adding funds to a wallet
 * @param amount Amount to add in cents (e.g., 1000 for $10.00)
 * @param userId The user ID
 * @returns Payment intent client secret
 */
export async function createPaymentIntent(amount: number, userId: string) {
  try {
    // Call our serverless function via Supabase Edge Functions
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { amount, userId }
    });

    if (error) throw error;
    return data.clientSecret;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Process a successful payment and update the wallet
 * @param paymentIntentId The Stripe payment intent ID
 * @param walletId The wallet ID
 * @param amount The amount added
 */
export async function processSuccessfulPayment(paymentIntentId: string, walletId: string, amount: number) {
  try {
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: { 
        paymentIntentId,
        walletId,
        amount
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

/**
 * Get a user's wallet, creating one if it doesn't exist
 * @param userId The user ID
 * @returns User wallet data
 */
export async function getUserWallet(userId: string) {
  try {
    // Check if user has a wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    // If wallet exists, return it
    if (wallet) return wallet;

    // Create new wallet if none exists
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert([
        { 
          user_id: userId,
          balance: 0,
          currency: 'USD' // Default currency
        }
      ])
      .select()
      .single();

    if (createError) throw createError;
    return newWallet;
  } catch (error) {
    console.error('Error getting/creating wallet:', error);
    throw error;
  }
}

/**
 * Get wallet transaction history
 * @param walletId The wallet ID
 * @returns Transaction history
 */
export async function getWalletTransactions(walletId: string) {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    throw error;
  }
}

/**
 * Transfer funds between wallets (e.g., from customer to driver)
 * @param fromWalletId Source wallet ID
 * @param toWalletId Destination wallet ID
 * @param amount Amount to transfer
 * @param description Description of the transfer
 * @returns Success status
 */
export async function transferBetweenWallets(
  fromWalletId: string, 
  toWalletId: string, 
  amount: number,
  description: string
) {
  try {
    const { data, error } = await supabase.functions.invoke('wallet-transfer', {
      body: { 
        fromWalletId,
        toWalletId,
        amount,
        description
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error transferring between wallets:', error);
    throw error;
  }
}
