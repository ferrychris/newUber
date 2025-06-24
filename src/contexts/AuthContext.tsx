import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

interface AuthContextType {
  user: User | null;
  isDriver: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isDriver: false });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkDriverStatus(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      
      // Check if user is a driver
      if (session?.user) {
        checkDriverStatus(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkDriverStatus = async (userId: string) => {
    const { data } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    setIsDriver(!!data);
  };

  return (
    <AuthContext.Provider value={{ user, isDriver }}>
      {children}
    </AuthContext.Provider>
  );
};
