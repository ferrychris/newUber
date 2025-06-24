import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Badge,
  Drawer,
  Typography
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { supabase } from '../../../../utils/supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { updateOrderStatus } from '../../../../utils/orderUtils';
import type { ValidOrderStatus, StatusConfig } from '../../../../types/order';
import { OrderChatDrawer } from './OrderChatDrawer';

interface OrderStatusControlProps {
  orderId: string;
  currentStatus: ValidOrderStatus;
  onStatusUpdate?: (orderId: string, newStatus: ValidOrderStatus) => void;
}

const STATUS_STEPS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'en_route', label: 'En Route' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'delivered', label: 'Delivered' }
] as const;

const statusConfig: Record<ValidOrderStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'info',
    nextStatus: 'accepted',
    nextLabel: 'Accept Order'
  },
  accepted: {
    label: 'Accepted',
    color: 'primary',
    nextStatus: 'en_route',
    nextLabel: 'Start Delivery'
  },
  en_route: {
    label: 'En Route',
    color: 'primary',
    nextStatus: 'arrived',
    nextLabel: 'Mark Arrived'
  },
  arrived: {
    label: 'Arrived',
    color: 'primary',
    nextStatus: 'picked_up',
    nextLabel: 'Mark Picked Up'
  },
  picked_up: {
    label: 'Picked Up',
    color: 'primary',
    nextStatus: 'delivered',
    nextLabel: 'Mark Delivered'
  },
  delivered: {
    label: 'Delivered',
    color: 'success',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'error',
  }
};

export function OrderStatusControl({ orderId, currentStatus: initialStatus, onStatusUpdate }: OrderStatusControlProps): JSX.Element {
  const [currentStatus, setCurrentStatus] = useState<ValidOrderStatus>(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const { user } = useAuth();

  // Subscribe to real-time status updates
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;
    try {
      const channelId = `order-${orderId}-status`;
      subscription = supabase
        .channel(channelId)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        }, (payload: { new: { status: string } }) => {
          const newStatus = payload.new.status as ValidOrderStatus;
          if (newStatus !== currentStatus) {
            setCurrentStatus(newStatus);
            const nextStepIndex = STATUS_STEPS.findIndex(step => step.value === newStatus);
            setActiveStep(Math.max(0, nextStepIndex));
            if (onStatusUpdate) {
              onStatusUpdate(orderId, newStatus);
            }
          }
        })
        .subscribe();
    } catch (error) {
      console.error('Error setting up status subscription:', error);
      setError('Failed to set up real-time updates');
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      }
    };
  }, [orderId]); // Only re-run when orderId changes

  // Subscribe to unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { count } = await supabase
          .from('order_messages')
          .select('id', { count: 'exact' })
          .eq('order_id', orderId)
          .eq('read', false);
        
        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    
    fetchUnreadCount();
    
    let subscription: ReturnType<typeof supabase.channel>;
    try {
      const channelId = `order-${orderId}-messages`;
      subscription = supabase
        .channel(channelId)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        }, () => {
          fetchUnreadCount();
        })
        .subscribe();
    } catch (error) {
      console.error('Error setting up message subscription:', error);
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from messages:', error);
        }
      }
    };
  }, [orderId]);

  // Handle chat open/close
  const handleChatOpen = async () => {
    setChatOpen(true);
    if (unreadCount > 0) {
      try {
        await supabase
          .from('order_messages')
          .update({ read: true })
          .eq('order_id', orderId)
          .eq('read', false);
        
        setUnreadCount(0);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const handleChatClose = () => {
    setChatOpen(false);
  };

  // Handle status updates
  const handleStatusUpdate = async (newStatus: ValidOrderStatus) => {
    if (isUpdating) return;

    setIsUpdating(true);
    setError(null);

    try {
      // Optimistically update UI
      setCurrentStatus(newStatus);
      const nextStepIndex = STATUS_STEPS.findIndex(step => step.value === newStatus);
      setActiveStep(Math.max(0, nextStepIndex));

      // Attempt to update in the database
      await updateOrderStatus(
        orderId,
        newStatus,
        'Status updated by driver',
        user?.id || 'unknown'
      );

      if (onStatusUpdate) {
        onStatusUpdate(orderId, newStatus);
      }

      setSuccessMessage(`Status updated to ${statusConfig[newStatus].label}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert optimistic update on error
      setCurrentStatus(currentStatus);
      const currentStepIndex = STATUS_STEPS.findIndex(step => step.value === currentStatus);
      setActiveStep(Math.max(0, currentStepIndex));
      
      if (error instanceof Error) {
        setError(`Error updating status: ${error.message}`);
      } else {
        setError('An unknown error occurred while updating status');
      }
      
      // Auto-dismiss error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  // Update active step when status changes
  useEffect(() => {
    const stepIndex = STATUS_STEPS.findIndex(step => step.value === currentStatus);
    setActiveStep(Math.max(0, stepIndex));
  }, [currentStatus]);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      <Stepper activeStep={activeStep} alternativeLabel>
        {STATUS_STEPS.map((step) => (
          <Step key={step.value}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          {statusConfig[currentStatus].nextStatus && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleStatusUpdate(statusConfig[currentStatus].nextStatus!)}
              disabled={isUpdating}
              startIcon={isUpdating ? <CircularProgress size={20} /> : undefined}
            >
              {statusConfig[currentStatus].nextLabel}
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Badge badgeContent={unreadCount} color="error" sx={{ mr: 2 }}>
            <Button
              variant="outlined"
              onClick={handleChatOpen}
              startIcon={<ChatIcon />}
            >
              Chat
            </Button>
          </Badge>
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={handleChatClose}
      >
        <Box sx={{ width: 350, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Order Chat
          </Typography>
          <OrderChatDrawer
            orderId={orderId}
            open={chatOpen}
            onClose={handleChatClose}
          />
        </Box>
      </Drawer>
    </Box>
  );
}
