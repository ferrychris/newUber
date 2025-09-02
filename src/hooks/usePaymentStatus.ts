import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  payment_method: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at?: string;
}

interface PaymentMetadata {
  userId: string;
  walletId: string;
  type: string;
  amount: string;
  currency: string;
}

interface PaymentStatusData {
  sessionId: string;
  paymentStatus: string;
  paymentIntentStatus: string | null;
  amount: number;
  currency: string;
  customerEmail: string;
  transaction: Transaction | null;
  walletBalance: number | null;
  metadata: PaymentMetadata;
}

interface UsePaymentStatusReturn {
  paymentData: PaymentStatusData | null;
  isLoading: boolean;
  error: string | null;
  checkPaymentStatus: (sessionId: string) => Promise<void>;
}

export const usePaymentStatus = (): UsePaymentStatusReturn => {
  const [paymentData, setPaymentData] = useState<PaymentStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPaymentStatus = async (sessionId: string) => {
    if (!sessionId) {
      setError('Session ID is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke('payment-status', {
        body: {},
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'GET',
        // Pass session_id as query parameter
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setPaymentData(data);

      // Show success/failure toast based on payment status
      if (data.paymentStatus === 'paid') {
        toast.success(`Payment successful! $${(data.amount / 100).toFixed(2)} added to your wallet.`);
      } else if (data.paymentStatus === 'unpaid') {
        toast.error('Payment was not completed. Please try again.');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check payment status';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-check payment status from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (sessionId && success === 'true') {
      checkPaymentStatus(sessionId);
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (canceled === 'true') {
      toast.info('Payment was canceled.');
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  return {
    paymentData,
    isLoading,
    error,
    checkPaymentStatus,
  };
};
