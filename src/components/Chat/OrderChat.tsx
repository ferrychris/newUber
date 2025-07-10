import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Paper, Avatar, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material';
import { supabase } from '../../lib/supabaseClient';
import { Send as SendIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read_at: string | null;
  sender_name: string;
  receiver_name: string;
}

interface OrderChatProps {
  orderId: string;
  otherUserId?: string;
  otherUserName?: string;
}

export const OrderChat: React.FC<OrderChatProps> = ({ orderId, otherUserId: initialOtherUserId, otherUserName: initialOtherUserName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | undefined>(initialOtherUserId);
  const [otherUserName, setOtherUserName] = useState<string | undefined>(initialOtherUserName);
  const [otherUserPhone, setOtherUserPhone] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Format message from real-time updates
  const formatMessage = (rawMessage: any): Message => {
    // Ensure message has all required fields
    return {
      id: rawMessage.id,
      content: rawMessage.content,
      sender_id: rawMessage.sender_id,
      receiver_id: rawMessage.receiver_id,
      created_at: rawMessage.created_at,
      read_at: rawMessage.read_at,
      sender_name: rawMessage.sender_name || '',
      receiver_name: rawMessage.receiver_name || ''
    };
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_order_messages_read', {
        p_order_id: orderId
      });
      if (error) throw error;
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Fetch other user info if not provided
  const fetchOtherUserInfo = async () => {
    if (!orderId || !user?.id || (otherUserId && otherUserName)) return;
    
    try {
      // First get the order to determine if user is customer or driver
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('user_id, driver_id')
        .eq('id', orderId)
        .single();
        
      if (orderError) throw orderError;
      
      // Determine the other user ID based on current user role
      const isCustomer = user.id === orderData.user_id;
      const targetUserId = isCustomer ? orderData.driver_id : orderData.user_id;
      
      if (!targetUserId) return; // No other user yet (e.g., no driver assigned)
      
      // Fetch other user's profile info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', targetUserId)
        .single();
        
      if (profileError) throw profileError;
      
      setOtherUserId(targetUserId);
      setOtherUserName(profileData.full_name || profileData.email?.split('@')[0] || 'User');
      setOtherUserPhone(profileData.phone || undefined);
    } catch (err) {
      console.error('Error fetching other user info:', err);
      // Don't set error state here as it's not critical
    }
  };
  
  // Fetch messages
  const fetchMessages = async () => {
    if (!orderId || !user?.id) return;
    
    setError(null);
    if (messages.length === 0) setInitialLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_order_messages', {
        p_order_id: orderId
      });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
      
      // Mark messages as read after fetching
      await markMessagesAsRead();
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setInitialLoading(false);
    }
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !orderId || !otherUserId || !user?.id) {
      if (!otherUserId) {
        toast.error('Cannot send message: recipient not found');
      }
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.rpc('send_message', {
        p_order_id: orderId,
        p_receiver_id: otherUserId,
        p_content: newMessage.trim()
      });

      if (error) throw error;
      setNewMessage('');
      // No need to fetch messages here as the subscription will handle it
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!orderId || !user?.id) return;
    
    // Fetch other user info if needed
    fetchOtherUserInfo();
    
    // Initial fetch
    fetchMessages();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel(`order-messages-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('Received message update:', payload);
          
          // Handle different event types more efficiently
          if (payload.eventType === 'INSERT') {
            // Add the new message to state directly without refetching
            const newMessage = formatMessage(payload.new);
            setMessages(currentMessages => [...currentMessages, newMessage]);
            // Still mark messages as read
            markMessagesAsRead();
          } else if (payload.eventType === 'UPDATE') {
            // Update the message in state
            const updatedMessage = formatMessage(payload.new);
            setMessages(currentMessages => 
              currentMessages.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove the message from state
            const deletedMessageId = payload.old.id;
            setMessages(currentMessages => 
              currentMessages.filter(msg => msg.id !== deletedMessageId)
            );
          } else {
            // Fallback to fetching all messages
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, user?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle phone call
  const handleCall = () => {
    if (otherUserPhone) {
      window.location.href = `tel:${otherUserPhone}`;
    } else {
      toast.error('Phone number not available');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat header with call button */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4
        }}
      >
        <Typography variant="h6">
          {otherUserName || 'Chat'}
        </Typography>
        {otherUserPhone && (
          <Tooltip title="Call">
            <IconButton
              color="inherit"
              onClick={handleCall}
              aria-label="Call"
            >
              <PhoneIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'grey.100'
        }}
      >
        {initialLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={40} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
            <Button 
              size="small" 
              sx={{ ml: 2 }} 
              onClick={fetchMessages}
              variant="outlined"
            >
              Retry
            </Button>
          </Alert>
        ) : messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, maxWidth: '70%' }}>
                {message.sender_id !== user?.id && (
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    {(otherUserName || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                )}
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: message.sender_id === user?.id ? 'primary.main' : 'white',
                    color: message.sender_id === user?.id ? 'white' : 'text.primary'
                  }}
                >
                  <Typography variant="body1">{message.content}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {message.read_at && message.sender_id === user?.id && (
                      <span style={{ marginLeft: '4px', fontSize: '0.7rem' }}>✓</span>
                    )}
                  </Typography>
                </Paper>
                {message.sender_id === user?.id && (
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                )}
              </Box>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message input */}
      <Box
        component="form"
        onSubmit={sendMessage}
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={loading || initialLoading}
          size="small"
          autoComplete="off"
          InputProps={{
            sx: { borderRadius: 2 }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || initialLoading || !newMessage.trim()}
          sx={{ borderRadius: 2 }}
          endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
};
