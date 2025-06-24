import React, { useState } from 'react';
import { Grid, Paper, Container } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import OrderList from './Orders/OrderList';
import OrderDetails from './Orders/OrderDetails';
import EarningsSummary from './Orders/EarningsSummary';
import type { Order } from '../../../../types/order';

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Orders Section */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '70vh',
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

        {/* Earnings Summary Section */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '70vh',
            }}
          >
            <EarningsSummary />
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
