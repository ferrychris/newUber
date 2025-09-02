import { supabase } from '../utils/supabase';

// Types
export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
  sender_image?: string;
  is_admin?: boolean;
}

export interface UserInfo {
  id: string;
  full_name?: string;
  profile_image?: string;
  is_admin?: boolean;
}

// Helper function to get current authenticated user (outside of the object to avoid this binding issues)
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Support Service API
const supportService = {
  // Get current authenticated user
  getCurrentUser,

  // Create a new support ticket with initial message
  async createTicket(subject: string, message: string): Promise<SupportTicket> {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // First create the ticket
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .insert([
        {
          user_id: user.id,
          subject,
          status: 'open'
        }
      ])
      .select();

    if (ticketError) throw ticketError;
    if (!ticketData || ticketData.length === 0) throw new Error('Failed to create ticket');

    // Then add the initial message
    const { error: messageError } = await supabase
      .from('support_messages')
      .insert([
        {
          ticket_id: ticketData[0].id,
          // sender_id will be set by DB default auth.uid()
          message
        }
      ]);

    if (messageError) throw messageError;

    // Return the created ticket
    return ticketData[0];
  },

  // Get all tickets for the current user with their messages
  async getUserTickets(): Promise<SupportTicket[]> {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Step 1: Get all tickets for the user
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ticketsError) throw ticketsError;
    if (!ticketsData || ticketsData.length === 0) return [];

    // Step 2: Get all ticket IDs
    const ticketIds = ticketsData.map(ticket => ticket.id);

    // Step 3: Fetch all messages for these tickets in a single query (in parallel with user data)
    const messagesPromise = supabase
      .from('support_messages')
      .select('*')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: true });

    // Step 4: Get all unique sender IDs (we'll do this after getting messages)
    
    // Execute the messages query
    const { data: allMessagesData, error: messagesError } = await messagesPromise;
    
    if (messagesError) throw messagesError;
    if (!allMessagesData || allMessagesData.length === 0) {
      // If no messages, return tickets with empty messages arrays
      return ticketsData.map(ticket => ({
        ...ticket,
        messages: []
      }));
    }

    // Get unique sender IDs from all messages
    const senderIds = [...new Set(allMessagesData.map(msg => msg.sender_id))];

    // Step 5: Fetch all user data for these senders in a single query
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, profile_image, is_admin')
      .in('id', senderIds);

    if (usersError) throw usersError;

    // Create a map of user data for quick lookup
    const userMap: Record<string, UserInfo> = {};
    (usersData || []).forEach(user => {
      userMap[user.id] = user;
    });

    // Group messages by ticket ID and add sender info
    const messagesByTicket: Record<string, SupportMessage[]> = {};
    allMessagesData.forEach(message => {
      if (!messagesByTicket[message.ticket_id]) {
        messagesByTicket[message.ticket_id] = [];
      }

      // Add sender info to each message
      const senderInfo = userMap[message.sender_id] || {};
      
      messagesByTicket[message.ticket_id].push({
        ...message,
        sender_name: senderInfo.full_name || 'Unknown User',
        sender_image: senderInfo.profile_image,
        is_admin: senderInfo.is_admin || false
      });
    });

    // Combine tickets with their messages
    return ticketsData.map(ticket => ({
      ...ticket,
      messages: messagesByTicket[ticket.id] || []
    }));
  },

  // Send a reply to an existing ticket
  async sendReply(ticketId: string, message: string): Promise<SupportMessage> {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Insert the reply message
    const { data, error } = await supabase
      .from('support_messages')
      .insert([
        {
          ticket_id: ticketId,
          // sender_id will be set by DB default auth.uid()
          message: message.trim()
        }
      ])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Failed to send reply');

    return data[0];
  },

  // Get messages for a specific ticket with sender info
  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch messages for the ticket
    const { data: messagesData, error: messagesError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;
    if (!messagesData || messagesData.length === 0) return [];

    // Get unique sender IDs
    const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];

    // Fetch sender info
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, profile_image, is_admin')
      .in('id', senderIds);

    if (usersError) throw usersError;

    // Create a map of user data
    const userMap: Record<string, UserInfo> = {};
    (usersData || []).forEach(user => {
      userMap[user.id] = user;
    });

    // Add sender info to messages
    return messagesData.map(msg => {
      const senderInfo = userMap[msg.sender_id] || {};
      return {
        ...msg,
        sender_name: senderInfo.full_name || 'Unknown User',
        sender_image: senderInfo.profile_image,
        is_admin: senderInfo.is_admin || false
      };
    });
  }
};

export default supportService; 