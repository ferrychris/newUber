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
  useTheme
} from '@mui/material';
import { 
  Close as CloseIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useUser } from '@supabase/auth-helpers-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../../../utils/supabase';

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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages for this order and customer
  useEffect(() => {
    if (!orderId || !customerId || !user) return;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Fetch messages for this order
        const { data: messagesData, error } = await supabase
          .from('messages')
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
              .from('messages')
              .update({ read: true })
              .eq('order_id', orderId)
              .eq('receiver_id', user.id)
              .eq('read', false);
          }
        }

        // Fetch customer profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, profile_image')
          .eq('id', customerId)
          .maybeSingle(); // Use maybeSingle to avoid 406 error if no user found

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
      .channel(`messages-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${orderId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prevMessages => [...prevMessages, newMsg]);

          // Mark as read if we are the receiver
          if (newMsg.receiver_id === user.id && !newMsg.read) {
            await supabase
              .from('messages')
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
      
      // Use RPC to enforce server-side authorization and defaults
      const { error } = await supabase.rpc('send_message', {
        p_order_id: orderId,
        p_receiver_id: customerId,
        p_content: newMessage.trim()
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
    <Paper 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: '#18181B', // Updated to dark gray/near-black color
        borderRadius: 2,
        overflow: 'hidden',
        color: 'white' // Adding white text color for better contrast
      }}
      elevation={2}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={customerProfile?.profile_image || undefined}
            alt={customerProfile?.full_name || 'Customer'}
            sx={{ mr: 2 }}
          >
            {customerProfile?.full_name?.[0] || 'C'}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" color="white">
              {customerProfile?.full_name || 'Customer'}
            </Typography>
            <Typography variant="caption" color="rgba(255, 255, 255, 0.7)">
              Order #{orderId.slice(0, 8)}{orderInfo?.status ? ` • ${orderInfo.status}` : ''}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ ml: 1, color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Order Info Summary */}
      {orderInfo && (orderInfo.pickup_location || orderInfo.dropoff_location) && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
          {orderInfo.pickup_location && (
            <Typography variant="body2" color="rgba(255, 255, 255, 0.9)" sx={{ display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ fontWeight: 'medium', mr: 1, color: 'white' }}>From:</Box> {orderInfo.pickup_location}
            </Typography>
          )}
          {orderInfo.dropoff_location && (
            <Typography variant="body2" color="rgba(255, 255, 255, 0.9)" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Box component="span" sx={{ fontWeight: 'medium', mr: 1, color: 'white' }}>To:</Box> {orderInfo.dropoff_location}
            </Typography>
          )}
        </Box>
      )}

      {/* Messages Area */}
      <Box 
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(30, 30, 35, 0.6)' 
            : 'rgba(245, 245, 250, 0.7)',
          maxHeight: 'calc(100vh - 360px)',
          minHeight: '300px',
          borderTop: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.05)' 
            : '1px solid rgba(0, 0, 0, 0.04)',
          borderBottom: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.05)' 
            : '1px solid rgba(0, 0, 0, 0.08)'
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
                    ? theme.palette.mode === 'dark' ? '#3d4db5' : '#3367d6' // Blue theme for sent messages, darker in dark mode
                    : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', // Received messages
                  color: message.sender_id === user?.id 
                    ? 'white' 
                    : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
                  borderRadius: message.sender_id === user?.id
                    ? '20px 20px 5px 20px'
                    : '20px 20px 20px 5px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: message.sender_id !== user?.id 
                    ? theme.palette.mode === 'dark'
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.05)'
                    : 'none'
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
                <Typography sx={{ 
                  color: message.sender_id === user?.id 
                    ? 'white' 
                    : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
                  fontWeight: 400
                }}>
                  {message.message}
                </Typography>
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
      </Box>

      {/* Message Input */}
      <Box
        component="form"
        sx={{ 
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderTop: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(28, 28, 32, 0.8)'
            : 'rgba(250, 250, 250, 0.9)'
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <TextField
          fullWidth
          placeholder="Type your message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          size="small"
          sx={{ 
            mr: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { 
                borderColor: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(0, 0, 0, 0.15)'
              },
              '&:hover fieldset': { 
                borderColor: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(0, 0, 0, 0.25)'
              },
              '&.Mui-focused fieldset': { 
                borderColor: theme.palette.mode === 'dark'
                  ? '#5d6cc0'
                  : '#3367d6'
              },
            },
            '& .MuiInputBase-input': {
              color: theme.palette.mode === 'dark'
                ? 'white'
                : 'inherit'
            }
          }}
        />
        <Button
          variant="contained" 
          onClick={handleSendMessage}
          disabled={isSending || !newMessage.trim()}
          size="small"
          endIcon={<SendIcon />}
          sx={{
            backgroundColor: '#27272A',
            '&:hover': {
              backgroundColor: '#3F3F46'
            },
            '&.Mui-disabled': {
              bgcolor: 'rgba(255, 255, 255, 0.1)'
            },
            boxShadow: 'none',
            color: 'white',
            px: 3
          }}
        >
          Send
        </Button>
      </Box>
    </Paper>
  );
};

export default DashboardChat;
