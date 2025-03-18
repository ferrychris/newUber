import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { useTheme } from '../../utils/theme';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminRequired?: boolean;
  driverRequired?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  adminRequired = false,
  driverRequired = false 
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        navigate('/login', { 
          state: { 
            message: 'Please log in to access this page',
            from: location.pathname 
          } 
        });
        return;
      }

      // Get user profile with role from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user role:', userError);
        throw userError;
      }
      
      // Check for admin access if required
      if (adminRequired && userData?.role !== 'admin') {
        navigate('/', { 
          state: { 
            message: 'Unauthorized access. You must be an administrator to access this page.' 
          } 
        });
        return;
      }

      // Check for driver access if required
      if (driverRequired && userData?.role !== 'driver') {
        navigate('/', { 
          state: { 
            message: 'Unauthorized access. This section is for drivers only.' 
          } 
        });
        return;
      }

      setAuthenticated(true);
    } catch (error) {
      console.error("Authentication error:", error);
      navigate('/login', { 
        state: { 
          message: 'An error occurred. Please log in again.',
          from: location.pathname
        } 
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-light dark:bg-gradient-dark">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-lg bg-white/10 backdrop-blur-sm"
        >
          <div className="w-12 h-12 border-4 border-sunset rounded-full animate-spin border-t-transparent"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
