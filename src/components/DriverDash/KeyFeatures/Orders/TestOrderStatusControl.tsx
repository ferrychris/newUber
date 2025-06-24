import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { testOrderStatus } from '../../../../utils/testOrderStatus';
import { OrderStatusControl } from './OrderStatusControl';
import type { ValidOrderStatus } from '../../../../types/order';

const TEST_ORDER_FLOW: ValidOrderStatus[] = [
  'pending',
  'accepted',
  'en_route',
  'arrived',
  'picked_up',
  'delivered'
];

export function TestOrderStatusControl() {
  const [orderId, setOrderId] = useState('');
  const [currentStatus, setCurrentStatus] = useState<ValidOrderStatus>('pending');

  const handleNextStatus = async () => {
    const currentIndex = TEST_ORDER_FLOW.indexOf(currentStatus);
    if (currentIndex < TEST_ORDER_FLOW.length - 1) {
      const nextStatus = TEST_ORDER_FLOW[currentIndex + 1];
      const success = await testOrderStatus(orderId, nextStatus);
      if (success) {
        setCurrentStatus(nextStatus);
      }
    }
  };

  const handleReset = async () => {
    const success = await testOrderStatus(orderId, 'pending');
    if (success) {
      setCurrentStatus('pending');
    }
  };

  const handleCancel = async () => {
    const success = await testOrderStatus(orderId, 'cancelled');
    if (success) {
      setCurrentStatus('cancelled');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Test Order Status Control
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          label="Order ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleNextStatus}
            disabled={!orderId || currentStatus === 'delivered' || currentStatus === 'cancelled'}
          >
            Next Status
          </Button>
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={!orderId}
          >
            Reset to Pending
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleCancel}
            disabled={!orderId || currentStatus === 'cancelled'}
          >
            Cancel Order
          </Button>
        </Box>
      </Box>

      {orderId && (
        <OrderStatusControl
          orderId={orderId}
          currentStatus={currentStatus}
          onStatusUpdate={(_, newStatus) => setCurrentStatus(newStatus)}
        />
      )}
    </Box>
  );
}
