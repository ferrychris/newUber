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
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading, hasRole } = useAuth();

  // Log route check information
  useEffect(() => {
    logRouteState('Route Check', {
      path: location.pathname,
      user: user ? { id: user.id, role: user.role } : null,
      isAuthenticated,
      authLoading
    });
  }, [location.pathname, user, isAuthenticated, authLoading]);

  // Update loading state based on auth loading
  useEffect(() => {
    setLoading(authLoading);
  }, [authLoading]);

  // Show loading spinner while authentication is being checked
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

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    logRouteState('Redirecting to Login', {
      reason: 'User not authenticated',
      from: location.pathname
    });
    return <Navigate to="/login" state={{ 
      message: 'Please log in to access this page',
      from: location.pathname 
    }} />;
  }

  // Check role requirements
  let authorized = true;
  let redirectMessage = '';
  
  // Admin role check
  if (adminRequired && !hasRole('admin')) {
    authorized = false;
    redirectMessage = 'Unauthorized access. You must be an administrator to access this page.';
    logRouteState('Access Denied', { 
      reason: 'Not admin',
      required: 'admin',
      actual: user.role
    });
  }
  
  // Driver role check
  else if (driverRequired && !hasRole('driver')) {
    authorized = false;
    redirectMessage = 'Unauthorized access. You must be a driver to access this page.';
    logRouteState('Access Denied', { 
      reason: 'Not driver',
      required: 'driver',
      actual: user.role
    });
  }
  
  // If not authorized based on role requirements, redirect to home
  if (!authorized) {
    return <Navigate to="/" state={{ message: redirectMessage }} />;
  }

  // If we reach here, the user is authenticated and authorized
  logRouteState('Access Granted', {
    user: { id: user.id, role: user.role },
    path: location.pathname
  });

  return <>{children}</>;
}
