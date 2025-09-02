import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

// Define types for our auth context
interface UserSession {
  id: string;
  user_id: string; // Foreign key to auth.users
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  profile_image?: string | null;
  created_at: string;
  last_sign_in_at: string;
  is_admin: boolean;
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
        
        // Add missing properties if needed for backwards compatibility
        if (!('user_id' in parsedSession)) {
          // Type assertion to bypass TypeScript error
          (parsedSession as any).user_id = parsedSession.id;
        }
        if (!('is_admin' in parsedSession)) {
          // Type assertion to bypass TypeScript error
          (parsedSession as any).is_admin = parsedSession.role === 'admin';
        }
        
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
          .select('id, user_id, full_name, email, role, phone, phone_number, profile_image, is_admin')
          .eq('user_id', session.user.id)
          .single();
          
        if (userError) {
          const errorMsg = 'Error fetching user data by ID';
          setLastError(errorMsg);
          logAuthState('User Data Error', { error: userError });
          
          if (userError.code === 'PGRST116') { // No rows returned
            console.log('User not found by ID, checking email...');
            
            // Try by email as fallback if user has an email
            const { data: userByEmail, error: emailError } = await supabase
              .from('profiles')
              .select('id, user_id, full_name, email, role, phone, phone_number, profile_image, is_admin')
              .eq('email', session.user.email || '')
              .single();
                
              if (!emailError && userByEmail) {
                userData = userByEmail;
                console.log('User found by email');
                if (userData) {
                  // Using type assertion to avoid TypeScript error
                  const id = (userData as any).id;
                  const role = (userData as any).role;
                  const email = (userData as any).email;
                  logAuthState('User Found By Email', { 
                    userId: id,
                    role: role,
                    email: email
                  });
                }
              } else {
                userData = userById;
                if (userData) {
                  logAuthState('User Data Retrieved', { 
                    method: 'by_id',
                    id: userData.id,
                    role: userData.role
                  });
                }
              }
          } else {
            userData = userById;
            if (userData) {
              // Using type assertion to avoid TypeScript error
              const id = (userData as any).id;
              const role = (userData as any).role;
              logAuthState('User Data Retrieved', { 
                method: 'by_id',
                id: id,
                role: role
              });
            }
          }
        } else {
          userData = userById;
          if (userData) {
            // Using type assertion to avoid TypeScript error
            const id = (userData as any).id;
            const role = (userData as any).role;
            logAuthState('User Data Retrieved', { 
              method: 'by_id',
              id: id,
              role: role
            });
          }
        }
        
        if (userData) { 
          const userSession: UserSession = {
            id: (userData as any).id || '',
            user_id: (userData as any).user_id || session.user.id,
            email: (userData as any).email || session.user.email || '',
            full_name: (userData as any).full_name || session.user.user_metadata?.full_name || '',
            role: (userData as any).role || 'customer',
            phone: (userData as any).phone_number || (userData as any).phone || null,
            profile_image: (userData as any).profile_image || null,
            created_at: (userData as any).created_at || new Date().toISOString(),
            last_sign_in_at: session.user.last_sign_in_at || new Date().toISOString(),
            is_admin: (userData as any).is_admin || false
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
      
      // Handle authentication errors
      if (authError) {
        console.error('Auth error:', authError);
        
        // Check if this is an email verification error
        if (authError.message.includes('Email not confirmed') || 
            authError.message.toLowerCase().includes('verify') || 
            authError.message.toLowerCase().includes('confirmed')) {
          console.log('Email verification required error detected');
          return { success: false, error: 'Please verify your email address before logging in.' };
        }
        
        return { success: false, error: 'Invalid email or password' };
      }
      
      // Safety check - make sure we have a user from auth
      if (!authData?.user?.id) {
        console.error('Auth succeeded but no user data returned');
        return { success: false, error: 'Authentication error. Please try again.' };
      }
      
      console.log('Authentication successful for user:', authData.user.id);
      
      // Auth was successful, now fetch the user's profile from the profiles table
      // Note: We're looking up by user_id which is the foreign key to auth.users
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, phone, phone_number, profile_image, created_at, is_admin, user_id')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      
      // If there's no profile yet, create one for the customer
      if (!userProfile && !profileError) {
        console.log('No profile found. Creating new profile for user:', authData.user.id);
        
        // Create a new profile for this user as a customer (default role)
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: authData.user.id,  // Set user_id as foreign key to auth.users
              email: authData.user.email || '',
              full_name: authData.user?.user_metadata?.full_name || (authData.user.email ? authData.user.email.split('@')[0] : 'User'),
              role: 'customer',
              is_admin: false,
              vehicle_type: 'car', // Using the default from schema
              created_at: new Date().toISOString()
            }
          ])
          .select('id, full_name, email, role, phone, profile_image, created_at')
          .single();
        
