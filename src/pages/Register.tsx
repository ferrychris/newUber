import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaPhone, FaLock, FaCar } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  phone: string;
  role: 'user' | 'driver';
  vehicle_type?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: RegisterFormErrors;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  full_name?: string;
  phone?: string;
  role?: string;
  vehicle_type?: string;
}

const initialFormData: RegisterFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  full_name: '',
  phone: '',
  role: 'user',
  vehicle_type: ''
};

const initialFormErrors: RegisterFormErrors = {};

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);
  const [errors, setErrors] = useState<RegisterFormErrors>(initialFormErrors);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Style classes
  const inputClasses = 'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm text-black placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm';
  const labelClasses = 'block text-sm font-medium text-gray-700 mb-1';
  const iconClasses = 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400';
  const buttonClasses = 'w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof RegisterFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): ValidationResult => {
    const newErrors: RegisterFormErrors = {};
    
    // Validate full name
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate phone (optional but must be valid if provided)
    if (formData.phone.trim() && !/^\+?[1-9]\d{1,14}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Invalid phone number format';
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate vehicle type for drivers
    if (formData.role === 'driver' && !formData.vehicle_type) {
      newErrors.vehicle_type = 'Please select a vehicle type';
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm();
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      await registerWithoutAuth();
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerWithoutAuth = async () => {
    try {
      await manualRegistration(
        formData.email.trim(),
        formData.phone.trim(),
        formData.full_name.trim()
      );
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Registration failed: ' + (error as Error).message);
    }
  };

  const manualRegistration = async (sanitizedEmail: string, sanitizedPhone: string, sanitizedName: string) => {
    const loadingToastId = toast.loading('Creating your account...');

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', sanitizedEmail)
        .single();

      if (existingUser) {
        toast.dismiss(loadingToastId);
        toast.error('A user with this email already exists');
        throw new Error('A user with this email already exists');
      }

      // Create auth user with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: formData.password,
        options: {
          data: {
            full_name: sanitizedName,
            phone: sanitizedPhone,
            role: formData.role,
            vehicle_type: formData.vehicle_type || null
          }
        }
      });
      
      // We'll move the sign-in step to after all the error checking

      if (authError) {
        toast.dismiss(loadingToastId);
        toast.error(authError.message);
        throw new Error(authError.message);
      }

      const userId = authData?.user?.id;
      if (!userId) {
        toast.dismiss(loadingToastId);
        toast.error('Failed to create user account');
        throw new Error('Failed to create user account');
      }
      
      // Sign in the user immediately so that RLS policies work correctly
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: formData.password
      });
      
      if (signInError) {
        console.warn('Auto sign-in failed, continuing with account setup:', signInError);
        // We'll still try to create the profiles but it might fail due to RLS
      }
      
      // Explicitly check that the profile has been created
      let profileCreated = false;
      let retryCount = 0;
      
      while (!profileCreated && retryCount < 5) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (profileData) {
          profileCreated = true;
          console.log('Profile created successfully:', profileData.id);
        } else {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
          retryCount++;
        }
      }
      
      if (!profileCreated) {
        toast.dismiss(loadingToastId);
        toast.warning('Account created but profile setup incomplete. Please contact support.');
        console.error('Profile creation could not be verified after multiple attempts');
        // Continue anyway to try wallet creation
      }

      // Check if wallet already exists
      const { data: existingWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single();
    
      // Create wallet only if it doesn't exist
      if (!existingWallet) {
        const { error: walletError } = await supabase
          .from('wallets')
          .insert({
            user_id: userId,
            balance: 0,
            currency: 'USD'
          });

        if (walletError) {
          console.error('Wallet creation error:', walletError);
          // Continue despite wallet error - not critical
        }
      } else {
        console.log('Wallet already exists for user, skipping creation');
      }

      // If user is a driver, create driver profile
      if (formData.role === 'driver') {
        if (!formData.vehicle_type) {
          toast.dismiss(loadingToastId);
          toast.error('Vehicle type is required for drivers');
          throw new Error('Vehicle type is required for drivers');
        }
        
        // Let's try a different approach to create the driver profile
        // Make sure we're authenticated with the correct user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || session.user.id !== userId) {
          console.warn('Authentication session mismatch, attempting to create driver profile anyway');
        }

        const tempLicenseNumber = `TEMP_${Date.now()}_${userId.slice(-6)}`;
        
        // First try creating with proper RLS (as the logged-in user)
        const { error: driverError } = await supabase
          .from('driver_profiles')
          .insert({
            id: userId,
            vehicle_type: formData.vehicle_type,
            license_number: tempLicenseNumber,
            status: 'pending'
          });

        if (driverError) {
          console.error('Driver profile creation error:', driverError);
          throw new Error(`Could not create driver profile: ${driverError.message}`);
        }
      }
    
      toast.dismiss(loadingToastId);
      toast.success('Account created successfully! Please check your email to verify your account.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - orange background with message */}
      <div className="hidden lg:flex lg:w-1/2 bg-orange-500 justify-center items-center">
        <div className="max-w-md text-white text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold mb-4"
          >
            {t('Welcome to UberApp')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg"
          >
            {t('Join our community and start your journey with us')}
          </motion.p>
        </div>
      </div>

      {/* Right side - registration form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {t('Create your account')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('Already have an account?')}{' '}
            <Link
              to="/login"
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              {t('Log in')}
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className={labelClasses}>
                  {t('Full Name')}
                </label>
                <div className="relative">
                  <FaUser className={iconClasses} />
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    className={`${inputClasses} pl-10 ${errors.full_name ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder={t('Enter your full name')}
                    disabled={loading}
                  />
                </div>
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className={labelClasses}>
                  {t('Email')}
                </label>
                <div className="relative">
                  <FaEnvelope className={iconClasses} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={`${inputClasses} pl-10 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('Enter your email')}
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className={labelClasses}>
                  {t('Phone (optional)')}
                </label>
                <div className="relative">
                  <FaPhone className={iconClasses} />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className={`${inputClasses} pl-10 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t('Enter your phone number')}
                    disabled={loading}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={labelClasses}>
                  {t('Password')}
                </label>
                <div className="relative">
                  <FaLock className={iconClasses} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={`${inputClasses} pl-10 pr-10 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('Create a password')}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className={labelClasses}>
                  {t('Confirm Password')}
                </label>
                <div className="relative">
                  <FaLock className={iconClasses} />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className={`${inputClasses} pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('Confirm your password')}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className={labelClasses}>{t('Register as')}</label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <button
                    type="button"
                    className={`${
                      formData.role === 'user'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    } px-4 py-2 border rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors`}
                    onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                    disabled={loading}
                  >
                    <FaUser />
                    {t('Passenger')}
                  </button>
                  <button
                    type="button"
                    className={`${
                      formData.role === 'driver'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    } px-4 py-2 border rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors`}
                    onClick={() => setFormData(prev => ({ ...prev, role: 'driver' }))}
                    disabled={loading}
                  >
                    <FaCar />
                    {t('Driver')}
                  </button>
                </div>
              </div>

              {/* Vehicle Type (for drivers) */}
              {formData.role === 'driver' && (
                <div>
                  <label htmlFor="vehicle_type" className={labelClasses}>
                    {t('Vehicle Type')}
                  </label>
                  <div className="relative">
                    <FaCar className={iconClasses} />
                    <select
                      id="vehicle_type"
                      name="vehicle_type"
                      required
                      className={`${inputClasses} pl-10 ${errors.vehicle_type ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.vehicle_type}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">{t('Select vehicle type')}</option>
                      <option value="sedan">{t('Sedan')}</option>
                      <option value="suv">{t('SUV')}</option>
                      <option value="van">{t('Van')}</option>
                    </select>
                  </div>
                  {errors.vehicle_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.vehicle_type}</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  className={buttonClasses}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                      {t('Creating account...')}
                    </div>
                  ) : (
                    t('Create account')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
