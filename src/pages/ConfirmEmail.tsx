import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [tokenError, setTokenError] = useState('');
  
  // Extract email from location state if available
  useEffect(() => {
    if (location.state && location.state.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);
  
  // Handle manual token confirmation
  const handleConfirmWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setTokenError('Please enter the confirmation token');
      return;
    }

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setLoading(true);
    
    try {
      // Using try-catch to properly handle any network or API errors
      console.log('Verifying token for email:', email);
      
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });
      
      console.log('Verification response:', { data, error });
      
      if (error) {
        setTokenError(`Verification failed: ${error.message}`);
        toast.error(`Verification failed: ${error.message}`);
      } else {
        toast.success('Email successfully verified! You can now log in.');
        
        // Redirect to login after successful verification
        setTimeout(() => {
          navigate('/login', { state: { verificationSuccess: true, email } });
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error verifying token:', error);
      toast.error(`Verification error: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle resending confirmation email
  const handleResendEmail = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setResendingEmail(true);
    
    try {
      console.log('Resending email to:', email);
      
      // Make sure we're using the correct redirect URL format
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.log('Using redirect URL:', redirectTo);
      
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectTo
        }
      });
      
      console.log('Resend response:', { data, error });
      
      if (error) {
        toast.error(`Error sending verification email: ${error.message}`);
      } else {
        toast.success('Verification email sent! Please check your inbox.');
      }
    } catch (error: any) {
      console.error('Error resending confirmation email:', error);
      toast.error(`Failed to send email: ${error?.message || 'Unknown error'}`);
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
            <h2 className="text-3xl font-bold mb-6">Email Verification</h2>
            <p className="mb-4">
              Please verify your email address to access all features of our app.
            </p>
            <p>
              If you can't find the verification email, you can request a new one
              or enter your verification token manually.
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Right side - form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8 bg-white">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="sm:mx-auto sm:w-full sm:max-w-md"
        >
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            Verify Your Email Address
          </h2>
          <div className="mt-8 mx-auto w-full max-w-md">
            {/* Instructions Section */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-5 mb-6 shadow-sm border border-blue-200">
              <h3 className="text-md font-bold text-blue-800 flex items-center">
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Verify Your Email
              </h3>
              <ol className="list-decimal list-inside text-sm text-blue-700 mt-3 space-y-2 pl-2">
                <li>Check your inbox for an email from us</li>
                <li>Click the verification link in that email</li>
                <li>If you can't find the email, check your spam folder</li>
                <li>Request a new verification email if needed</li>
                <li>Or enter the verification token manually below</li>
              </ol>
            </div>
            
            {/* Manual Token Verification */}
            <form onSubmit={handleConfirmWithToken} className="mb-6">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-sm text-black focus:outline-none focus:ring-1 focus:ring-[#FF7D45] focus:border-[#FF7D45]"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Token
                </label>
                <input
                  type="text"
                  id="token"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (tokenError) setTokenError('');
                  }}
                  placeholder="Enter the token from your verification email"
                  className={`w-full px-3 py-3 border ${tokenError ? 'border-red-500' : 'border-gray-300'} rounded-md text-sm text-black focus:outline-none focus:ring-1 focus:ring-[#FF7D45] focus:border-[#FF7D45]`}
                />
                {tokenError && (
                  <p className="mt-1 text-sm text-red-500">{tokenError}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Verifying...' : 'Verify Email with Token'}
              </button>
            </form>
            
            {/* Resend Email Section */}
            <div className="text-center py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Didn't receive a verification email?
              </p>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resendingEmail}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#FF7D45] hover:bg-[#E86A35] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7D45] ${resendingEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {resendingEmail ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
            
            {/* Back to Login */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
