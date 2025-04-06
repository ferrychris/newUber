import axios from 'axios';
import { SupportTicket, SupportMessage } from '../services/supportService';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor to attach auth token
api.interceptors.request.use(async (config) => {
  // Get the session from Supabase
  const session = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
  if (session?.access_token) {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// API functions for support
const supportApi = {
  // Get all tickets for the current user
  async getUserTickets(): Promise<SupportTicket[]> {
    try {
      const response = await api.get('/support/tickets');
      return response.data;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw error;
    }
  },

  // Create a new support ticket
  async createTicket(subject: string, message: string): Promise<SupportTicket> {
    try {
      const response = await api.post('/support/tickets', { subject, message });
      return response.data;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  },

  // Get all messages for a specific ticket
  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    try {
      const response = await api.get(`/support/tickets/${ticketId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      throw error;
    }
  },

  // Send a reply to a ticket
  async sendReply(ticketId: string, message: string): Promise<SupportMessage> {
    try {
      const response = await api.post(`/support/tickets/${ticketId}/messages`, { message });
      return response.data;
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  },

  // Update a ticket's status
  async updateTicketStatus(ticketId: string, status: string): Promise<SupportTicket> {
    try {
      const response = await api.patch(`/support/tickets/${ticketId}`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  },

  // Get ticket counts by status
  async getTicketCounts(): Promise<{open: number, inProgress: number, closed: number}> {
    try {
      const response = await api.get('/support/tickets/counts');
      return response.data;
    } catch (error) {
      console.error('Error fetching ticket counts:', error);
      throw error;
    }
  }
};

export default supportApi; 