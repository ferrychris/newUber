import { useState } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Order, ValidOrderStatus } from '../../types/order';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Paper,
  Box,
  Button,
  IconButton,
  Grid,
  Stack,
  Alert,
  Snackbar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../../utils/supabaseClient';
import OrderMap from '../DriverDash/KeyFeatures/Orders/OrderMap';

interface OrderDetailsProps {
  order: {
    id: string;
    status: ValidOrderStatus;
    pickup_location: string;
    dropoff_location: string;
    delivery_confirmed?: boolean;
    driver_name?: string;
    driver_phone?: string;
    created_at: string;
    user_id?: string;
  };
  open: boolean;
  onClose: () => void;
  onConfirmDelivery?: (orderId: string) => Promise<void>;
}

export default function CustomerOrderDetails({ order, open, onClose, onConfirmDelivery }: OrderDetailsProps) {
  const user = useUser();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const handleConfirmDelivery = async () => { 
    if (!onConfirmDelivery) return;
    setIsConfirming(true);
    setError(null);
    try {
      await onConfirmDelivery(order.id);
      setSuccess(true);
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError('Failed to confirm delivery. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Order Details</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {/* Order Info */}
              <Stack spacing={3}>
                {/* Status */}
                <Paper elevation={1} sx={{ p: 3 }}>
                  <Typography variant="h6">Status</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="h5"
                      color={
                        order.status === 'completed' || order.status === 'delivered'
                          ? 'success.main'
                          : order.status === 'cancelled'
                          ? 'error.main'
                          : order.status === 'pending'
                          ? 'warning.main'
                          : 'info.main'
                      }
                    >
                      {order.status.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Typography>
                    
                    {/* Show confirm button for delivered orders */}
                    {user && 
                     order.status === 'delivered' && 
                     !order.delivery_confirmed && 
                     user.id === order.user_id && (
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={async () => {
                            if (!onConfirmDelivery) return;
                            setIsConfirming(true);
                            setError(null);
                            try {
                              await onConfirmDelivery(order.id);
                              setSuccess(true);
                            } catch (err) {
                              console.error('Error confirming delivery:', err);
                              setError('Failed to confirm delivery. Please try again.');
                            } finally {
                              setIsConfirming(false);
                            }
                          }}
                          disabled={isConfirming}
                          fullWidth
                        >
                          {isConfirming ? 'Confirming...' : 'Confirm Delivery'}
                        </Button>
                      </Box>
                    )}

                    {/* Show confirmation status */}
                    {order.delivery_confirmed && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Delivery confirmed!
                      </Alert>
                    )}

                    {order.delivery_confirmed && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Delivery confirmed!
                      </Alert>
                    )}
                  </Box>
                </Paper>

                {/* Locations */}
                <Paper elevation={1} sx={{ p: 3 }}>
                  <Typography variant="h6">Locations</Typography>
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Pickup Location
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon color="primary" />
                        <Typography>{order.pickup_location}</Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Dropoff Location
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon color="success" />
                        <Typography>{order.dropoff_location}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>

                {/* Driver Info */}
                {order.driver_name && (
                  <Paper elevation={1} sx={{ p: 3 }}>
                    <Typography variant="h6">Driver Information</Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Driver
                      </Typography>
                      <Typography>{order.driver_name}</Typography>
                      {order.driver_phone && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="subtitle2" color="textSecondary">
                            Phone
                          </Typography>
                          <Typography>{order.driver_phone}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                )}
              </Stack>
            </Grid>

            {/* Map */}
            <Grid item xs={12} md={6}>
              <Paper elevation={1} sx={{ height: '400px', overflow: 'hidden' }}>
                <OrderMap
                  pickupLocation={order.pickup_location}
                  dropoffLocation={order.dropoff_location}
                />
              </Paper>
            </Grid>
          </Grid>
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
    </>
  );
}
