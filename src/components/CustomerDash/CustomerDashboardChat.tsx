import React from 'react';
import { Dialog, DialogContent, useTheme as useMuiTheme } from '@mui/material';
// Import the component with a different name to avoid naming conflicts
import DashboardChatComponent from '../DriverDash/KeyFeatures/Messages/DashboardChat';
import { useTheme } from '../../utils/theme';

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
  const muiTheme = useMuiTheme();
  const { theme, isDark } = useTheme();
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
          maxHeight: '700px',
          bgcolor: isDark ? 'rgb(24, 24, 27)' : 'rgb(255, 255, 255)',
          backgroundImage: isDark
            ? 'linear-gradient(rgba(24, 24, 27, 0.9), rgba(39, 39, 42, 0.9))' 
            : 'linear-gradient(rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))',
          boxShadow: isDark 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <DashboardChatComponent
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
