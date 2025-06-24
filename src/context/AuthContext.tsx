import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
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
  const [lastError, setLastError] = useState<string | null>(null);
  const [sessionChecks, setSessionChecks] = useState(0);

  const logAuthState = (action: string, data: any) => {
    console.group(`Auth State Update: ${action}`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('User:', user);
    console.log('Loading:', loading);
    console.log('Session Checks:', sessionChecks);
    console.log('Last Error:', lastError);
    console.log('Action Data:', data);
    console.groupEnd();
  };

  // Function to refresh the session from both Supabase and localStorage
  const refreshSession = async () => {
    setSessionChecks(prev => prev + 1);
    logAuthState('Refreshing Session', { trigger: 'manual refresh' });
    setLoading(true);
    
    // Check localStorage first for faster initial loading
    try {
      const localSession = localStorage.getItem('userSession');
      
      if (localSession) {
        const parsedSession = JSON.parse(localSession) as UserSession;
        
        if (parsedSession && parsedSession.id && parsedSession.role) {
          // Set user from localStorage immediately for faster UI response
          setUser(parsedSession);
          setLoading(false); // Temporarily set loading to false while we verify with Supabase
          logAuthState('Local Session Found', { 
            role: parsedSession.role,
            userId: parsedSession.id,
            email: parsedSession.email
          });
          
          // Early return for localStorage data
          return;
        }
      }
    } catch (error) {
      const errorMsg = 'Error parsing localStorage session';
      setLastError(errorMsg);
      logAuthState('Local Session Error', { error });
    }
    
    // Then verify with Supabase Auth (more authoritative)
    try {
      setLoading(true); // Set loading true for Supabase verification
      const { data: { session } } = await supabase.auth.getSession();
      
      logAuthState('Supabase Session Check', { exists: !!session });
      
      if (session?.user) {
        // Get additional user data from the users table
        let userData = null;
        
        // Try getting user by ID first
        const { data: userById, error: userError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, phone, profile_image')
          .eq('id', session.user.id)
          .single();
          
        if (userError) {
          const errorMsg = 'Error fetching user data by ID';
          setLastError(errorMsg);
          logAuthState('User Data Error', { error: userError });
          
          if (userError.code === 'PGRST116') { // No rows returned
            console.log('User not found by ID, checking email...');
            
            // Try by email as fallback if user has an email
            if (session.user.email) {
              const { data: userByEmail, error: emailError } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, phone, profile_image')
                .eq('email', session.user.email)
                .single();
                
              if (!emailError && userByEmail) {
                userData = userByEmail;
                console.log('User found by email');
              }
            }
          }
        } else {
          userData = userById;
          logAuthState('User Data Retrieved', { 
            method: 'by_id',
            id: userData.id,
            role: userData.role
          });
        }
        
        if (userData && userData.role) { // Ensure we have role data
          const userSession: UserSession = {
            id: userData.id,
            email: userData.email || (session.user.email || ''),
            full_name: userData.full_name || 'User',
            role: userData.role, // Role should be required
            phone: userData.phone,
            profile_image: userData.profile_image,
            created_at: new Date().toISOString(),
            last_sign_in_at: session.user.last_sign_in_at || new Date().toISOString()
          };
          
          // Set user state with valid role
          setUser(userSession);
          console.log('Setting user with role:', userSession.role);
          
          // Update localStorage for future sessions
          localStorage.setItem('userSession', JSON.stringify(userSession));
          console.log('Session refreshed from Supabase Auth with role:', userSession.role);
        } else {
          console.log('User authenticated but not found in database');
          setUser(null);
          localStorage.removeItem('userSession');
        }
      } else {
        // No Supabase Auth session
        console.log('No valid session found in Supabase Auth');
        setUser(null);
        localStorage.removeItem('userSession');
      }
    } catch (error) {
      console.error('Error refreshing session from Supabase:', error);
      setUser(null);
      localStorage.removeItem('userSession');
    } finally {
      setLoading(false);
    }
  };
  
  // Login function
  const login = async (email: string, password: string) => {
    try {
      // Trim email to prevent whitespace issues
      const cleanEmail = email.trim().toLowerCase();
      
      console.log('Attempting login for:', cleanEmail);
      
      // First, try to authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        return { success: false, error: 'Invalid email or password' };
      }
      
      // Auth was successful, now fetch the user's profile from the profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, phone, profile_image, created_at')
        .eq('id', authData.user?.id)
        .maybeSingle();
      
      // If there's no profile yet, create one for the passenger
      if (!userProfile && !profileError) {
        // Create a new profile for this user as a passenger
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user?.id,
              email: authData.user?.email,
              full_name: authData.user?.user_metadata?.full_name || 'Passenger',
              role: 'customer',
              created_at: new Date().toISOString()
            }
          ])
          .select('id, full_name, email, role, phone, profile_image, created_at')
          .single();
        
        if (createError) {
          console.error('Error creating user profile:', createError);
          return { success: false, error: 'Failed to create user profile. Please try again.' };
        }
        
        if (newProfile) {
          // Use the newly created profile
          const sessionData: UserSession = {
            id: newProfile.id,
            email: newProfile.email,
            full_name: newProfile.full_name,
            role: 'customer',  // Default role for new users
            phone: null,
            profile_image: null,
            created_at: newProfile.created_at || new Date().toISOString(),
            last_sign_in_at: new Date().toISOString()
          };
          
          setUser(sessionData);
          localStorage.setItem('userSession', JSON.stringify(sessionData));
          
          console.log('New user profile created:', {
            userId: sessionData.id,
            role: sessionData.role,
            name: sessionData.full_name
          });
          
          return { success: true };
        }
      }
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { success: false, error: 'Error retrieving user profile. Please try again.' };
      }
      
      // If we have a profile, verify role-specific data if needed
      if (userProfile) {
        // For drivers, verify they have a driver profile
        if (userProfile.role === 'driver') {
          const { data: driverData, error: driverError } = await supabase
            .from('drivers')
            .select('id')
            .eq('id', userProfile.id)
            .maybeSingle();
            
          if (driverError || !driverData) {
            console.error('Driver profile not found:', driverError);
            return { success: false, error: 'Driver profile not found. Please contact support.' };
          }
        }
        
        // For customers (passengers), ensure they're properly marked in the profiles table
        if (!userProfile.role || userProfile.role === '') {
          // Update the profile to make sure role is set to 'customer'
          await supabase
            .from('profiles')
            .update({ role: 'customer' })
            .eq('id', userProfile.id);
          
          userProfile.role = 'customer';
        }
        
        // Create session data with verified role
        const sessionData: UserSession = {
          id: userProfile.id,
          email: userProfile.email,
          full_name: userProfile.full_name,
          role: userProfile.role,
          phone: userProfile.phone || null,
          profile_image: userProfile.profile_image || null,
          created_at: userProfile.created_at || new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        };
        
        console.log('User role verified:', {
          userId: sessionData.id,
          role: sessionData.role,
          name: sessionData.full_name
        });
        
        // Set user in state and localStorage
        setUser(sessionData);
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        
        return { success: true };
      }
      
      return { success: false, error: 'User profile not found. Please register first.' };
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
  
  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setSessionChecks(0); // Reset counter on initialization
      logAuthState('Initializing Auth', { trigger: 'mount' });
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
        logAuthState('Auth State Change', { event, sessionExists: !!session });
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
  
  // Create context value
  const value: AuthContextType = {
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