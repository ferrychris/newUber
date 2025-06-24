import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  useTheme
} from '@mui/material';
import { 
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { Order } from '../../../../types/order';
import { formatCurrency } from './utils';
// Import the updateOrderStatus function from the utils file we created
import { updateOrderStatus } from '../../../../utils/orderUtils';

export interface OrderCardProps {
  order: Order;
  type: 'active' | 'completed' | 'cancelled' | 'available';
  onClick?: () => void;
  onStatusUpdate?: (orderId: string, newStatus: Order['status']) => void;
}

const STATUS_CONFIG = {
  // pending: { color: '#ffc107', label: 'Pending', nextStatus: 'accepted', nextLabel: 'Accept' },
  accepted: { color: '#2196f3', label: 'Accepted', nextStatus: 'en_route', nextLabel: 'Start Delivery' },
  en_route: { color: '#3f51b5', label: 'En Route', nextStatus: 'arrived', nextLabel: 'Mark Arrived' },
  arrived: { color: '#9c27b0', label: 'Arrived', nextStatus: 'picked_up', nextLabel: 'Confirm Pickup' },
  picked_up: { color: '#009688', label: 'Picked Up', nextStatus: 'delivered', nextLabel: 'Complete Delivery' },
  delivered: { color: '#4caf50', label: 'Delivered', nextStatus: null, nextLabel: null },
  // cancelled: { color: '#f44336', label: 'Cancelled', nextStatus: null, nextLabel: null }
} as const;

export default function OrderCard({ order, onClick, onStatusUpdate }: OrderCardProps) {
  const theme = useTheme();
  
  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      console.log('Updating order status:', orderId, newStatus);
      await updateOrderStatus(orderId, newStatus);
      if (onStatusUpdate) {
        onStatusUpdate(orderId, newStatus);
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        '&:hover': {
          boxShadow: theme.shadows[4]
        }
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" component="div">
            Order #{order.id}
          </Typography>
          <Chip 
            label={order.status in STATUS_CONFIG ? STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG].label : order.status.toUpperCase()}
            sx={{ 
              backgroundColor: order.status in STATUS_CONFIG ? STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG].color : '#757575',
              color: 'white'
            }}
          />
        </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <PersonIcon sx={{ mr: 1 }} />
          <Typography variant="body2">
            {order.customer_name}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <LocationOnIcon sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            From: {order.pickup_location}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <LocationOnIcon sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            To: {order.dropoff_location}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <AccessTimeIcon sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {new Date(order.created_at).toLocaleString()}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center">
            <PaymentIcon sx={{ mr: 1 }} />
            <Typography variant="body1" fontWeight="bold">
              {formatCurrency(order.price || order.estimated_price || 0)}
            </Typography>
          </Box>
        </Box>
        {onStatusUpdate && STATUS_CONFIG[order.status]?.nextStatus && (
          <Box mt={2} display="flex" gap={1} justifyContent="flex-end">
            <Chip
              label={STATUS_CONFIG[order.status]?.nextLabel}
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('Chip clicked for order:', order.id);
                const nextStatus = STATUS_CONFIG[order.status]?.nextStatus;
                if (nextStatus) {
                  console.log('Updating status to:', nextStatus);
                  handleStatusUpdate(order.id, nextStatus as Order['status']);
                }
              }}
              sx={{
                backgroundColor: STATUS_CONFIG[order.status]?.color,
                color: 'white',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.9,
                  transform: 'scale(1.02)'
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
