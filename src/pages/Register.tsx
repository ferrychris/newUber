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
  role: 'customer' | 'driver' | 'admin';
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

  async function registerWithoutAuth() {
    setLoading(true);
    try {
      // Trim and sanitize input data
      const sanitizedEmail = formData.email.trim().toLowerCase();
      const sanitizedPhone = formData.phone.trim();
      const sanitizedName = formData.full_name.trim();
      
      console.log("Manual registration attempt for:", sanitizedEmail);
      
      // Check if email already exists
      const { data: existingUserByEmail, error: emailCheckError } = await supabase
        .from('users')
        .select('email')
        .eq('email', sanitizedEmail)
        .maybeSingle();
        
      if (emailCheckError) {
        console.error('Error checking email:', emailCheckError);
        toast.error('Error verifying email availability. Please try again.');
        return;
      }
        
      if (existingUserByEmail) {
        toast.error('This email is already in use. Please log in or use another email.');
        return;
      }
      
      // Check if phone already exists
      if (sanitizedPhone) {
        const { data: existingUserByPhone, error: phoneCheckError } = await supabase
          .from('users')
          .select('phone')
          .eq('phone', sanitizedPhone)
          .maybeSingle();
          
        if (phoneCheckError) {
          console.error('Error checking phone:', phoneCheckError);
          toast.error('Error verifying phone availability. Please try again.');
          return;
        }
          
        if (existingUserByPhone) {
          toast.error('This phone number is already in use. Please use another phone number.');
          return;
        }
      }
      
      // Generate a UUID for the user
      const userId = window.crypto.randomUUID();
      console.log('Generated user ID:', userId);
      
      // Add a loading toast
      const loadingToast = toast.loading('Creating your account...');
      
      try {
        // Insert the user directly into the users table
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            full_name: sanitizedName,
            email: sanitizedEmail,
            phone: sanitizedPhone || null, // Make sure null is used instead of empty string
            password: formData.password,
            profile_image: null,
            role: formData.role || 'customer' // Make sure we save the user's selected role
          }]);
          
        if (insertError) {
          console.error('Error inserting user:', insertError);
          toast.dismiss(loadingToast);
          toast.error('Could not create user: ' + insertError.message);
          return;
        }
        
        toast.dismiss(loadingToast);
        toast.success('Account created successfully! Please log in with your credentials.');

        // Create driver profile if needed
        if (formData.role === 'driver') {
          try {
            // Insert into drivers table
            const { error: driverError } = await supabase
              .from('drivers')
              .insert([{
                id: userId,
                license_number: '',
                license_expiry: new Date().toISOString(),
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
              toast.error('Created user account but could not set up driver profile.');
            }
          } catch (e) {
            console.error('Error setting up driver account:', e);
            toast.error('Created user account but could not set up driver profile.');
          }
        }
        
        // Store session data in localStorage for immediate login
        const sessionData = {
          id: userId,
          email: sanitizedEmail,
          full_name: sanitizedName,
          role: formData.role || 'customer',
          phone: sanitizedPhone || null,
          profile_image: null,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        };
        
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        console.log('User registered and session saved:', sessionData.full_name);
        console.log('User role set to:', sessionData.role);
        
        // Redirect to appropriate dashboard based on role
        setTimeout(() => {
          const userRole = formData.role || 'customer';
          console.log('Redirecting newly registered user with role:', userRole);
          
          if (userRole === 'driver') {
            console.log('Navigating to driver dashboard');
            navigate('/driver/dashboard');
          } else if (userRole === 'admin') {
            console.log('Navigating to admin dashboard');
            navigate('/admin/dashboard');
          } else {
            // Default to customer dashboard
            console.log('Navigating to customer dashboard');
            navigate('/dashboard');
          }
        }, 2000);
      } catch (insertError) {
        console.error('Exception during user insertion:', insertError);
        toast.dismiss(loadingToast);
        toast.error('An unexpected error occurred. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An unexpected error occurred. Please try again.');
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
    
    // Use the alternative registration method that bypasses Supabase Auth issues
    await registerWithoutAuth();
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

  return (
    <div className="min-h-screen flex">
      {/* Left side - orange background with message */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden md:flex md:w-1/2 bg-[#FF7D45] text-white flex-col justify-center p-12"
      >
        <h1 className="text-5xl font-bold mb-6">Happy to have you!</h1>
        <p className="text-xl">
          Create your account and start using our services right away.
        </p>
      </motion.div>
      
      {/* Right side - registration form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto max-h-screen"
      >
        <div className="w-full max-w-md py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Create Account</h2>
            <p className="text-gray-500">Sign up to get started!</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`block w-full px-4 py-3 border text-black ${errors.full_name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
                placeholder="Enter your full name"
                required
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
              )}
            </div>

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
                className={`block w-full px-4 py-3 border text-black ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
                placeholder="Enter your email"
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`block w-full px-4 py-3 border text-black ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
                placeholder="Enter your phone number"
                required
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="block w-full px-4 py-3 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]"
              >
                <option value="customer">Customer</option>
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full px-4 py-3 border text-black ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
                  placeholder="Create a password"
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
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`block w-full px-4 py-3 border text-black ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#FF7D45] hover:bg-[#E86A35] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7D45] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Registering...' : "Sign Up"}
            </button>

            {/* Social Registration Options */}
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

            {/* Login Link */}
            <div className="text-sm text-center mt-6">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="font-medium text-[#FF7D45] hover:text-[#E86A35]">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
