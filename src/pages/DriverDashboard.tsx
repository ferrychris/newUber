import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// Interface for User type
interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  profile_image: string | null;
}

// Interface for Driver type
interface Driver {
  id: string;
  first_name?: string;
  last_name?: string;
  license_number?: string;
  license_expiry?: string;
  license_image_url?: string;
  vehicle_type?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number | null;
  vehicle_color?: string;
  vehicle_plate?: string;
  vehicle_image_url?: string;
  insurance_number?: string | null;
  insurance_expiry?: string | null;
  insurance_image_url?: string | null;
  profile_image_url?: string | null;
  verification_status?: string | null;
  is_available?: boolean;
  total_rides?: number;
  average_rating?: number;
  updated_at?: string;
}

// Interface for Order type
interface Order {
  id: string;
  user_id: string;
  service_id: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  pickup_location: string;
  dropoff_location: string;
  estimated_price: number;
  actual_price: number | null;
  created_at: string;
  driver_id: string | null;
}

// Interface for DriverDashboard component props
interface DriverDashboardProps {}

// Define document status type
type DocumentStatus = 'none' | 'pending' | 'in_progress' | 'approved' | 'rejected';

// Helper functions to fix TypeScript type issues
const getStatusClassName = (status: DocumentStatus): string => {
  switch (status) {
    case 'approved':
      return 'text-green-800 dark:text-green-200';
    case 'pending':
    case 'in_progress':
      return 'text-yellow-800 dark:text-yellow-200';
    case 'rejected':
      return 'text-red-800 dark:text-red-200';
    case 'none':
    default:
      return 'text-gray-800 dark:text-gray-200';
  }
};

const getStatusMessage = (status: DocumentStatus): string => {
  switch (status) {
    case 'approved':
      return 'Your driver account is fully verified. You can now receive and accept ride requests.';
    case 'pending':
      return 'Your documents have been submitted and are awaiting review. This typically takes 1-2 business days.';
    case 'in_progress':
      return 'Your documents are currently being reviewed by our administrative team.';
    case 'rejected':
      return 'Your verification was rejected. Please update the required information and resubmit your documents.';
    case 'none':
    default:
      return 'Please submit your documents to become a verified driver.';
  }
};

// Helper to map DB status to UI status
const mapDbStatusToUiStatus = (dbStatus: string | null): DocumentStatus => {
  switch (dbStatus) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'in_progress';
    case 'approved':
      return 'approved';
    case 'verified':
      return 'approved'; // Map verified to approved in the UI
    case 'rejected':
      return 'rejected';
    default:
      return 'none';
  }
};

const getFileExtension = (fileName: string) => {
  const fileParts = fileName.split('.');
  return '.' + fileParts[fileParts.length - 1];
};

