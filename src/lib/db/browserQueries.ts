import { supabase } from '../supabaseClient';

// Define wallet type for browser usage
export type Wallet = {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  orders: number;
  createdAt: Date;
  updatedAt: Date;
};

// Browser-safe wallet queries using Supabase client
export const walletQueries = {
  // Get wallet by user ID
  getByUserId: async (userId: string): Promise<Wallet | null> => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116 error
      
      // Handle specific error codes
      if (error && error.code !== 'PGRST116') {
        console.error('Wallet fetch error:', error);
        throw error;
      }
      
      if (!data) return null;
      
      // Transform from Supabase format to our app format
      return {
        id: data.id,
        userId: data.user_id,
        balance: data.balance || '0',
        currency: data.currency || 'USD',
        orders: data.orders || 0,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error: any) {
      // If RLS error, return null instead of throwing
      if (error?.code === '42501') {
        console.warn('RLS permission error fetching wallet:', error);
        return null;
      }
      console.error('Error fetching wallet:', error);
      throw error;
    }
  },
  
  // Create a new wallet
  create: async (userId: string): Promise<Wallet> => {
    try {
      // First check if wallet already exists
      const existingWallet = await walletQueries.getByUserId(userId);
      if (existingWallet) {
        return existingWallet; // Return existing wallet if found
      }
      
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('wallets')
        .insert([{
          user_id: userId,
          balance: '0',
          currency: 'USD',
          orders: 0,
          created_at: now,
          updated_at: now
        }])
        .select()
        .maybeSingle(); // Use maybeSingle instead of single
      
      if (error) {
        // Handle specific RLS errors
        if (error.code === '42501') {
          throw new Error('Permission denied: Unable to create wallet due to security policy');
        }
        throw error;
      }
      
      if (!data) {
        throw new Error('Failed to create wallet: No data returned');
      }
      
      return {
        id: data.id,
        userId: data.user_id,
        balance: data.balance,
        currency: data.currency,
        orders: data.orders,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  },
  
  // Update wallet balance
  updateBalance: async (userId: string, balance: string, orderCount?: number): Promise<Wallet> => {
    try {
      const updateData: Record<string, any> = {
        balance,
        updated_at: new Date().toISOString()
      };
      
      if (orderCount !== undefined) {
        updateData.orders = orderCount;
      }
      
      const { data, error } = await supabase
        .from('wallets')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        userId: data.user_id,
        balance: data.balance,
        currency: data.currency,
        orders: data.orders,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }
};

// Helper function to get the current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};
