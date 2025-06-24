import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress
} from '@mui/material';
import { supabase } from '../../../../lib/supabaseClient';
import { formatCurrency } from '../../../../utils/formatters';

interface EarningsSummaryProps {
  orderId?: string; // Optional: for single order view
}

interface EarningsData {
  totalPrice: number;
  totalTips: number;
  orderCount: number;
  recentOrders: Array<{
    id: string;
    price: number;
    tip: number;
    created_at: string;
  }>;
}

export default function EarningsSummary({ orderId }: EarningsSummaryProps) {
  const [earnings, setEarnings] = useState<EarningsData>({
    totalPrice: 0,
    totalTips: 0,
    orderCount: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, [orderId]);

  const fetchEarnings = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('id, price, tip, created_at')
        .eq('status', 'completed');

      if (orderId) {
        // Single order view
        query = query.eq('id', orderId);
      } else {
        // Weekly summary view
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalPrice = data.reduce((sum, order) => sum + (order.price || 0), 0);
      const totalTips = data.reduce((sum, order) => sum + (order.tip || 0), 0);

      setEarnings({
        totalPrice,
        totalTips,
        orderCount: data.length,
        recentOrders: data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {orderId ? 'Order Earnings' : 'Weekly Earnings Summary'}
      </Typography>

      <Box display="flex" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" color="primary">
            {formatCurrency(earnings.totalPrice + earnings.totalTips)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Earnings
          </Typography>
        </Box>
        
        <Box textAlign="right">
          <Typography variant="h6">
            {earnings.orderCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {orderId ? 'Order' : 'Completed Orders'}
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Box my={2}>
        <Typography variant="subtitle1" gutterBottom>
          Breakdown
        </Typography>
        <Box display="flex" gap={2}>
          <Chip 
            label={`Fares: ${formatCurrency(earnings.totalPrice)}`}
            color="primary"
          />
          <Chip 
            label={`Tips: ${formatCurrency(earnings.totalTips)}`}
            color="secondary"
          />
        </Box>
      </Box>

      {!orderId && (
        <>
          <Divider />
          <List>
            {earnings.recentOrders.map((order) => (
              <ListItem key={order.id} divider>
                <ListItemText
                  primary={`Order #${order.id}`}
                  secondary={new Date(order.created_at).toLocaleDateString()}
                />
                <Box>
                  <Typography variant="body1">
                    {formatCurrency(order.price + (order.tip || 0))}
                  </Typography>
                  {order.tip > 0 && (
                    <Typography variant="body2" color="success.main">
                      +{formatCurrency(order.tip)} tip
                    </Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Paper>
  );
}
