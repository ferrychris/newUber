import { useState, useRef } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface LoginFormData {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResendSection, setShowResendSection] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<LoginFormData>>({});

  // Get the redirect path from location state to pass along to the role-based redirect
  const from = location.state?.from;

  const validateForm = (): boolean => {
    const errors: Partial<LoginFormData> = {};
    let isValid = true;

    // Validate email
    if (!formData.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    // Validate password
    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Use the login function from AuthContext
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        toast.success('Login successful! Redirecting...');
        
        // Add a slight delay to ensure the toast is seen
        setTimeout(() => {
          // Get the current user after successful login
          const currentUser = user;
          
          if (currentUser) {
            // Determine redirect path based on user role
            let redirectPath;
            
            switch (currentUser.role) {
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
                (isDriverRoute && currentUser.role === 'driver') ||
                (isAdminRoute && currentUser.role === 'admin') ||
                (isCustomerRoute && currentUser.role === 'customer') ||
                currentUser.role === 'admin' // Admins can access all routes
              );

              if (canAccessRoute) {
                redirectPath = from;
              }
            }
            
            console.log(`Redirecting user with role ${currentUser.role} to ${redirectPath}`);
            navigate(redirectPath);
          } else {
            // Fallback redirect if user info not available yet
            navigate('/dashboard');
          }
        }, 1000);
      } else {
        // Handle failed login
        console.log('Login failed:', result.error);
        
        // Check if this is an unverified email error
        if (result.error?.toLowerCase().includes('email') && result.error?.toLowerCase().includes('verify')) {
          toast.error('Please verify your email address before logging in.', {
            duration: 8000
          });
          
          // Show the resend section
          setShowResendSection(true);
        } else {
          // Regular error for other issues
          toast.error(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear any error for this field
    if (formErrors[name as keyof LoginFormData]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Function to resend confirmation email
  const handleResendEmail = async () => {
    const emailToUse = formData.email || (emailInputRef.current?.value || '');
    
    if (!emailToUse || !/\S+@\S+\.\S+/.test(emailToUse)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setResendingEmail(true);
    
    try {
      console.log('Resending confirmation email to:', emailToUse);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        toast.error(`Error sending confirmation email: ${error.message}`);
      } else {
        toast.success('Confirmation email sent! Please check your inbox.', {
          duration: 5000
        });
      }
    } catch (error: unknown) {
      console.error('Error in resend email:', error);
      toast.error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - orange background with message */}
      <div className="hidden lg:flex lg:flex-1 bg-[#FF7D45]">
        <div className="flex flex-col justify-center px-12 py-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto text-white"
          >
            <h2 className="text-3xl font-bold mb-6">Welcome Back!</h2>
            <p className="mb-4">
              Log in to your account to access your dashboard, manage your account, and continue your journey.
            </p>
            <p>
              Don't have an account? Register now and join our community of drivers and customers.
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Right side - login form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8 bg-white">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="sm:mx-auto sm:w-full sm:max-w-md"
        >
          <div className="text-center">
            <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Access your dashboard and manage your account
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`block w-full px-4 py-3 border text-black ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
                placeholder="Enter your email"
                required
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="flex space-x-3">
                  <Link to="/confirm-email" state={{ email: formData.email }} className="text-sm text-blue-600 hover:text-blue-800">
                    Verify Email
                  </Link>
                  <Link to="/forgot-password" className="text-sm text-[#FF7D45] hover:text-[#E86A35]">
                    Forgot password?
                  </Link>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full px-4 py-3 border text-black ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 text-[#FF7D45] focus:ring-[#FF7D45] border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            {/* Resend Verification Email Section */}
            {showResendSection && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 my-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-blue-800 font-medium text-sm">Email verification required</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      Please verify your email address to access your account. 
                      Need another verification email?
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center">
                        <input
                          ref={emailInputRef}
                          type="email"
                          placeholder={formData.email || "Enter your email"}
                          defaultValue={formData.email}
                          className="flex-grow px-3 py-3 border border-blue-300 rounded-l-md text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleResendEmail}
                          disabled={resendingEmail}
                          className={`px-4 py-3 bg-blue-600 text-white rounded-r-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${resendingEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {resendingEmail ? 'Sending...' : 'Resend Verification'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-blue-600 italic">
                        If you don't see the email, please check your spam folder.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#FF7D45] hover:bg-[#E86A35] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7D45] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>

            {/* Social Login Options */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <FcGoogle className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <FaApple className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Register Link and Verify Email */}
            <div className="text-sm text-center mt-6">
              <div className="mb-2">
                <span className="text-gray-600">Don't have an account? </span>
                <Link to="/register" className="font-medium text-[#FF7D45] hover:text-[#E86A35]">
                  Sign up
                </Link>
              </div>
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mt-3">
                <div className="flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-blue-700 font-medium">Need to verify your email?</span>
                </div>
                <Link 
                  to="/confirm-email" 
                  state={{ email: formData.email }} 
                  className="inline-block w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors"
                >
                  Go to Email Verification
                </Link>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
