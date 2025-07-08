import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * RoleBasedRedirect component that redirects users based on their role
 * - Customers are redirected to /dashboard
 * - Drivers are redirected to /driver/dashboard
 * - Admins are redirected to /admin/dashboard
 */
const RoleBasedRedirect: React.FC = () => {
  const { user, loading, isAuthenticated, refreshSession } = useAuth();
  const location = useLocation();
  
  // Get the intended destination from location state, if any
  const from = location.state?.from;

  useEffect(() => {
    if (!loading && user) {
      console.log('RoleBasedRedirect: Routing user with role:', user.role);
      
      // If the user is a driver, make sure they are being correctly routed
      if (user.role !== 'driver') {
        // Check if this user should actually be a driver by checking the drivers table
        const checkDriverStatus = async () => {
          try {
            const { data: driverData, error } = await supabase
              .from('drivers')
              .select('id, status')
              .eq('id', user.id)
              .maybeSingle();
              
            if (driverData && !error) {
              console.log('User found in drivers table but role was not set correctly:', user);
              
              // Update the user's role in profiles table
              await supabase
                .from('profiles')
                .update({ role: 'driver' })
                .eq('id', user.id);
                
              // Force refresh the session to update the role
              await refreshSession();
              
              // Show a notification to the user
              toast.success('Your account has been updated to a driver account. Redirecting...');
            }
          } catch (err) {
            console.error('Error checking driver status:', err);
          }
        };
        
        checkDriverStatus();
      }
    }
  }, [loading, user, refreshSession]);

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
