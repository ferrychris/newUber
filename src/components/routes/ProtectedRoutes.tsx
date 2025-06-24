import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminRequired?: boolean;
  driverRequired?: boolean;
}

const logRouteState = (action: string, data: any) => {
  console.group(`Protected Route: ${action}`);
  console.log('Timestamp:', new Date().toISOString());
  console.log('Data:', data);
  console.groupEnd();
};

export default function ProtectedRoute({ 
  children, 
  adminRequired = false,
  driverRequired = false 
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading, hasRole } = useAuth();

  useEffect(() => {
    logRouteState('Route Check', {
      path: location.pathname,
      user: user ? { id: user.id, role: user.role } : null,
      loading,
      authenticated: !!user
    });
  }, [location.pathname, user, loading]);

  useEffect(() => {
    const checkAuthorization = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        setLoading(true);
        return;
      }

      setLoading(true);
      
      try {
        // Check if user is authenticated
        if (!isAuthenticated || !user) {
          console.log('User not authenticated, redirecting to login');
          setAuthorized(false);
          return;
        }
        
        // Check role requirements
        if (adminRequired && !hasRole('admin')) {
          console.log('Admin access required but user is not admin');
          setAuthorized(false);
          return;
        }
        
        if (driverRequired && !hasRole('driver')) {
          console.log('Driver access required but user is not driver');
          setAuthorized(false);
          return;
        }
        
        // If we get here, the user is authenticated and has the correct role
        console.log('User authorized with role:', user.role);
        setAuthorized(true);
      } catch (error) {
        console.error('Authorization check error:', error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [user, isAuthenticated, authLoading, adminRequired, driverRequired, hasRole]);

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

  // Handle unauthorized access
  if (!authorized && !loading && !authLoading) {
    if (!isAuthenticated || !user) {
      return <Navigate to="/login" state={{ 
        message: 'Please log in to access this page',
        from: location.pathname 
      }} />;
    } else {
      return <Navigate to="/" state={{ 
        message: adminRequired 
          ? 'Unauthorized access. You must be an administrator to access this page.'
          : driverRequired
          ? 'Unauthorized access. You must be a driver to access this page.'
          : 'Unauthorized access.'
      }} />;
    }
  }

  // Check role based on route
  const requiredRole = location.pathname.includes('/driver') ? 'driver' : 'customer';
  
  if (!user || !hasRole(requiredRole)) {
    logRouteState('Access Denied', { 
      reason: 'Invalid role',
      required: requiredRole,
      actual: user?.role
    });
    return <Navigate to="/unauthorized" />;
  }

  logRouteState('Access Granted', {
    user: user ? { id: user.id, role: user.role } : null,
    path: location.pathname
  });

  return <>{children}</>;
}
