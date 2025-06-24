import React from 'react';
import { useOutletContext } from 'react-router-dom';
import DashboardLayout from '../KeyFeatures/DashboardLayout';
import { Typography, Box } from '@mui/material';

interface DriverDashboardContext {
  walletBalance: string;
  totalOrders: number;
  isLoadingWallet: boolean;
}

const DashboardContent: React.FC = () => {
  useOutletContext<DriverDashboardContext>(); // Context values are not used in this component

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Typography variant="h4" sx={{ mb: 4, color: 'white', fontWeight: 'bold' }}>
        Driver Dashboard
      </Typography>
      <DashboardLayout />
    </Box>
  );
};

export default DashboardContent;
