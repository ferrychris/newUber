import { Box, Button, Drawer, Typography, TextField, IconButton, Paper, CircularProgress, Alert, Divider } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../../../../utils/supabaseClient';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  order_id: string;
  read: boolean;
  is_system_message?: boolean;
}

interface OrderChatDrawerProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
  customerId?: string; // Add this to know who to send messages to
}

export const OrderChatDrawer = ({ orderId, open, onClose, customerId }: OrderChatDrawerProps): JSX.Element => {
  const user = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    if (open && messageEndRef.current) {
      scrollToBottom();
    }
  }, [messages, open]);
  
  // Fetch messages when drawer opens
  useEffect(() => {
    if (open && orderId && user) {
      fetchMessages();
      setupSubscription();
    }
    
    return () => {
      // Clean up subscription when drawer closes
      supabase.channel(`support-messages-${orderId}`).unsubscribe();
    };
  }, [open, orderId, user]);
  
  const fetchMessages = async () => {
    if (!orderId || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch messages for this order
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark messages as read
      await supabase
        .from('support_messages')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('order_id', orderId);
        
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Could not load messages');
    } finally {
      setLoading(false);
    }
  };
  
  const setupSubscription = () => {
    if (!orderId || !user) return;
    
    // Subscribe to new messages
    supabase
      .channel(`support-messages-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `order_id=eq.${orderId}`,
      }, async (payload) => {
        const newMessage = payload.new as Message;
        
        if (newMessage.receiver_id === user.id || newMessage.sender_id === user.id) {
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if we're the receiver
          if (newMessage.receiver_id === user.id) {
            await supabase
              .from('support_messages')
              .update({ read: true })
              .eq('id', newMessage.id);
          }
        }
      })
      .subscribe();
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !customerId) return;
    
    try {
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
      
      setNewMessage(''); // Clear input after sending
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Order Chat</Typography>
          <IconButton onClick={onClose} edge="end" aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* Message List */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="body2" color="text.secondary">
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
                  mb: 2 
                }}
              >
                <Paper 
                  elevation={1} 
                  sx={{
                    p: 2,
                    maxWidth: '75%',
                    borderRadius: 2,
                    bgcolor: message.sender_id === user?.id ? 'primary.main' : 'background.paper',
                    color: message.sender_id === user?.id ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body1">{message.message}</Typography>
                  <Typography 
                    variant="caption" 
                    display="block" 
                    sx={{ mt: 0.5, opacity: 0.7 }}
                  >
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </Typography>
                </Paper>
              </Box>
            ))
          )}
          <div ref={messageEndRef} />
        </Box>
        
        <Divider />
        
        {/* Message Input */}
        <Box 
          component="form" 
          onSubmit={handleSendMessage}
          sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!customerId}
            helperText={!customerId ? "Customer ID not available" : undefined}
          />
          <IconButton 
            type="submit" 
            color="primary" 
            disabled={!newMessage.trim() || !customerId}
            sx={{ p: 1 }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
};
