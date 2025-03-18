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
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: formData.password,
      });

      if (authError) {
        console.error('Authentication error:', authError);
        
        // Provide more user-friendly error messages
        if (authError.message.includes('Invalid login credentials')) {
          toast.error('Incorrect Credentials');
        } else if (authError.message.includes('Email not confirmed')) {
          toast.error('Confirm your email');
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error("An error occurred during login");
        return;
      }

      console.log('Authentication successful, getting user profile...');

      // Get user profile with role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', authData.user.id)
        .maybeSingle();

      // If user profile doesn't exist in the database, create a basic one
      if (userError) {
        console.error('Error fetching user profile:', userError);
        
        if (userError.code === 'PGRST116') {
          console.log('User profile not found, checking auth metadata for role');
          
          // Check if user metadata has a role specified and create appropriate profile
          const userMetadata = authData.user.user_metadata;
          const metadataRole = userMetadata?.role || 'customer';
          
          console.log('Using role from metadata:', metadataRole);
          
          // Create a user profile with the role from metadata
          const { error: createError } = await supabase
            .from('users')
            .insert([{
              id: authData.user.id,
              full_name: userMetadata?.full_name || 'User',
              email: authData.user.email,
              phone: userMetadata?.phone || '',
              role: metadataRole,
              password: '', // We don't store the password here, as it's handled by Auth
              profile_image: null
            }]);
            
          if (createError) {
            console.error('Error creating profile:', createError);
            toast.error("An error occurred during profile creation");
            navigate('/dashboard');
            return;
          }
          
          // If user is a driver, also create driver profile
          if (metadataRole === 'driver') {
            console.log('Creating driver profile for user');
            
            const { error: driverError } = await supabase
              .from('drivers')
              .insert([{
                id: authData.user.id,
                license_number: '',
                license_expiry: '',
                vehicle_type: null,
                vehicle_make: '',
                vehicle_model: '',
                vehicle_year: null,
                vehicle_color: '',
                vehicle_plate: '',
                verification_status: 'pending',
                total_rides: 0,
                average_rating: 0
              }]);
              
            if (driverError) {
              console.error('Error creating driver profile:', driverError);
              // Don't block login if driver profile creation fails
            }
            
            // Create driver availability
            const { error: availabilityError } = await supabase
              .from('driver_availability')
              .insert([{
                driver_id: authData.user.id,
                status: 'offline',
                last_location_update: new Date().toISOString(),
                current_latitude: null,
                current_longitude: null
              }]);
              
            if (availabilityError) {
              console.error('Error creating driver availability:', availabilityError);
              // Don't block login if availability creation fails
            }
            
            // Redirect to driver dashboard
            navigate('/driver/dashboard');
            toast.success(`Welcome, ${userMetadata?.full_name || 'Driver'} !`);
            return;
          }
          
          // For customer or other roles
          navigate('/dashboard');
          toast.success(`Welcome, ${userMetadata?.full_name || 'User'} !`);
          return;
        } else {
          toast.error("An error occurred during user profile retrieval");
          navigate('/dashboard');
          return;
        }
      }

      if (!userData) {
        console.log('User profile not found, checking auth metadata for role');
        
        // Check if user metadata has a role specified and create appropriate profile
        const userMetadata = authData.user.user_metadata;
        const metadataRole = userMetadata?.role || 'customer';
        
        console.log('Using role from metadata:', metadataRole);
        
        // Create a user profile with the role from metadata
        const { error: createError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            full_name: userMetadata?.full_name || 'User',
            email: authData.user.email,
            phone: userMetadata?.phone || '',
            role: metadataRole,
            password: '', // We don't store the password here, as it's handled by Auth
            profile_image: null
          }]);
          
        if (createError) {
          console.error('Error creating profile:', createError);
          toast.error("An error occurred during profile creation");
          navigate('/dashboard');
          return;
        }
        
        // If user is a driver, also create driver profile
        if (metadataRole === 'driver') {
          console.log('Creating driver profile for user');
          
          const { error: driverError } = await supabase
            .from('drivers')
            .insert([{
              id: authData.user.id,
              license_number: '',
              license_expiry: '',
              vehicle_type: null,
              vehicle_make: '',
              vehicle_model: '',
              vehicle_year: null,
              vehicle_color: '',
              vehicle_plate: '',
              verification_status: 'pending',
              total_rides: 0,
              average_rating: 0
            }]);
            
          if (driverError) {
            console.error('Error creating driver profile:', driverError);
            // Don't block login if driver profile creation fails
          }
          
          // Create driver availability
          const { error: availabilityError } = await supabase
            .from('driver_availability')
            .insert([{
              driver_id: authData.user.id,
              status: 'offline',
              last_location_update: new Date().toISOString(),
              current_latitude: null,
              current_longitude: null
            }]);
            
          if (availabilityError) {
            console.error('Error creating driver availability:', availabilityError);
            // Don't block login if availability creation fails
          }
          
          // Redirect to driver dashboard
          navigate('/driver/dashboard');
          toast.success(`Welcome, ${userMetadata?.full_name || 'Driver'} !`);
          return;
        }
        
        // For customer or other roles
        navigate('/dashboard');
        toast.success(`Welcome, ${userMetadata?.full_name || 'User'} !`);
        return;
      }

      console.log('User profile found:', userData);

      // Extract user role
      const userRole = userData.role;
      
      // Redirect based on user role using a more explicit approach
      let redirectPath = '/dashboard'; // Default path
      let welcomeMessage = `Welcome, ${userData.full_name || 'User'} !`;
      
      // Determine where to redirect based on role
      switch(userRole) {
        case 'driver':
          console.log('User is a driver, redirecting to driver dashboard');
          redirectPath = '/driver/dashboard';
          welcomeMessage = `Welcome, ${userData.full_name || 'Driver'} !`;
          break;
        case 'admin':
          console.log('User is an admin, redirecting to admin dashboard');
          redirectPath = '/admin';
          welcomeMessage = `Welcome, ${userData.full_name || 'Admin'} !`;
          break;
        default:
          console.log('User is a customer, redirecting to customer dashboard');
          // Default redirectPath and welcomeMessage already set
          break;
      }
      
      // Perform the redirect and show welcome message
      navigate(redirectPath);
      
      // Additional helpful message for drivers with pending verification
      if (userRole === 'driver') {
        // Check if driver verification is pending
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('verification_status')
          .eq('id', authData.user.id)
          .maybeSingle();
        
        if (!driverError && driverData && driverData.verification_status === 'pending') {
          // Adding a short delay so the welcome message is seen first
          setTimeout(() => {
            toast.info('Your driver account is pending verification. Please submit your documents.');
          }, 1500);
        }
      }
      
      toast.success(welcomeMessage);

    } catch (error) {
      console.error('Login error:', error);
      toast.error("An error occurred during login");
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
    <div className={`min-h-screen flex items-center justify-center bg-gradient-${theme} p-6`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md`}
      >
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
              required
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {/* Social Login Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
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
          <div className="text-sm text-center mt-4">
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Not registered yet? Create an account
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}