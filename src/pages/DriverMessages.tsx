import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessagePage from '../components/userDashcomponents/messages/MessagePage';
import DriverChatPage from '../components/DriverDash/KeyFeatures/Messages/DriverChatPage';
import { Box } from '@mui/material';
import { supabase } from '../lib/supabaseClient';

export interface DriverMessagesProps {
  chatMode?: 'single' | 'all';
}

const DriverMessages: React.FC<DriverMessagesProps> = ({ chatMode = 'all' }) => {
  const { orderId, customerId } = useParams<{ orderId: string; customerId: string }>();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = React.useState<any>(null);
  
  // Fetch order details if in single chat mode
  React.useEffect(() => {
    if (chatMode === 'single' && orderId) {
      const fetchOrderDetails = async () => {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('pickup_location, dropoff_location, status')
            .eq('id', orderId)
            .single();
            
          if (error) throw error;
          if (data) {
            setOrderDetails(data);
          }
        } catch (err) {
          console.error('Error fetching order details:', err);
        }
      };
      
      fetchOrderDetails();
    }
  }, [chatMode, orderId]);
  
  const handleBackToMessages = () => {
    navigate('/driver/messages');
  };
  
  // Show single chat if orderId and customerId are provided
  if (chatMode === 'single' && orderId && customerId) {
    return (
      <Box sx={{ p: 2, maxWidth: '1200px', mx: 'auto' }}>
        <DriverChatPage 
          orderId={orderId} 
          customerId={customerId}
          onBack={handleBackToMessages}
          orderInfo={{
            id: orderId,
            ...orderDetails
          }}
        />
      </Box>
    );
  }
  
  // Show all messages otherwise
  return <MessagePage isDriver={true} />;
};

export default DriverMessages;
