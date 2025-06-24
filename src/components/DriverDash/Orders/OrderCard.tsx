import React, { useState } from 'react';
import { Order } from '../types';
import OrderActions from './OrderActions';
import { Button, Snackbar, Alert } from '@mui/material';
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

  const handleConfirmDelivery = async () => {
    if (!user) return;
    setIsConfirming(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ delivery_confirmed: true })
        .eq('id', order.id);

      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError('Failed to confirm delivery. Please try again.');
    } finally {
      setIsConfirming(false);
    }
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
            onClick={handleConfirmDelivery}
            disabled={isConfirming}
            fullWidth
          >
            {isConfirming ? 'Confirming...' : 'Confirm Delivery'}
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
    </div>
  );
};

export default OrderCard;
