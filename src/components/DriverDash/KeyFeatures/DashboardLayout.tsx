import React, { useState } from 'react';
import { Grid, Paper, Container } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import OrderList from './Orders/OrderList';
import OrderDetails from './Orders/OrderDetails';
import DriverWallet from './Wallet/DriverWallet';

// Define Order type locally since the import is causing issues
interface Order {
  id: string;
  status: string;
  customer_id?: string;
  driver_id?: string;
  pickup_location?: string;
  dropoff_location?: string;
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  price?: number;
}

interface DashboardContext {
  handleOrderAction: (orderId: string, action: 'accept' | 'reject') => void;
  handleStatusUpdate: (orderId: string, newStatus: Order['status']) => void;
  user: any; // Add proper user type if available
  totalOrders: number;
  currentOrders: Order[];
  pastOrders: Order[];
  unacceptedOrders: Order[];
  isLoadingCurrentOrders: boolean;
  isLoadingPastOrders: boolean;
  isLoadingUnacceptedOrders: boolean;
}

export default function DashboardLayout() {
  const { handleOrderAction, handleStatusUpdate } = useOutletContext<DashboardContext>();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('1');

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: { xs: 8, md: 4 } }}>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Orders Section */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: { xs: 1, sm: 2 },
              display: 'flex',
              flexDirection: 'column',
              minHeight: { xs: '50vh', md: '70vh' },
              overflow: 'hidden',
            }}
          >
            <TabContext value={activeTab}>
             

              <TabPanel value="1" sx={{ p: 0 }}>
                <OrderList 
                  onOrderClick={handleOrderClick} 
                  handleOrderAction={handleOrderAction}
                  handleStatusUpdate={handleStatusUpdate}
                  defaultTab="active"
                />
              </TabPanel>
              <TabPanel value="2" sx={{ p: 0 }}>
                <OrderList 
                  onOrderClick={handleOrderClick} 
                  handleOrderAction={handleOrderAction}
                  handleStatusUpdate={handleStatusUpdate}
                  defaultTab="available"
                />
              </TabPanel>
              <TabPanel value="3" sx={{ p: 0 }}>
                <OrderList 
                  onOrderClick={handleOrderClick} 
                  handleOrderAction={handleOrderAction}
                  handleStatusUpdate={handleStatusUpdate}
                  defaultTab="completed"
                />
              </TabPanel>
              <TabPanel value="4" sx={{ p: 0 }}>
                <OrderList 
                  onOrderClick={handleOrderClick} 
                  handleOrderAction={handleOrderAction}
                  handleStatusUpdate={handleStatusUpdate}
                  defaultTab="cancelled"
                />
              </TabPanel>
            </TabContext>
          </Paper>
        </Grid>

        {/* Wallet Section */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: { xs: 1, sm: 2 },
              display: 'flex',
              flexDirection: 'column',
              minHeight: { xs: '40vh', md: '70vh' },
              mb: { xs: 2, md: 0 }
            }}
          >
            <DriverWallet />
          </Paper>
        </Grid>
      </Grid>

      {/* Order Details Dialog */}
      <OrderDetails
        order={selectedOrder}
        open={selectedOrder !== null}
        onClose={handleCloseDetails}
      />
    </Container>
  );
}
