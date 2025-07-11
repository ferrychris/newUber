import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * SessionChecker component that automatically checks for existing user sessions
 * and redirects users to the appropriate dashboard based on their role.
 * This component should be mounted at application startup.
 */
const SessionChecker: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Only redirect if:
    // 1. We're not currently loading auth state
    // 2. User is authenticated (session exists)
    // 3. User is on a public route (/, /login, /register)
    const isPublicRoute = ['/', '/login', '/register'].includes(location.pathname);
    
    if (!loading && user && isPublicRoute) {
      console.log('SessionChecker: Existing session found with role:', user.role);
      
      // Determine where to redirect based on role
      let redirectPath;
      
      if (user.role === 'admin') {
        redirectPath = '/admin';
      } else if (user.role === 'driver') {
        redirectPath = '/driver/dashboard';
      } else {
        // Default to customer dashboard
        redirectPath = '/dashboard';
      }
      
      console.log(`SessionChecker: Redirecting to ${redirectPath}`);
      navigate(redirectPath, { replace: true });
    }
  }, [loading, user, navigate, location.pathname]);
  
  // This is a utility component that doesn't render anything
  return null;
};

export default SessionChecker;
