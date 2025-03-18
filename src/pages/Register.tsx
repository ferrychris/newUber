import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface RegisterFormData {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: 'customer' | 'driver';
}

interface RegisterFormErrors extends Partial<RegisterFormData> {}

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer'
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: RegisterFormErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function register() {
    setLoading(true);
    try {
      // Trim and sanitize input data
      const sanitizedEmail = formData.email.trim().toLowerCase();
      const sanitizedPhone = formData.phone.trim();
      const sanitizedName = formData.full_name.trim();
      
      // Sign up the user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: formData.password,
        options: {
          data: {
            full_name: sanitizedName,
            phone: sanitizedPhone,
            role: formData.role,
            profile_image: null
          }
        }
      });

      if (authError) {
        console.error('Auth Error:', authError.message);
        
        // Provide more user-friendly error messages
        if (authError.message.includes('email already registered')) {
          toast.error('This email is already in use. Please log in or use another email.');
        } else if (authError.message.includes('password')) {
          toast.error('The password is too weak. Use at least 6 characters.');
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error("An error occurred during registration.");
        return;
      }

      console.log('User registered successfully:', authData.user.id);

      // Insert user profile data
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          full_name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          role: formData.role,
          password: formData.password, // Note: Password stored for validation only, not for login
          profile_image: null
        }]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
        
        if (profileError.message.includes('duplicate key')) {
          if (profileError.message.includes('email')) {
            toast.error('This email is already in use.');
          } else if (profileError.message.includes('phone')) {
            toast.error('This phone number is already in use.');
          } else {
            toast.error('A profile with these details already exists.');
          }
        } else {
          toast.error("An error occurred while creating the profile. Please try again.");
        }
        
        // Try to clean up the auth user if profile creation failed
        await supabase.auth.admin.deleteUser(authData.user.id);
        return;
      }

      toast.success('Registration successful! Please check your email to confirm your account.');
      
      // Create driver profile if user role is driver
      if (formData.role === 'driver') {
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
          // Don't block registration if driver profile creation fails
          // We can handle this later in the driver dashboard
        }
        
        // Also create an entry in driver_availability
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
          // Don't block registration if availability creation fails
        }
      }
      
      setTimeout(() => {
        // Redirect based on role
        const redirectPath = formData.role === 'driver' ? '/driver/dashboard' : '/dashboard';
        navigate(redirectPath);
      }, 2000);
    } catch (err) {
      const error = err as Error;
      console.error('Unexpected error:', error);
      toast.error(error.message || "An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all fields correctly");
      return;
    }
    await register();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name as keyof RegisterFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-light dark:bg-gradient-dark p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">Registration</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.full_name ? 'border-red-500 dark:border-red-500' : ''}`}
              required
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
            )}
          </div>

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
              className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.email ? 'border-red-500 dark:border-red-500' : ''}`}
              required
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.phone ? 'border-red-500 dark:border-red-500' : ''}`}
              required
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Account Type
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
            </select>
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
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.password ? 'border-red-500 dark:border-red-500' : ''}`}
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.confirmPassword ? 'border-red-500 dark:border-red-500' : ''}`}
                required
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Registering...' : "Register"}
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

          {/* Login Link */}
          <div className="text-sm text-center mt-4">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Already registered? Log in
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