export default function DriverDashboard({}: DriverDashboardProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('none');
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [driverProfile, setDriverProfile] = useState<Driver | null>(null);
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [availability, setAvailability] = useState<'available' | 'busy' | 'offline'>('offline');
  const [verificationHistory, setVerificationHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Document submission state
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentFormData, setDocumentFormData] = useState({
    license_number: '',
    license_expiry: '',
    vehicle_type: 'car',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    vehicle_plate: '',
    insurance_number: '',
    insurance_expiry: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<{
    license_image: File | null;
    insurance_image: File | null;
    profile_image: File | null;
    vehicle_image: File | null;
  }>({
    license_image: null,
    insurance_image: null,
    profile_image: null,
    vehicle_image: null
  });

  // Add state for pending orders
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    loadProfiles();
    loadPendingOrders();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      
      // Load user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (userError) {
        toast.error('Error loading user profile');
        console.error(userError);
        return;
      }
      
      setUserProfile(userData);
      
      // Load driver profile
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (driverError && driverError.code !== 'PGRST116') {
        toast.error('Error loading driver profile');
        console.error(driverError);
        return;
      }
      
      setDriverProfile(driverData);
      
      if (driverData) {
        // Initialize form data with existing driver data if available
        setDocumentFormData({
          license_number: driverData.license_number || '',
          license_expiry: driverData.license_expiry ? new Date(driverData.license_expiry).toISOString().split('T')[0] : '',
          vehicle_type: driverData.vehicle_type || 'car',
          vehicle_make: driverData.vehicle_make || '',
          vehicle_model: driverData.vehicle_model || '',
          vehicle_year: driverData.vehicle_year ? driverData.vehicle_year.toString() : '',
          vehicle_color: driverData.vehicle_color || '',
          vehicle_plate: driverData.vehicle_plate || '',
          insurance_number: driverData.insurance_number || '',
          insurance_expiry: driverData.insurance_expiry ? new Date(driverData.insurance_expiry).toISOString().split('T')[0] : ''
        });
        
        // Set document status based on driver verification status
        if (driverData.verification_status) {
          setDocumentStatus(mapDbStatusToUiStatus(driverData.verification_status));
        }
        
        // Set availability from driver profile
        if (driverData.is_available !== undefined) {
          setAvailability(driverData.is_available ? 'available' : 'offline');
        }
        
        // Load driver's current availability from separate table if exists
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('driver_availability')
          .select('status')
          .eq('driver_id', session.user.id)
          .single();
          
        if (!availabilityError && availabilityData) {
          setAvailability(availabilityData.status as 'available' | 'busy' | 'offline');
        }
        
        // Load current orders
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('driver_id', session.user.id)
          .in('status', ['pending', 'driver_assigned', 'picked_up'])
          .order('created_at', { ascending: false });
          
        if (!orderError && orderData) {
          setCurrentOrders(orderData);
        }
      }

      // Load verification history
      await loadVerificationHistory();
      
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('An error occurred while loading profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVerificationHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      
      const { data, error } = await supabase
        .from('driver_verifications')
        .select('*')
        .eq('driver_id', session.user.id)
        .order('submission_date', { ascending: false });
        
      if (error) {
        console.error('Error loading verification history:', error);
        toast.error('Error loading verification history');
        return;
      }
      
      setVerificationHistory(data || []);
    } catch (error) {
      console.error('Error loading verification history:', error);
      toast.error('An unexpected error occurred while loading verification history');
    }
  };

  const loadPendingOrders = async () => {
    try {
      setIsLoadingOrders(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      
      // Get orders that are pending and don't have an assigned driver yet
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null);
        
      if (error) {
        console.error('Error loading pending orders:', error);
        return;
      }
      
      setPendingOrders(orders || []);
    } catch (error) {
      console.error('Error loading pending orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Update driver availability status
  const updateAvailability = async (status: 'available' | 'busy' | 'offline') => {
    if ((documentStatus as DocumentStatus) !== 'approved') {
      toast.warning('You need to be verified before you can change your availability.');
      return;
    }

    try {
      setIsToggling(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please login again');
        navigate('/login');
        return;
      }
      
      // First, update the driver_availability table
      const { error: availabilityUpdateError } = await supabase
        .from('driver_availability')
        .upsert({ 
          driver_id: session.user.id,
          status: status,
          last_updated: new Date().toISOString()
        });
        
      if (availabilityUpdateError) {
        console.error('Error updating driver_availability:', availabilityUpdateError);
        toast.error('Failed to update availability status');
        return;
      }
      
      // Then update the drivers table with the is_available flag
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ is_available: status === 'available' })
        .eq('id', session.user.id);
        
      if (updateError) {
        toast.error('Failed to update driver availability status');
        console.error(updateError);
        return;
      }
      
      // Update local state
      setAvailability(status);
      
      // Show success message
      const statusMessage = status === 'available' ? 'online' : 'offline';
      toast.success(`You are now ${statusMessage}. ${status === 'available' ? 'You can now receive new orders!' : 'You will not receive new orders.'}`);
      
      // Refresh pending orders if going online
      if (status === 'available') {
        loadPendingOrders();
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Error updating availability status');
    } finally {
      setIsToggling(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      if ((documentStatus as DocumentStatus) !== 'approved') {
        toast.warning('You need to be verified before you can go online.');
        return;
      }

      setIsToggling(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please login again');
        navigate('/login');
        return;
      }
      
      const newStatus = availability === 'available' ? 'offline' : 'available';
      
      // Update the drivers table with the new availability status
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ is_available: newStatus === 'available' })
        .eq('id', session.user.id);
        
      if (updateError) {
        toast.error('Failed to update availability status');
        console.error(updateError);
        return;
      }
      
      // Also update the driver_availability table if it exists
      const { error: availabilityUpdateError } = await supabase
        .from('driver_availability')
        .upsert({ 
          driver_id: session.user.id,
          status: newStatus,
          last_updated: new Date().toISOString()
        });
        
      if (availabilityUpdateError) {
        console.error(availabilityUpdateError);
        // Don't show an error toast for this one as it's a secondary update
      }
      
      setAvailability(newStatus);
      toast.success(`You are now ${newStatus === 'available' ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Error updating availability status');
    } finally {
      setIsToggling(false);
    }
  };

  // Add function to accept orders
  const acceptOrder = async (orderId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }
      
      // Check if driver is verified
      if ((documentStatus as DocumentStatus) !== 'approved') {
        toast.error('You need to be verified to accept orders. Please complete your verification.');
        return;
      }
      
      // Check if driver is available
      if (availability !== 'available') {
        toast.error('You need to be online to accept orders. Please set your status to available.');
        return;
      }
      
      // Update the order with the driver's ID
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'accepted',
          driver_id: session.user.id
        })
        .eq('id', orderId);
      
      if (error) {
        console.error('Error accepting order:', error);
        toast.error('Failed to accept order. Please try again.');
        return;
      }
      
      toast.success('Order accepted successfully!');
      
      // Reload orders
      loadPendingOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  // Handler for form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validate input if needed
    if (name === 'license_number' && value.trim() === '') {
      toast.warning('License number cannot be empty');
    }
    
    if (name === 'vehicle_year') {
      const year = parseInt(value);
      const currentYear = new Date().getFullYear();
      
      if (year && (year < 1950 || year > currentYear + 1)) {
        toast.warning(`Vehicle year should be between 1950 and ${currentYear + 1}`);
      }
    }
    
    // Update form data
    setDocumentFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler for file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
        e.target.value = ''; // Reset the input
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid file type. Please upload an image (JPG, PNG) or PDF.`);
        e.target.value = ''; // Reset the input
        return;
      }
      
      // Update uploaded files
      setUploadedFiles(prev => ({
        ...prev,
        [name]: file
      }));
      
      toast.success(`${name.replace('_', ' ')} uploaded successfully!`);
    }
  };

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      // Check if all required fields are filled
      const requiredFields = [
        'license_number', 
        'license_expiry', 
        'vehicle_type', 
        'vehicle_make', 
        'vehicle_model', 
        'vehicle_year', 
        'vehicle_color', 
        'vehicle_plate'
      ];

      const emptyRequiredFields = requiredFields.filter(field => !documentFormData[field as keyof typeof documentFormData]);
      
      if (emptyRequiredFields.length > 0) {
        toast.error(`Please fill in all required fields: ${emptyRequiredFields.map(field => field.replace('_', ' ')).join(', ')}`);
        setIsSubmitting(false);
        return;
      }
      
      // Upload license image if provided
      let licenseImageUrl = driverProfile?.license_image_url || null;
      if (uploadedFiles.license_image) {
        const licenseImagePath = `drivers/${session.user.id}/license_${Date.now()}.${getFileExtension(uploadedFiles.license_image.name)}`;
        const { data: licenseImageData, error: licenseImageError } = await supabase.storage
          .from('driver_documents')
          .upload(licenseImagePath, uploadedFiles.license_image);
          
        if (licenseImageError) {
          console.error('License image upload error:', licenseImageError);
          toast.error('Failed to upload license image');
          setIsSubmitting(false);
          return;
        }
        
        const { data: { publicUrl: licensePublicUrl } } = supabase.storage
          .from('driver_documents')
          .getPublicUrl(licenseImagePath);
          
        licenseImageUrl = licensePublicUrl;
      }
      
      // Upload vehicle image if provided
      let vehicleImageUrl = driverProfile?.vehicle_image_url || null;
      if (uploadedFiles.vehicle_image) {
        const vehicleImagePath = `drivers/${session.user.id}/vehicle_${Date.now()}.${getFileExtension(uploadedFiles.vehicle_image.name)}`;
        const { data: vehicleImageData, error: vehicleImageError } = await supabase.storage
          .from('driver_documents')
          .upload(vehicleImagePath, uploadedFiles.vehicle_image);
          
        if (vehicleImageError) {
          console.error('Vehicle image upload error:', vehicleImageError);
          toast.error('Failed to upload vehicle image');
          setIsSubmitting(false);
          return;
        }
        
        const { data: { publicUrl: vehiclePublicUrl } } = supabase.storage
          .from('driver_documents')
          .getPublicUrl(vehicleImagePath);
          
        vehicleImageUrl = vehiclePublicUrl;
      }
      
      // Upload insurance image if provided
      let insuranceImageUrl = driverProfile?.insurance_image_url || null;
      if (uploadedFiles.insurance_image) {
        const insuranceImagePath = `drivers/${session.user.id}/insurance_${Date.now()}.${getFileExtension(uploadedFiles.insurance_image.name)}`;
        const { data: insuranceImageData, error: insuranceImageError } = await supabase.storage
          .from('driver_documents')
          .upload(insuranceImagePath, uploadedFiles.insurance_image);
          
        if (insuranceImageError) {
          console.error('Insurance image upload error:', insuranceImageError);
          toast.error('Failed to upload insurance image');
          setIsSubmitting(false);
          return;
        }
        
        const { data: { publicUrl: insurancePublicUrl } } = supabase.storage
          .from('driver_documents')
          .getPublicUrl(insuranceImagePath);
          
        insuranceImageUrl = insurancePublicUrl;
      }

      // Update driver profile with document information
      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          license_number: documentFormData.license_number,
          license_expiry: documentFormData.license_expiry,
          license_image_url: licenseImageUrl,
          vehicle_type: documentFormData.vehicle_type,
          vehicle_make: documentFormData.vehicle_make,
          vehicle_model: documentFormData.vehicle_model,
          vehicle_year: documentFormData.vehicle_year ? parseInt(documentFormData.vehicle_year) : null,
          vehicle_color: documentFormData.vehicle_color,
          vehicle_plate: documentFormData.vehicle_plate,
          insurance_number: documentFormData.insurance_number,
          insurance_expiry: documentFormData.insurance_expiry,
          insurance_image_url: insuranceImageUrl,
          // Update verification status according to workflow
          verification_status: (documentStatus as DocumentStatus) === 'none' || (documentStatus as DocumentStatus) === 'rejected' ? 'pending' : 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);
      
      if (updateError) {
        console.error('Update error:', updateError);
        toast.error('Failed to update driver information');
        setIsSubmitting(false);
        return;
      }
      
      // Record verification history
      const { error: historyError } = await supabase
        .from('driver_verification_history')
        .insert([
          {
            driver_id: session.user.id,
            status: (documentStatus as DocumentStatus) === 'none' || (documentStatus as DocumentStatus) === 'rejected' ? 'pending' : 'in_progress',
            notes: (documentStatus as DocumentStatus) === 'rejected' ? 'Documents resubmitted after rejection' : 
                  (documentStatus as DocumentStatus) === 'none' ? 'Initial document submission' : 'Documents updated during review',
            submission_date: new Date().toISOString()
          }
        ]);
      
      if (historyError) {
        console.error('History error:', historyError);
        // Non-critical, so just log the error
      }
      
      // Show appropriate success notification based on status
      if ((documentStatus as DocumentStatus) === 'none' || (documentStatus as DocumentStatus) === 'rejected') {
        toast.success('Documents submitted successfully! They will be reviewed shortly.');
      } else {
        toast.success('Documents updated successfully! Your verification status will be reviewed.');
      }
      
      setShowDocumentForm(false);
      
      // Reload driver profile to get updated status
      loadProfiles();
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while submitting documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render verification history
  const renderVerificationHistory = () => {
    if (verificationHistory.length === 0) {
      return null;
    }

    return (
      <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Verification History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {verificationHistory.map((record, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(record.submission_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${record.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          record.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          record.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                    >
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-400">
                    {record.notes || 'No notes provided'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStatusNotification = () => {
    if ((documentStatus as DocumentStatus) === 'pending') {
      return (
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Verification Pending</h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>Your documents have been uploaded and are awaiting review by our team. This typically takes 1-2 business days.</p>
              </div>
            </div>
          </div>
        </div>
      );
    } else if ((documentStatus as DocumentStatus) === 'in_progress') {
      return (
        <div className="mt-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Verification In Progress</h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>Our team is currently reviewing your documents. You'll be notified once the verification is complete.</p>
              </div>
            </div>
          </div>
        </div>
      );
    } else if ((documentStatus as DocumentStatus) === 'approved') {
      return (
        <div className="mt-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Verification Approved</h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>Congratulations! Your driver account has been verified. You can now receive and accept ride requests.</p>
              </div>
            </div>
          </div>
        </div>
      );
    } else if ((documentStatus as DocumentStatus) === 'rejected') {
      const lastRejection = verificationHistory.length > 0 ? 
        verificationHistory.find(item => item.status === 'rejected') : null;
      
      return (
        <div className="mt-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Verification Rejected</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>Your verification was rejected. Reason: {lastRejection?.notes || 'Please update and resubmit your information.'}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const renderVerificationSection = () => {
    return (
      <>
        {renderStatusNotification()}
        
        {/* Verification Button */}
        {((documentStatus as DocumentStatus) === 'none' || (documentStatus as DocumentStatus) === 'pending' || (documentStatus as DocumentStatus) === 'rejected' || (documentStatus as DocumentStatus) === 'in_progress') && (
          <div className="mt-6">
            <button 
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setShowDocumentForm(true)}
            >
              {(documentStatus as DocumentStatus) === 'none' ? 'Verify My Account' : 
               (documentStatus as DocumentStatus) === 'pending' ? 'Update Verification Documents' : 
               (documentStatus as DocumentStatus) === 'rejected' ? 'Resubmit Verification Documents' : 
               'Update Documents'}
            </button>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {(documentStatus as DocumentStatus) === 'none' ? 'Upload your documents to become a verified driver and start accepting orders.' : 
               (documentStatus as DocumentStatus) === 'pending' ? 'You can update your documents while they are being reviewed.' : 
               (documentStatus as DocumentStatus) === 'rejected' ? 'Please address the issues with your previous submission and resubmit your documents.' : 
               'You can update your driver information and documents here. Your verification status will be reviewed after submission.'}
            </p>
          </div>
        )}
      </>
    );
  };

  // Add function to render in-progress view
  const renderInProgressView = () => {
    if ((documentStatus as DocumentStatus) === 'in_progress' || (documentStatus as DocumentStatus) === 'pending') {
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  Verification In Progress
                </h2>
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md mb-6">
                  <p className="text-blue-800 dark:text-blue-200">
                    Your documents are being reviewed by our team. This process typically takes 24-48 hours.
                  </p>
                </div>
                
                {renderVerificationSection()}
                
                {renderVerificationHistory()}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Add function to render rejected view
  const renderRejectedView = () => {
    if ((documentStatus as DocumentStatus) === 'rejected') {
      const lastRejection = verificationHistory.length > 0 ? 
        verificationHistory.find(item => item.status === 'rejected') : null;
        
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  Verification Rejected
                </h2>
                <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md mb-6">
                  <p className="text-red-800 dark:text-red-200">
                    Your verification was rejected. Please address the issues below and resubmit your documents.
                  </p>
                </div>
                
                {lastRejection && lastRejection.notes && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-6">
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Rejection Reason:</h3>
                    <p className="text-gray-700 dark:text-gray-300">{lastRejection.notes}</p>
                  </div>
                )}
                
                {renderVerificationSection()}
                
                {renderVerificationHistory()}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Document submission form
  const renderDocumentForm = () => {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {(documentStatus as DocumentStatus) === 'none' ? 'Submit Documents' : 
                 (documentStatus as DocumentStatus) === 'rejected' ? 'Resubmit Documents' : 
                 (documentStatus as DocumentStatus) === 'in_progress' ? 'Update Documents' : 'Update Documents'}
              </h2>
              <button 
                onClick={() => setShowDocumentForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(documentStatus as DocumentStatus) === 'none' ? 'Please complete all required fields (*) and upload the necessary documents to become a verified driver.' : 
                 (documentStatus as DocumentStatus) === 'rejected' ? 'Your previous submission was rejected. Please update the information and resubmit your documents.' : 
                 'You can update your driver information and documents here. Your verification status will be reviewed after submission.'}
              </p>
            </div>
            
            <form onSubmit={handleDocumentSubmit} className="space-y-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* License Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Driver's License Number *
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={documentFormData.license_number}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      License Expiry Date *
                    </label>
                    <input
                      type="date"
                      name="license_expiry"
                      value={documentFormData.license_expiry}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      License Image *
                    </label>
                    <input
                      type="file"
                      name="license_image"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      required={!uploadedFiles.license_image}
                    />
                    {uploadedFiles.license_image && (
                      <p className="mt-1 text-sm text-green-600">
                        File selected: {uploadedFiles.license_image.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                  Vehicle Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vehicle Type *
                    </label>
                    <select
                      name="vehicle_type"
                      value={documentFormData.vehicle_type}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Select Vehicle Type</option>
                      <option value="car">Car</option>
                      <option value="bike">Bike/Motorcycle</option>
                      <option value="truck">Truck/Van</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Make/Brand *
                    </label>
                    <input
                      type="text"
                      name="vehicle_make"
                      value={documentFormData.vehicle_make}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      name="vehicle_model"
                      value={documentFormData.vehicle_model}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year *
                    </label>
                    <input
                      type="number"
                      name="vehicle_year"
                      value={documentFormData.vehicle_year}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                      min="1990"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color *
                    </label>
                    <input
                      type="text"
                      name="vehicle_color"
                      value={documentFormData.vehicle_color}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      License Plate Number *
                    </label>
                    <input
                      type="text"
                      name="vehicle_plate"
                      value={documentFormData.vehicle_plate}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vehicle Image *
                    </label>
                    <input
                      type="file"
                      name="vehicle_image"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      required={!uploadedFiles.vehicle_image}
                    />
                    {uploadedFiles.vehicle_image && (
                      <p className="mt-1 text-sm text-green-600">
                        File selected: {uploadedFiles.vehicle_image.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                  Insurance Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Insurance Policy Number
                    </label>
                    <input
                      type="text"
                      name="insurance_number"
                      value={documentFormData.insurance_number}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Insurance Expiry Date
                    </label>
                    <input
                      type="date"
                      name="insurance_expiry"
                      value={documentFormData.insurance_expiry}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Insurance Document
                    </label>
                    <input
                      type="file"
                      name="insurance_image"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {uploadedFiles.insurance_image && (
                      <p className="mt-1 text-sm text-green-600">
                        File selected: {uploadedFiles.insurance_image.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                  Profile Image
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Profile Picture
                  </label>
                  <input
                    type="file"
                    name="profile_image"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {uploadedFiles.profile_image && (
                    <p className="mt-1 text-sm text-green-600">
                      File selected: {uploadedFiles.profile_image.name}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    This will be used as your driver profile image visible to customers.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDocumentForm(false)}
                  className="mr-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </div>
                  ) : (
                    (documentStatus as DocumentStatus) === 'none' ? 'Submit Documents' : 
                    (documentStatus as DocumentStatus) === 'pending' ? 'Update Verification Documents' : 
                    (documentStatus as DocumentStatus) === 'rejected' ? 'Resubmit Verification Documents' : 
                    'Update Documents'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Show in-progress message if verification is being reviewed
  if ((documentStatus as DocumentStatus) === 'in_progress' || (documentStatus as DocumentStatus) === 'pending') {
    return renderInProgressView();
  }

  // Show rejection message if verification was rejected
  if ((documentStatus as DocumentStatus) === 'rejected') {
    return renderRejectedView();
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Driver Dashboard
          </h1>
          
          <div className="flex items-center space-x-4">
            {userProfile && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Welcome,</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{userProfile.full_name}</p>
              </div>
            )}
            
            <div className="relative">
              <select
                value={availability}
                onChange={(e) => updateAvailability(e.target.value as 'available' | 'busy' | 'offline')}
                className={`
                  rounded-full px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                  ${availability === 'available' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                    : availability === 'busy'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
              
              <div className={`absolute left-0 -top-2 -ml-1 w-3 h-3 rounded-full ${
                availability === 'available' 
                  ? 'bg-green-500' 
                  : availability === 'busy' 
                    ? 'bg-orange-500' 
                    : 'bg-gray-500'
              }`}></div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Profile Overview */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Driver Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Status
              </h3>
              <div className="flex items-center justify-between">
                <div className={`p-4 rounded-md border ${
                  (documentStatus as DocumentStatus) === 'approved' 
                    ? 'bg-green-100 border-green-200 dark:bg-green-900 dark:border-green-800' 
                    : (documentStatus as DocumentStatus) === 'pending' || (documentStatus as DocumentStatus) === 'in_progress'
                      ? 'bg-yellow-100 border-yellow-200 dark:bg-yellow-900 dark:border-yellow-800' 
                      : (documentStatus as DocumentStatus) === 'rejected'
                        ? 'bg-red-100 border-red-200 dark:bg-red-900 dark:border-red-800'
                        : 'bg-gray-100 border-gray-200 dark:bg-gray-900 dark:border-gray-800'
                }`}>
                  <div className="flex items-center mb-2">
                    {(() => {
                      const status = (documentStatus as DocumentStatus);
                      if (status === 'approved') {
                        return (
                          <svg className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        );
                      } else if (status === 'pending') {
                        return (
                          <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        );
                      } else if (status === 'in_progress') {
                        return (
                          <svg className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        );
                      } else if (status === 'rejected') {
                        return (
                          <svg className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        );
                      } else {
                        // None or default
                        return (
                          <svg className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        );
                      }
                    })()}
                    <span className="font-medium">Verification Status: {status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </div>
                  <p className="text-sm">{getStatusMessage(status)}</p>
                </div>
                <select
                  value={availability}
                  onChange={(e) => updateAvailability(e.target.value as 'available' | 'busy' | 'offline')}
                  className={`
                    rounded-full px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${availability === 'available' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                      : availability === 'busy'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Total Rides
              </h3>
              <p className="text-3xl font-bold text-indigo-600">
                {driverProfile?.total_rides || 0}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Rating
              </h3>
              <p className="text-3xl font-bold text-indigo-600">
                {driverProfile?.average_rating?.toFixed(1) || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Verification Status</h2>
          
          <div className={`p-4 rounded-md border ${
            (documentStatus as DocumentStatus) === 'approved' 
              ? 'bg-green-100 border-green-200 dark:bg-green-900 dark:border-green-800' 
              : (documentStatus as DocumentStatus) === 'pending' || (documentStatus as DocumentStatus) === 'in_progress'
                ? 'bg-yellow-100 border-yellow-200 dark:bg-yellow-900 dark:border-yellow-800' 
                : (documentStatus as DocumentStatus) === 'rejected'
                  ? 'bg-red-100 border-red-200 dark:bg-red-900 dark:border-red-800'
                  : 'bg-gray-100 border-gray-200 dark:bg-gray-900 dark:border-gray-800'
          }`}>
            <div className="flex items-center mb-2">
              {(() => {
                const status = (documentStatus as DocumentStatus);
                if (status === 'approved') {
                  return (
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                } else if (status === 'pending') {
                  return (
                    <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                } else if (status === 'in_progress') {
                  return (
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  );
                } else if (status === 'rejected') {
                  return (
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  );
                } else {
                  // None or default
                  return (
                    <svg className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  );
                }
              })()}
              <span className="font-medium">Verification Status: {status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </div>
            <p className="text-sm">{getStatusMessage(status)}</p>
          </div>
          
          {/* Availability status toggle */}
          {(documentStatus as DocumentStatus) === 'approved' && (
            <div className="mt-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Driver Availability</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {availability === 'available' 
                      ? 'You are currently online and can receive new ride requests' 
                      : 'You are currently offline and will not receive new ride requests'}
                  </p>
                  <p className="text-sm font-medium">
                    Status: <span 
                      className={`
                        px-2 py-1 rounded-full text-xs
                        ${availability === 'available' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}
                      `}
                    >
                      {availability === 'available' ? 'Online' : 'Offline'}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="relative inline-block w-14 h-8 align-middle select-none transition duration-200 ease-in">
                    <label 
                      htmlFor="toggleAvailability" 
                      className={`
                        block overflow-hidden h-8 rounded-full cursor-pointer transition-all duration-300
                        ${isToggling ? 'opacity-50' : 'opacity-100'}
                        ${availability === 'available' 
                          ? 'bg-green-500 dark:bg-green-600' 
                          : 'bg-gray-300 dark:bg-gray-600'}
                      `}
                    >
                      <span className="sr-only">Toggle availability</span>
                      <input 
                        type="checkbox" 
                        id="toggleAvailability" 
                        name="toggleAvailability" 
                        className="sr-only"
                        checked={availability === 'available'}
                        onChange={() => updateAvailability(availability === 'available' ? 'offline' : 'available')}
                        disabled={isToggling}
                      />
                      <div 
                        className={`
                          dot absolute top-1 w-6 h-6 rounded-full transition-all duration-300 ease-in-out bg-white shadow-md
                          ${availability === 'available' ? 'left-7' : 'left-1'}
                        `}
                      ></div>
                    </label>
                  </div>
                  <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {isToggling ? 'Updating...' : 'Toggle to change'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Current Orders */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Current Orders
          </h2>
          {currentOrders.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No orders at the moment. Make sure your status is set to "Available" to receive orders.
            </p>
          ) : (
            <div className="space-y-4">
              {currentOrders.map(order => (
                <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-wrap justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">From</p>
                      <p className="font-medium">{order.pickup_location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">To</p>
                      <p className="font-medium">{order.dropoff_location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                      <p className="font-medium">${order.estimated_price}</p>
                    </div>
                    <div>
                      <button 
                        className="mt-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onClick={() => acceptOrder(order.id)}
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pending Orders */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Pending Orders
          </h2>
          {isLoadingOrders ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : pendingOrders.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No pending orders at the moment.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map(order => (
                <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-wrap justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">From</p>
                      <p className="font-medium">{order.pickup_location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">To</p>
                      <p className="font-medium">{order.dropoff_location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                      <p className="font-medium">${order.estimated_price}</p>
                    </div>
                    <div>
                      <button 
                        className="mt-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onClick={() => acceptOrder(order.id)}
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Form Modal */}
      {showDocumentForm && renderDocumentForm()}
    </div>
  );
}
