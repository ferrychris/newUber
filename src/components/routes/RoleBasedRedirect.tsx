import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * RoleBasedRedirect component that redirects users based on their role
 * - Customers are redirected to /dashboard
 * - Drivers are redirected to /driver/dashboard
 * - Admins are redirected to /admin/dashboard
 */
const RoleBasedRedirect: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Get the intended destination from location state, if any
  const from = location.state?.from;

  useEffect(() => {
    if (!loading && user) {
      console.log('RoleBasedRedirect: Routing user with role:', user.role);
    }
  }, [loading, user]);

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-light dark:bg-gradient-dark">
        <div className="p-8 rounded-lg bg-white/10 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-sunset rounded-full animate-spin border-t-transparent"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }

  // Determine redirect path based on user role
  let redirectPath;
  switch (user.role) {
    case 'driver':
      redirectPath = '/driver/dashboard';
      break;
    case 'admin':
      redirectPath = '/admin/dashboard';
      break;
    case 'customer':
    default:
      redirectPath = '/dashboard';
      break;
  }

  // If there was a specific destination requested, use that instead
  // but only if it's appropriate for the user's role
  if (from) {
    const isDriverRoute = from.startsWith('/driver');
    const isAdminRoute = from.startsWith('/admin');
    const isCustomerRoute = from.startsWith('/dashboard') && !isDriverRoute && !isAdminRoute;

    const canAccessRoute = (
      (isDriverRoute && user.role === 'driver') ||
      (isAdminRoute && user.role === 'admin') ||
      (isCustomerRoute && user.role === 'customer') ||
      user.role === 'admin' // Admins can access all routes
    );

    if (canAccessRoute) {
      redirectPath = from;
    }
  }

  console.log(`Redirecting user with role ${user.role} to ${redirectPath}`);
  return <Navigate to={redirectPath} replace />;
};

export default RoleBasedRedirect;
