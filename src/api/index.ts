import axios from 'axios';
import { supabase } from '../utils/supabase';

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
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  
  if (session?.access_token) {
    if (!config.headers) {
      config.headers = {};
    }
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle global API response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        // Unauthorized - redirect to login or refresh token
        console.log('Unauthorized request - redirecting to login');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api; 