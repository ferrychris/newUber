import { useState } from 'react';
import { Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, Button, CircularProgress, Alert, Snackbar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OrderDetailsView from '../shared/OrderDetailsView';
import { ValidOrderStatus } from '../../types/order';

interface OrderDetailsProps {
  order: {
    id: string;
    status: ValidOrderStatus;
    pickup_location: string;
    dropoff_location: string;
    delivery_confirmed?: boolean;
    driver_name?: string;
    driver_phone?: string;
    driver_id?: string;
    created_at: string;
    user_id?: string;
  };
  open: boolean;
  onClose: () => void;
  onConfirmDelivery?: (orderId: string) => Promise<void>;
}

export default function CustomerOrderDetails({ order, open, onClose, onConfirmDelivery }: OrderDetailsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Create a service object for OrderDetailsView
  const service = {
    id: order.id,
    name: 'Delivery',
    type: 'delivery',
    description: 'Delivery service',
    minPrice: 0,
    image: '',
    baseRate: 0,
    theme: {
      bg: 'bg-sunset',
      text: 'text-sunset',
      border: 'border-sunset'
    }
  };
  
  const handleConfirmDelivery = async () => { 
    if (!onConfirmDelivery) return;
    setIsConfirming(true);
    setError(null);
    try {
      // Call the provided callback to update the order status
      // This will trigger the updateOrderStatus function which handles crediting the driver's wallet
      await onConfirmDelivery(order.id);
      
      // The driver's wallet is credited in the updateOrderStatus function when status changes to 'completed'
      
      setSuccess(true);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError('Failed to confirm delivery. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle order completion
  const handleCompleteOrder = async () => {
    setShowConfirmDialog(true);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <OrderDetailsView 
            order={{
              id: order.id,
              user_id: order.user_id || '',
              service_id: '',
              pickup_location: order.pickup_location,
              dropoff_location: order.dropoff_location,
              status: order.status,
              price: 0,
              payment_method: 'cash',
              payment_status: 'paid',
              updated_at: order.created_at,
              created_at: order.created_at,
              driver_id: order.driver_id
            }}
            service={service}
            showUserDetails={false}
            showDriverDetails={true}
            onCompleteOrder={order.status === 'delivered' ? handleCompleteOrder : undefined}
            isDriver={false}
          />
        </DialogContent>
      </Dialog>

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
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error">
            {error}
          </Alert>
        </Snackbar>
      )}

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
              <CircularProgress size={20} color="inherit" />
            ) : <CheckCircleIcon />}
          >
            {isConfirming ? 'Confirming...' : 'Yes, Confirm Delivery'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
