import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  CircularProgress, 
  IconButton,
  Avatar,
  Divider,
  useTheme
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useUser } from '@supabase/auth-helpers-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../../../utils/supabaseClient';

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
  is_system_message: boolean;
}

interface CustomerProfile {
  id: string;
  full_name?: string;
  profile_image?: string;
}

interface DriverChatPageProps {
  orderId: string;
  customerId: string;
  onBack?: () => void;
  orderInfo?: {
    id: string;
    pickup_location?: string;
    dropoff_location?: string;
    status?: string;
  };
}

const DriverChatPage: React.FC<DriverChatPageProps> = ({ 
  orderId, 
  customerId, 
  onBack,
  orderInfo
}) => {
  const theme = useTheme();
  const user = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages for this order and customer
  useEffect(() => {
    if (!orderId || !customerId || !user) return;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch messages for this order
        const { data: messagesData, error } = await supabase
          .from('support_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Set messages
        setMessages(messagesData || []);

        // Mark unread messages as read
        if (messagesData && messagesData.length > 0) {
          const unreadMessages = messagesData.filter(
            msg => msg.receiver_id === user.id && !msg.read
          );

          if (unreadMessages.length > 0) {
            await supabase
              .from('support_messages')
              .update({ read: true })
              .eq('order_id', orderId)
              .eq('receiver_id', user.id)
              .eq('read', false);
          }
        }

        // Fetch customer profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, profile_image')
          .eq('id', customerId)
          .single();

        if (profileError) {
          console.error('Error fetching customer profile:', profileError);
        } else {
          setCustomerProfile(profileData);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`support-messages-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `order_id=eq.${orderId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prevMessages => [...prevMessages, newMsg]);

          // Mark as read if we are the receiver
          if (newMsg.receiver_id === user.id && !newMsg.read) {
            await supabase
              .from('support_messages')
              .update({ read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, customerId, user]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !customerId) return;

    try {
      setIsSending(true);
      
      const { error } = await supabase
        .from('support_messages')
        .insert({
          order_id: orderId,
          sender_id: user.id,
          receiver_id: customerId,
          message: newMessage.trim(),
          read: false,
          is_system_message: false
        });

      if (error) throw error;
      
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'Unknown time';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '80vh' }}>
      {/* Header */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          borderRadius: '10px 10px 0 0',
          backgroundColor: theme.palette.primary.main,
          color: 'white'
        }}
      >
        <IconButton 
          sx={{ color: 'white', mr: 1 }}
          onClick={onBack}
        >
          <ArrowBackIcon />
        </IconButton>
        <Avatar 
          src={customerProfile?.profile_image || undefined}
          alt={customerProfile?.full_name || 'Customer'}
          sx={{ mr: 2 }}
        >
          {customerProfile?.full_name?.[0] || 'C'}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {customerProfile?.full_name || 'Customer'}
          </Typography>
          <Typography variant="body2">
            Order #{orderId.slice(0, 8)}
            {orderInfo?.status && ` • ${orderInfo.status}`}
          </Typography>
        </Box>
      </Paper>

      {/* Order Info Summary */}
      {orderInfo && (orderInfo.pickup_location || orderInfo.dropoff_location) && (
        <Paper sx={{ p: 1, mb: 1, backgroundColor: theme.palette.background.default }}>
          {orderInfo.pickup_location && (
            <Typography variant="body2" color="text.secondary">
              From: {orderInfo.pickup_location}
            </Typography>
          )}
          {orderInfo.dropoff_location && (
            <Typography variant="body2" color="text.secondary">
              To: {orderInfo.dropoff_location}
            </Typography>
          )}
        </Paper>
      )}

      {/* Messages Area */}
      <Paper
        sx={{
          p: 2,
          flexGrow: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: theme.palette.grey[50],
          maxHeight: 'calc(80vh - 200px)'
        }}
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" p={3}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : messages.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Typography color="text.secondary">No messages yet. Start the conversation!</Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                alignSelf: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                maxWidth: '70%'
              }}
            >
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: message.sender_id === user?.id 
                    ? theme.palette.primary.main 
                    : theme.palette.grey[200],
                  color: message.sender_id === user?.id 
                    ? 'white' 
                    : 'inherit',
                  borderRadius: message.sender_id === user?.id
                    ? '20px 20px 5px 20px'
                    : '20px 20px 20px 5px',
                  position: 'relative'
                }}
              >
                {message.is_system_message && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      mb: 1,
                      fontStyle: 'italic',
                      color: message.sender_id === user?.id 
                        ? 'rgba(255,255,255,0.7)' 
                        : 'text.secondary'
                    }}
                  >
                    System Message
                  </Typography>
                )}
                <Typography>{message.message}</Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    mt: 1, 
                    textAlign: 'right',
                    color: message.sender_id === user?.id 
                      ? 'rgba(255,255,255,0.7)' 
                      : 'text.secondary'
                  }}
                >
                  {formatMessageTime(message.created_at)}
                </Typography>
              </Paper>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Paper>

      {/* Message Input */}
      <Paper
        elevation={3}
        component="form"
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderRadius: '0 0 10px 10px'
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <TextField
          fullWidth
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          variant="outlined"
          disabled={isSending}
          sx={{ mr: 1 }}
        />
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={handleSendMessage}
          disabled={isSending || !newMessage.trim()}
        >
          Send
        </Button>
      </Paper>
    </Box>
  );
};

export default DriverChatPage;
