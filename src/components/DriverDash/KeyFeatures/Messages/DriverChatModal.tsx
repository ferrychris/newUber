// For TypeScript to recognize the subscription registry type
declare global {
  interface Window {
    GLOBAL_SUBSCRIPTIONS: Map<string, any>;
  }
}

// Add TypeScript interface for subscription registry
type SubscriptionItem = {
  channel: any;
  refCount: number;
  unsubscribe: () => void;
};

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  CircularProgress, 
  useTheme, 
  Switch, 
  FormControlLabel, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar
} from '@mui/material';
import { 
  Close as CloseIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import { useUser } from '@supabase/auth-helpers-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../../../utils/supabase';
import { fetchUserProfile, getProfileDisplayName, getProfilePhoneNumber, ProfileData } from '../../../../utils/profileUtils';
import { getAIResponse } from '../../../../utils/aiUtils';

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

// Using ProfileData from profileUtils.ts instead of defining a separate interface

interface DriverChatModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  customerId: string;
  orderInfo?: {
    id: string;
    pickup_location?: string;
    dropoff_location?: string;
    status?: string;
    customer_name?: string;
  };
}

const DriverChatModal: React.FC<DriverChatModalProps> = ({ 
  open,
  onClose,
  orderId, 
  customerId, 
  orderInfo
}) => {
  const theme = useTheme();
  const user = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] = useState<ProfileData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationMode, setConversationMode] = useState<boolean>(false);
  const [aiIsTyping, setAiIsTyping] = useState<boolean>(false);

  // Fetch messages for this order and customer
  useEffect(() => {
    if (!open || !orderId || !customerId || !user) return;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

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

        // Fetch customer profile using centralized utility
        const profileData = await fetchUserProfile(customerId);
        
        if (profileData) {
          console.log('Customer profile found:', profileData);
          setCustomerProfile(profileData);
        } else {
          console.log('No customer profile found for ID:', customerId);
          // Create a fallback profile with order info
          setCustomerProfile({
            id: customerId,
            full_name: orderInfo?.customer_name || `User ${customerId.substring(0, 8)}`
          });
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [open, orderId, customerId, user]);

  // Use a global subscription registry to prevent multiple subscriptions
  const subscriptionRegistry = useMemo(() => {
    // Initialize global registry if it doesn't exist
    if (!window.GLOBAL_SUBSCRIPTIONS) {
      window.GLOBAL_SUBSCRIPTIONS = new Map<string, SubscriptionItem>();
    }
    return window.GLOBAL_SUBSCRIPTIONS;
  }, []);
  
  // Create a unique channel name for this subscription
  const channelName = useMemo(() => {
    return orderId && user ? `public:messages:order_id=eq.${orderId}` : null;
  }, [orderId, user]);

  // Message handler function - defined outside useEffect to avoid recreation
  const handleNewMessage = useCallback(async (payload: any) => {
    const newMsg = payload.new as Message;
    
    // Check if this message already exists in our state to avoid duplicates
    // This can happen when we send a message and then receive it from the subscription
    setMessages(prevMessages => {
      // Check if we already have this message by ID
      const messageExists = prevMessages.some(msg => msg.id === newMsg.id);
      if (messageExists) {
        return prevMessages; // Don't add duplicate
      }
      return [...prevMessages, newMsg];
    });

    // Mark as read if we are the receiver
    if (user && newMsg.receiver_id === user.id && !newMsg.read) {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', newMsg.id);
    }
  }, [user, setMessages]);

  // Set up real-time subscription with improved global management
  useEffect(() => {
    // Only proceed if component is open and we have all required data
    if (!open || !orderId || !customerId || !user || !channelName) return;
    
    // Track this component instance's subscription
    let unsubscribeFn: (() => void) | null = null;
    
    // Check if we already have an active subscription for this channel
    let existingSubscription = subscriptionRegistry.get(channelName);
    
    if (!existingSubscription) {
      console.log(`Creating new subscription for channel: ${channelName}`);      
      
      // Create a new subscription using the channel
      const channel = supabase.channel(`chat-${orderId}`);
      
      // Set up the subscription
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `order_id=eq.${orderId}`
          },
          handleNewMessage
        )
        .subscribe((status) => {
          console.log(`Subscription status for ${channelName}:`, status);
        });
      
      // Create subscription object with reference counting
      existingSubscription = {
        channel,
        refCount: 0,
        unsubscribe: () => {
          channel.unsubscribe();
          subscriptionRegistry.delete(channelName);
          console.log(`Removed subscription for ${channelName}`);
        }
      };
      
      // Store in global registry
      subscriptionRegistry.set(channelName, existingSubscription);
    } else {
      console.log(`Reusing existing subscription for channel: ${channelName}`);
    }
    
    // Increment reference count
    existingSubscription.refCount += 1;
    console.log(`Subscription ref count for ${channelName}: ${existingSubscription.refCount}`);
    
    // Create unsubscribe function for this component instance
    unsubscribeFn = () => {
      const subscription = subscriptionRegistry.get(channelName);
      if (subscription) {
        subscription.refCount -= 1;
        console.log(`Decreased ref count for ${channelName} to ${subscription.refCount}`);
        
        // If no more references, clean up the subscription
        if (subscription.refCount <= 0) {
          subscription.unsubscribe();
        }
      }
    };

    // Cleanup function
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [open, orderId, customerId, user, channelName, handleNewMessage]);
  
  // Global declaration is already at the top of the file

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !customerId) return;

    try {
      setIsSending(true);
      
      // Store the message being sent
      const messageToSend = newMessage.trim();
      
      // Send via RPC to enforce server-side authorization
      const { error } = await supabase.rpc('send_message', {
        p_order_id: orderId,
        p_receiver_id: customerId,
        p_content: messageToSend
      });

      if (error) throw error;
      
      // Clear the input field
      setNewMessage('');
      
      // If conversation mode is enabled, get AI response
      if (conversationMode) {
        try {
          // Show AI is typing indicator
          setAiIsTyping(true);
          
          // Prepare conversation history for context
          const conversationHistory = messages.slice(-5).map(msg => ({
            sender: msg.sender_id === user?.id ? 'Driver' : 'Customer',
            message: msg.message
          }));
          
          // Add the message just sent
          conversationHistory.push({
            sender: 'Driver', // This is the driver's message, not the customer's
            message: messageToSend
          });
          
          // Get AI response
          const aiResponse = await getAIResponse(
            messageToSend,
            orderId || '',
            conversationHistory
          );
          
          if (aiResponse.success) {
            // Send AI response via RPC as the driver
            const { error: aiInsertError } = await supabase.rpc('send_message', {
              p_order_id: orderId,
              p_receiver_id: customerId,
              p_content: aiResponse.message
            });
            if (aiInsertError) {
              console.error('Error inserting AI response:', aiInsertError);
              setError('Failed to send AI response. Please try again.');
            }
          } else {
            console.error('AI response error:', aiResponse.error);
            setError('AI assistant is unavailable. Please try again later.');
          }
        } catch (aiErr) {
          console.error('Error with AI response:', aiErr);
          setError('Failed to get AI response. Please try again.');
        } finally {
          setAiIsTyping(false);
        }
      }
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

  // Get the customer name using our utility function
  const customerName = useMemo(() => {
    return getProfileDisplayName(customerProfile, orderInfo?.customer_name);
  }, [customerProfile, orderInfo]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm"
      PaperProps={{
        sx: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between', 
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.primary.main,
        color: 'white',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Avatar 
            src={customerProfile?.profile_image || undefined}
            alt={customerName}
          >
            {customerName?.[0] || 'C'}
          </Avatar>
          <Box>
            <Typography variant="h6">
              {customerName}
            </Typography>
            <Typography variant="body2">
              Order #{orderId.slice(0, 8)}
              {orderInfo?.status && ` • ${orderInfo.status}`}
            </Typography>
            {getProfilePhoneNumber(customerProfile) && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <PhoneIcon fontSize="small" sx={{ fontSize: '0.9rem', mr: 0.5 }} />
                  {getProfilePhoneNumber(customerProfile)}
                </Box>
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* AI Conversation Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={conversationMode}
                onChange={(e) => setConversationMode(e.target.checked)}
                color="default"
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SmartToyIcon fontSize="small" />
                <Typography variant="caption" sx={{ color: 'white' }}>
                  AI Mode
                </Typography>
              </Box>
            }
            sx={{ 
              mr: 0,
              '& .MuiFormControlLabel-label': { 
                color: 'white',
              }
            }}
          />
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Order Info Summary */}
      {orderInfo && (orderInfo.pickup_location || orderInfo.dropoff_location) && (
        <Box sx={{ px: 3, py: 1, bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}` }}>
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
        </Box>
      )}

      {/* Messages Area */}
      <DialogContent sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        backgroundColor: theme.palette.grey[50],
        overflow: 'auto'
      }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" p={3}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Empty state */}
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No messages yet. Start the conversation!</Typography>
              </Box>
            )}
            
            {/* AI typing indicator */}
            {aiIsTyping && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  p: 1, 
                  bgcolor: 'rgba(25, 118, 210, 0.08)', 
                  borderRadius: 2,
                  maxWidth: '80%',
                  alignSelf: 'flex-start',
                  mb: 1
                }}
              >
                <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 24, height: 24 }}>
                  <SmartToyIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CircularProgress size={8} />
                  <CircularProgress size={8} sx={{ animationDelay: '0.2s' }} />
                  <CircularProgress size={8} sx={{ animationDelay: '0.4s' }} />
                </Box>
              </Box>
            )}
            
            {/* Message list */}
            {messages.map((message) => (
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
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </DialogContent>

      {/* Message Input */}
      <DialogActions sx={{ 
        p: 2, 
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper
      }}>
        <Box
          component="form"
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
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
            size="medium"
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
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DriverChatModal;
