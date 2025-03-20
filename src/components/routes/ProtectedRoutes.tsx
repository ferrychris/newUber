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
      
      // First check localStorage for our custom session
      const userSessionStr = localStorage.getItem('userSession');
      let userSession = null;
      
      if (userSessionStr) {
        try {
          userSession = JSON.parse(userSessionStr);
          console.log('Found user session in localStorage:', userSession.full_name);
        } catch (e) {
          console.error('Error parsing user session from localStorage:', e);
        }
      }
      
      // If not found in localStorage, fallback to check Supabase auth
      if (!userSession) {
        console.log('No localStorage session, checking Supabase auth...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.log('No valid session found, redirecting to login');
          navigate('/login', { 
            state: { 
              message: 'Please log in to access this page',
              from: location.pathname 
            } 
          });
          return;
        }
        
        // Get user profile with role from users table using Supabase auth ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error fetching user role:', userError);
          throw userError;
        }
        
        // Use the userData to check role requirements
        const userRole = userData?.role || 'customer';
        
        // Check for admin access if required
        if (adminRequired && userRole !== 'admin') {
          navigate('/', { 
            state: { 
              message: 'Unauthorized access. You must be an administrator to access this page.' 
            } 
          });
          return;
        }

        // Check for driver access if required
        if (driverRequired && userRole !== 'driver') {
          navigate('/', { 
            state: { 
              message: 'Unauthorized access. You must be a driver to access this page.' 
            } 
          });
          return;
        }
      } 
      // Use localStorage session
      else {
        console.log('Using localStorage session for authentication');
        const userRole = userSession.role || 'customer';
        
        // Check for admin access if required
        if (adminRequired && userRole !== 'admin') {
          console.log('Admin access required but user is not admin');
          navigate('/', { 
            state: { 
              message: 'Unauthorized access. You must be an administrator to access this page.' 
            } 
          });
          return;
        }

        // Check for driver access if required
        if (driverRequired && userRole !== 'driver') {
          console.log('Driver access required but user is not driver');
          navigate('/', { 
            state: { 
              message: 'Unauthorized access. You must be a driver to access this page.' 
            } 
          });
          return;
        }
      }
      
      // If we get here, the user is authenticated and has the correct role
      setAuthenticated(true);
    } catch (error) {
      console.error('Authentication check error:', error);
      navigate('/login', { 
        state: { 
          message: 'An error occurred during authentication. Please log in again.' 
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
