import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract hash parameters from the URL
    const hashParams = window.location.hash
      .substring(1)
      .split('&')
      .reduce((params: Record<string, string>, param) => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
        return params;
      }, {});

    // Handle authentication callback
    const handleAuthCallback = async () => {
      try {
        // Check if this is an email confirmation callback
        if (hashParams.type === 'signup' && hashParams.error_code) {
          // Error occurred during verification
          toast.error(`Email verification failed: ${hashParams.error_description || 'Unknown error'}`);
          navigate('/confirm-email');
          return;
        }

        if (hashParams.type === 'signup' && hashParams.access_token) {
          // Successful verification
          toast.success('Email successfully verified! You can now log in.', {
            icon: () => <span role="img" aria-label="success">✅</span>,
            autoClose: 5000
          });
          
          // Extract the user's email from the state, if available
          const email = hashParams.email;
          
          // Redirect to login page
          navigate('/login', { state: { verificationSuccess: true, email } });
          return;
        }
        
        // Default redirect for other cases
        navigate('/login');
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error('An unexpected error occurred. Please try again.');
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF7D45] mx-auto mb-4"></div>
        <h2 className="text-lg font-medium text-gray-700">Processing your verification...</h2>
        <p className="mt-2 text-sm text-gray-500">You will be redirected automatically.</p>
      </div>
    </div>
  );
}
