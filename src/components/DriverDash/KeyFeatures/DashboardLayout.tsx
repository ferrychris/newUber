import React, { useState } from 'react';
import { Paper, Container } from '@mui/material';
import Grid from '@mui/material/Grid';
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
  user_id: string;
  pickup_location: string;
  dropoff_location: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  base_fare: number;
  distance_fare?: number;
  time_fare?: number;
  total_fare: number;
  payment_method?: string;
  payment_status?: 'pending' | 'completed' | 'failed';
  notes?: string;
  driver_id?: string;
  updated_at?: string;
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Orders Section */}
        <div className="md:col-span-8">
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
        </div>

        {/* Wallet Section */}
        <div className="md:col-span-4">
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
        </div>
      </div>

      {/* Order Details Dialog */}
      <OrderDetails
        order={selectedOrder}
        open={selectedOrder !== null}
        onClose={handleCloseDetails}
      />
    </Container>
  );
}
