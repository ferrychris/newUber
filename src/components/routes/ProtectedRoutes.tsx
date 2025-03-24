import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

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
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading, hasRole } = useAuth();

  useEffect(() => {
    const checkAuthorization = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      setLoading(true);
      
      try {
        // Check if user is authenticated
        if (!isAuthenticated || !user) {
          console.log('User not authenticated, redirecting to login');
          navigate('/login', { 
            state: { 
              message: 'Please log in to access this page',
              from: location.pathname 
            } 
          });
          return;
        }
        
        // Check role requirements
        if (adminRequired && !hasRole('admin')) {
          console.log('Admin access required but user is not admin');
          navigate('/', { 
            state: { 
              message: 'Unauthorized access. You must be an administrator to access this page.' 
            } 
          });
          return;
        }
        
        if (driverRequired && !hasRole('driver')) {
          console.log('Driver access required but user is not driver');
          navigate('/', { 
            state: { 
              message: 'Unauthorized access. You must be a driver to access this page.' 
            } 
          });
          return;
        }
        
        // If we get here, the user is authenticated and has the correct role
        setAuthorized(true);
      } catch (error) {
        console.error('Authorization check error:', error);
        navigate('/login', { 
          state: { 
            message: 'An error occurred during authentication. Please log in again.' 
          } 
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [user, isAuthenticated, authLoading, adminRequired, driverRequired, navigate, location.pathname, hasRole]);

  if (authLoading || loading) {
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

  if (!authorized) {
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
