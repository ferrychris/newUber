import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { useTheme } from '../utils/theme';

interface LoginFormData {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<LoginFormData>>({});

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
      // Trim email to prevent whitespace issues
      const cleanEmail = formData.email.trim().toLowerCase();
      
      console.log('Attempting login for:', cleanEmail);
      
      // Check if the user exists in our custom users table
      const { data: userInDb, error: userCheckError } = await supabase
        .from('users')
        .select('id, full_name, password, email, role, phone, profile_image')
        .eq('email', cleanEmail)
        .maybeSingle();
        
      if (userCheckError) {
        console.error('Error checking user in DB:', userCheckError);
        toast.error('Error checking user credentials. Please try again.');
        setLoading(false);
        return;
      }
      
      // If user doesn't exist
      if (!userInDb) {
        console.error('User not found in database');
        toast.error('Invalid email or password');
        setLoading(false);
        return;
      }
      
      // Check password
      if (userInDb.password === formData.password) {
        console.log('Password matched for user in custom table');
        
        // Store user session info in localStorage with all relevant user data
        const sessionData = {
          id: userInDb.id,
          email: userInDb.email,
          full_name: userInDb.full_name,
          role: userInDb.role || 'customer',
          phone: userInDb.phone || null,
          profile_image: userInDb.profile_image || null,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        };
        
        // Save session to localStorage
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        
        // Log information for debugging
        console.log('Using custom authentication via localStorage');
        console.log('User logged in:', userInDb.full_name);
        console.log('User role:', userInDb.role || 'customer');
        console.log('User ID stored in session:', sessionData.id);
        
        toast.success(`Welcome back, ${userInDb.full_name}!`);
        
        // Add a slight delay to ensure the toast is seen and localStorage is set
        setTimeout(() => {
          // Redirect based on role
          const userRole = userInDb.role || 'customer';
          console.log('Redirecting user with role:', userRole);
          
          if (userRole === 'driver') {
            console.log('Navigating to driver dashboard');
            navigate('/driver/dashboard');
          } else if (userRole === 'admin') {
            console.log('Navigating to admin dashboard');
            navigate('/admin/dashboard');
          } else {
            // Default to customer dashboard for any other role
            console.log('Navigating to customer dashboard');
            navigate('/dashboard');
          }
        }, 1000);
      } else {
        // Passwords don't match
        console.error('Password incorrect for user');
        toast.error('Incorrect password');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
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
                className={`block w-full px-4 py-3 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
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
                  className={`block w-full px-4 py-3 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
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