        if (createError) {
          console.error('Error creating user profile:', createError);
          
          // Check if this is a duplicate profile error (race condition)
          if (createError.message.includes('duplicate key')) {
            return { success: false, error: 'Profile already exists. Please try logging in again.' };
          }
          
          return { success: false, error: 'Failed to create user profile. Please try again.' };
        }
        
        if (newProfile) {
          // Get the profile data we just created
          const { data: createdProfile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', authData.user.id)
            .maybeSingle();
            
          if (createdProfile) {
            // Create a session with the new profile
            const newUserSession: UserSession = {
              id: createdProfile.id,
              user_id: authData.user.id,
              email: createdProfile.email || authData.user.email || '',
              full_name: createdProfile.full_name || (authData.user.email ? authData.user.email.split('@')[0] : 'User'),
              role: createdProfile.role || 'customer',
              phone: createdProfile.phone_number || createdProfile.phone || null,
              profile_image: createdProfile.profile_image || null,
              created_at: createdProfile.created_at || new Date().toISOString(),
              last_sign_in_at: new Date().toISOString(),
              is_admin: createdProfile.is_admin || false
            };
            
            setUser(newUserSession);
            localStorage.setItem('userSession', JSON.stringify(newUserSession));
            
            console.log('New user session created:', {
              userId: newUserSession.id,
              role: newUserSession.role,
              name: newUserSession.full_name
            });
            
            return { success: true };
          }
          
          console.log('Profile created but could not be fetched', { error: profileFetchError });
          return { success: true, error: 'Profile created but session incomplete. Please refresh.' };
        }
      }
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { success: false, error: 'Error retrieving user profile. Please try again.' };
      }
      
      // If we have a profile, verify and reconcile role-specific data
      if (userProfile) {
        console.log('Existing profile found:', userProfile);
        
        // ROLE MANAGEMENT LOGIC
        // 1. Check if the user is a driver in the drivers table
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('id, status')
          .eq('profile_id', userProfile.id) // Assuming drivers table links to profiles via profile_id
          .maybeSingle();
        
        console.log('Driver check result:', { driverExists: !!driverData, error: driverError });
        
        // ROLE RECONCILIATION
        let finalRole = userProfile.role || 'customer'; // Default to customer if no role set
        let isAdmin = userProfile.is_admin || false;
        
        // If they're in the drivers table, they should be a driver
        if (driverData && !driverError) {
          finalRole = 'driver';
          
          // If profile doesn't match drivers table, update the profile
          if (userProfile.role !== 'driver') {
            console.log('Updating user role to driver in profiles table');
            await supabase
              .from('profiles')
              .update({ role: 'driver' })
              .eq('id', userProfile.id);
          }
        } 
        // If they claim to be a driver but aren't in the drivers table
        else if (userProfile.role === 'driver' && !driverData) {
          console.warn('User has driver role but no driver record found');
          
          // For now, we'll keep their role as driver but with a warning
          console.log('Allowing login with driver role despite missing driver record');
        }
        
        // Check if admin role is consistent with is_admin flag
        if (finalRole === 'admin' && !isAdmin) {
          // Update is_admin flag to match role
          console.log('Setting is_admin flag to true to match admin role');
          await supabase
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', userProfile.id);
          isAdmin = true;
        } 
        else if (isAdmin && finalRole !== 'admin') {
          // Make sure role and is_admin flag are consistent
          finalRole = 'admin';
          console.log('Setting role to admin to match is_admin flag');
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userProfile.id);
        }
        
        // For users with no role, set to customer
        if (!finalRole || finalRole === '') {
          finalRole = 'customer';
          console.log('Setting default customer role for user with no role');
          await supabase
            .from('profiles')
            .update({ role: 'customer' })
            .eq('id', userProfile.id);
        }
        
        // Create session data with verified role
        const sessionData: UserSession = {
          id: userProfile.id,
          user_id: userProfile.user_id || authData.user.id, // Store both IDs
          email: userProfile.email || '',
          full_name: userProfile.full_name || (userProfile.email ? userProfile.email.split('@')[0] : 'User'),
          role: finalRole,
          phone: userProfile.phone_number || userProfile.phone || null,
          profile_image: userProfile.profile_image || null,
          created_at: userProfile.created_at,
          is_admin: isAdmin,
          last_sign_in_at: new Date().toISOString()
        };
        
        console.log('User role verified:', {
          userId: sessionData.id,
          role: sessionData.role,
          name: sessionData.full_name
        });
        
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