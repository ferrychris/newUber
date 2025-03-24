import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';

// Define types for our auth context
interface UserSession {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  profile_image?: string | null;
  created_at: string;
  last_sign_in_at: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => ({ success: false, error: 'Not implemented' }),
  logout: async () => {},
  refreshSession: async () => {},
  hasRole: () => false,
});

// Hook for using the auth context
export const useAuth = () => useContext(AuthContext);

// Auth Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      try {
        await refreshSession();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          await refreshSession();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('userSession');
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Function to refresh the session from both Supabase and localStorage
  const refreshSession = async () => {
    // First try Supabase Auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      try {
        // Get additional user data from the users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email, role, phone, profile_image')
          .eq('id', session.user.id)
          .single();
          
        if (userError && userError.code !== 'PGRST116') {
          console.error('Error fetching user data:', userError);
          throw userError;
        }
        
        if (userData) {
          const userSession: UserSession = {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role || 'customer',
            phone: userData.phone,
            profile_image: userData.profile_image,
            created_at: new Date().toISOString(),
            last_sign_in_at: session.user.last_sign_in_at || new Date().toISOString()
          };
          
          setUser(userSession);
          
          // Also update localStorage for consistent data
          localStorage.setItem('userSession', JSON.stringify(userSession));
          console.log('Session refreshed from Supabase Auth');
          return;
        }
      } catch (error) {
        console.error('Error refreshing session from Supabase:', error);
      }
    }
    
    // Fallback to localStorage if no Supabase Auth session
    try {
      const localSession = localStorage.getItem('userSession');
      
      if (localSession) {
        const parsedSession = JSON.parse(localSession) as UserSession;
        
        if (parsedSession && parsedSession.id) {
          setUser(parsedSession);
          console.log('Session refreshed from localStorage');
          return;
        }
      }
    } catch (error) {
      console.error('Error parsing localStorage session:', error);
    }
    
    // If we reach here, no valid session was found
    setUser(null);
  };
  
  // Login function
  const login = async (email: string, password: string) => {
    try {
      // Trim email to prevent whitespace issues
      const cleanEmail = email.trim().toLowerCase();
      
      console.log('Attempting login for:', cleanEmail);
      
      // Check if the user exists in our custom users table
      const { data: userInDb, error: userCheckError } = await supabase
        .from('users')
        .select('id, full_name, password, email, role, phone, profile_image')
        .eq('email', cleanEmail)
        .maybeSingle();
        
      if (userCheckError) {
        console.error('Error checking user in DB:', userCheckError);
        return { success: false, error: 'Error checking user credentials. Please try again.' };
      }
      
      // If user doesn't exist
      if (!userInDb) {
        console.error('User not found in database');
        return { success: false, error: 'Invalid email or password' };
      }
      
      // Check password
      if (userInDb.password === password) {
        console.log('Password matched for user in custom table');
        
        // Create session data
        const sessionData: UserSession = {
          id: userInDb.id,
          email: userInDb.email,
          full_name: userInDb.full_name,
          role: userInDb.role || 'customer',
          phone: userInDb.phone || null,
          profile_image: userInDb.profile_image || null,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        };
        
        // Set user in state
        setUser(sessionData);
        
        // Save session to localStorage
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        
        console.log('User logged in:', userInDb.full_name);
        console.log('User role:', userInDb.role || 'customer');
        
        // Also try to sign in with Supabase Auth for RLS policies to work
        try {
          // This is optional and will only work if the user exists in auth.users
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password
          });
        } catch (authError) {
          // If Supabase Auth fails, we still proceed with localStorage auth
          console.log('Supabase Auth login failed, using localStorage only:', authError);
        }
        
        return { success: true };
      } else {
        // Passwords don't match
        console.error('Password incorrect for user');
        return { success: false, error: 'Incorrect password' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      // Sign out from Supabase Auth
      await supabase.auth.signOut();
      
      // Clear localStorage
      localStorage.removeItem('userSession');
      
      // Clear user state
      setUser(null);
      
      console.log('User logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };
  
  // Function to check if user has a specific role
  const hasRole = (role: string | string[]) => {
    if (!user) return false;
    
    // Check against a single role
    if (typeof role === 'string') {
      return user.role === role;
    }
    
    // Check against an array of roles
    return role.includes(user.role);
  };
  
  // Context value
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshSession,
    hasRole
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 