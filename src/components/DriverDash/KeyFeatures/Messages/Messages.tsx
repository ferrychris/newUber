import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '@supabase/auth-helpers-react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Container,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import InfoIcon from '@mui/icons-material/Info';
import { supabase } from '../../../../utils/supabaseClient';

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

export default function Messages() {
  const location = useLocation();
  const user = useUser();
  const orderId = location.state?.orderId;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);

  // Fetch messages and set up real-time subscription
  useEffect(() => {
    if (!user || !orderId) {
      setLoading(false);
      setError('Missing user or order information');
      return;
    }

    const fetchMessages = async () => {
      try {
        // Get messages for this order
        const { data: messagesData, error: messagesError } = await supabase
          .from('support_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        setMessages(messagesData || []);

        // Get the other participant's ID (if there are messages)
        if (messagesData && messagesData.length > 0) {
          const otherParticipant = messagesData[0].sender_id === user.id
            ? messagesData[0].receiver_id
            : messagesData[0].sender_id;
          setReceiverId(otherParticipant);
        }

        // Mark received messages as read
        if (messagesData && messagesData.length > 0) {
          await supabase
            .from('support_messages')
            .update({ read: true })
            .eq('receiver_id', user.id)
            .eq('order_id', orderId);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`support-messages-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `order_id=eq.${orderId}`,
      }, async (payload) => {
        const newMessage = payload.new as Message;
        
        // Only handle messages relevant to this user
        if (newMessage?.receiver_id === user?.id || newMessage?.sender_id === user?.id) {
          // Update messages list
          setMessages(current => [...current, newMessage]);
          
          // Mark message as read if we're the receiver
          if (newMessage.receiver_id === user?.id) {
            try {
              await supabase
                .from('support_messages')
                .update({ read: true })
                .eq('id', newMessage.id);
            } catch (err) {
              console.error('Error marking message as read:', err);
            }
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, orderId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || !receiverId) {
      setError('Missing required information to send message');
      return;
    }

    try {
      const { error: sendError } = await supabase
        .from('support_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message: newMessage.trim(),
          order_id: orderId,
          read: false
        });

      if (sendError) throw sendError;
      setNewMessage('');
      // Clear any previous errors on successful send
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message: ' + (err as Error)?.message || 'Unknown error');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ height: '80vh', display: 'flex', flexDirection: 'column', mt: 3 }}>
        <Box p={2} bgcolor="primary.main" color="primary.contrastText">
          <Typography variant="h6">Chat</Typography>
        </Box>

        {/* Messages List */}
        <List sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {messages.map((message) => (
            message.is_system_message ? (
              // System message with special styling
              <ListItem
                key={message.id}
                sx={{
                  justifyContent: 'center',
                  mb: 2,
                  mt: 2
                }}
              >
                <Alert 
                  icon={<InfoIcon />}
                  severity="info"
                  sx={{
                    width: '90%',
                    '& .MuiAlert-message': {
                      width: '100%'
                    }
                  }}
                >
                  <Typography variant="body2">{message.message}</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.7 }}>
                    {new Date(message.created_at).toLocaleString()}
                  </Typography>
                </Alert>
              </ListItem>
            ) : (
              // Regular message styling
              <ListItem
                key={message.id}
                sx={{
                  justifyContent: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                  mb: 1
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: message.sender_id === user?.id ? 'primary.light' : 'grey.100',
                    color: message.sender_id === user?.id ? 'primary.contrastText' : 'text.primary'
                  }}
                >
                  <ListItemText
                    primary={message.message}
                    secondary={new Date(message.created_at).toLocaleString()}
                    secondaryTypographyProps={{
                      color: message.sender_id === user?.id ? 'primary.contrastText' : 'text.secondary',
                      fontSize: '0.75rem'
                    }}
                  />
                </Paper>
              </ListItem>
            )
          ))}
        </List>

        {/* Message Input */}
        <Box
          component="form"
          onSubmit={sendMessage}
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
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
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            endIcon={<SendIcon />}
            disabled={!newMessage.trim()}
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
