import React from 'react';
import { Dialog, DialogContent } from '@mui/material';
import DashboardChat from '../DriverDash/KeyFeatures/Messages/DashboardChat';

interface CustomerDashboardChatProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  driverId: string;
  orderInfo?: {
    id: string;
    pickup_location?: string;
    dropoff_location?: string;
    status?: string;
  };
}

const CustomerDashboardChat: React.FC<CustomerDashboardChatProps> = ({
  open,
  onClose,
  orderId,
  driverId,
  orderInfo
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: '12px',
          height: '80vh',
          maxHeight: '700px'
        }
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <DashboardChat
          orderId={orderId}
          customerId={driverId} // For customer chat, the "customer" is actually the driver
          onClose={onClose}
          orderInfo={orderInfo}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDashboardChat;
