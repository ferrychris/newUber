import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

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
            // Fallback to redirect component if user state isn't available yet
            navigate('/auth/redirect', { state: { from } });
          }
        }, 1000);
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
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
    
    // Clear the error for this field when user starts typing
    if (formErrors[name as keyof LoginFormData]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - orange background with message */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden md:flex md:w-1/2 bg-[#FF7D45] text-white flex-col justify-center p-12"
      >
        <h1 className="text-5xl font-bold mb-6">Welcome back!</h1>
        <p className="text-xl">
          Log in to access your account and continue where you left off.
        </p>
      </motion.div>
      
      {/* Right side - login form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-1/2 flex items-center justify-center p-6 bg-white"
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
            <p className="text-gray-500">Glad to see you again!</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-[#FF7D45] hover:text-[#E86A35]">
                  Forgot password?
                </Link>
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
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

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

            {/* Register Link */}
            <div className="text-sm text-center mt-6">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/register" className="font-medium text-[#FF7D45] hover:text-[#E86A35]">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}