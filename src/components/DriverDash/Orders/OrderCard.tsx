import React, { useState } from 'react';
import { Order } from '../types';
import OrderActions from './OrderActions';
import { Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../../../utils/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';

interface OrderCardProps {
  order: Order & { delivery_confirmed?: boolean };
  onAction: (orderId: string, action: 'accept' | 'reject' | 'complete') => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onAction }) => {
  const user = useUser();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirmDelivery = async () => {
    if (!user) return;
    setIsConfirming(true);
    setError(null);

    try {
      // First, get the order details to find the price
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('price')
        .eq('id', order.id)
        .single();
      
      if (orderError) {
        throw orderError;
      }
      
      // Update delivery confirmation fields and change status to completed
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          delivery_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
          status: 'completed' // Change to completed status
        })
        .eq('id', order.id);

      if (updateError) throw updateError;
      
      // Credit the driver's wallet if there's a price
      if (orderData?.price) {
        // Get the driver's wallet
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching driver wallet:', walletError);
        } else if (walletData) {
          // Update the wallet balance
          const newBalance = parseFloat(walletData.balance || '0') + parseFloat(orderData.price);
          
          const { error: updateError } = await supabase
            .from('wallets')
            .update({ 
              balance: newBalance.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', walletData.id);
            
          if (updateError) {
            console.error('Error updating driver wallet:', updateError);
          } else {
            // Create a transaction record
            await supabase.from('wallet_transactions').insert({
              wallet_id: walletData.id,
              amount: orderData.price,
              type: 'earnings',
              status: 'completed',
              description: `Earnings from order #${order.id}`,
              payment_method: 'order_completion',
              metadata: { order_id: order.id }
            });
          }
        }
      }
      
      setSuccess(true);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError('Failed to confirm delivery. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };
  
  const openConfirmDialog = () => {
    setShowConfirmDialog(true);
  };
  return (
    <div className="bg-[#333333] p-4 rounded-lg mb-4 border border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-medium text-white">{order.pickup_location}</h3>
          <p className="text-sm text-gray-400">To: {order.dropoff_location}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          order.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
          order.status === 'accepted' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
          order.status === 'completed' ? 'bg-green-900/50 text-green-300 border border-green-700' :
          'bg-red-900/50 text-red-300 border border-red-700'
        }`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>
      
      <div className="mb-3">
        <div className="flex items-center text-gray-300 mb-1">
          <span className="text-sm">Distance: {order.distance} km</span>
          <span className="mx-2">•</span>
          <span className="text-sm">Est. Time: {order.estimated_time} min</span>
        </div>
        <div className="text-lg font-semibold text-green-400">
          ${order.price?.toFixed(2) || '0.00'}
        </div>
      </div>

      <OrderActions order={order} onAction={onAction} />

      {/* Show confirm button only to the customer when order is delivered */}
      {user && 
       order.status === 'delivered' && 
       !order.delivery_confirmed && 
       user.id === order.user_id && (
        <div className="mt-3">
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={openConfirmDialog}
            fullWidth
          >
            Confirm Delivery
          </Button>
        </div>
      )}

      {order.delivery_confirmed && (
        <div className="mt-3 p-2 bg-green-900/50 text-green-300 border border-green-700 rounded">
          Delivery Confirmed ✓
        </div>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Delivery confirmed successfully!
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => !isConfirming && setShowConfirmDialog(false)}
        aria-labelledby="confirm-delivery-dialog-title"
        aria-describedby="confirm-delivery-dialog-description"
      >
        <DialogTitle id="confirm-delivery-dialog-title">
          Confirm Delivery
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-delivery-dialog-description">
            Are you sure you want to confirm this delivery? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowConfirmDialog(false)} 
            color="inherit"
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelivery} 
            color="success" 
            variant="contained"
            disabled={isConfirming}
            startIcon={isConfirming ? (
              <svg className="animate-spin h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : <CheckCircleIcon />}
          >
            {isConfirming ? 'Confirming...' : 'Yes, Confirm Delivery'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default OrderCard;
