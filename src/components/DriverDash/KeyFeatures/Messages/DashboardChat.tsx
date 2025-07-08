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
  useTheme,
  Card,
  CardHeader,
  CardContent
} from '@mui/material';
import { 
  Close as CloseIcon,
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

interface DashboardChatProps {
  orderId: string;
  customerId: string;
  onClose?: () => void;
  orderInfo?: {
    id: string;
    pickup_location?: string;
    dropoff_location?: string;
    status?: string;
  };
}

const DashboardChat: React.FC<DashboardChatProps> = ({ 
  orderId, 
  customerId, 
  onClose,
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
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <CardHeader
        avatar={
          <Avatar 
            src={customerProfile?.profile_image || undefined}
            alt={customerProfile?.full_name || 'Customer'}
          >
            {customerProfile?.full_name?.[0] || 'C'}
          </Avatar>
        }
        action={
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        }
        title={customerProfile?.full_name || 'Customer'}
        subheader={`Order #${orderId.slice(0, 8)}${orderInfo?.status ? ` • ${orderInfo.status}` : ''}`}
      />

      {/* Order Info Summary */}
      {orderInfo && (orderInfo.pickup_location || orderInfo.dropoff_location) && (
        <Box sx={{ px: 2, pb: 1 }}>
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
          <Divider sx={{ my: 1 }} />
        </Box>
      )}

      {/* Messages Area */}
      <CardContent 
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: theme.palette.grey[50],
          maxHeight: 'calc(100vh - 360px)',
          minHeight: '300px'
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
                    : '20px 20px 20px 5px'
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
      </CardContent>

      {/* Message Input */}
      <Box
        component="form"
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderTop: `1px solid ${theme.palette.divider}`
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
          size="small"
          sx={{ mr: 1 }}
        />
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={handleSendMessage}
          disabled={isSending || !newMessage.trim()}
          size="small"
        >
          Send
        </Button>
      </Box>
    </Card>
  );
};

export default DashboardChat;
