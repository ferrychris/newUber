import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import React, { useState, useEffect } from 'react';

// We'll use the supabase client from the context instead of creating a new one

// Define types
type FileType = 'license' | 'vehicle' | 'insurance';

interface FormData {
  licenseNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
}

interface DocumentFormProps {
  formData: FormData;
  files: Partial<Record<FileType, File>>;
  onChange: (field: keyof FormData, value: string) => void;
  onUpload: (type: FileType, file: File) => void;
  onSubmit: (driverId: string, verificationId: string) => Promise<void>;
  isSubmitting: boolean;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected' | 'reviewing';
}

async function uploadFile(supabase: any, type: FileType, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${type}-${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from('license-images')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('license-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

interface ErrorState {
  type: 'driver' | 'upload' | 'verification' | 'general';
  message: string;
}

const DocumentForm: React.FC<DocumentFormProps> = ({
  formData,
  files,
  onChange,
  onUpload,
  onSubmit,
  isSubmitting,
  verificationStatus = 'none'
}) => {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="bg-[#2a2a2a] p-6 rounded-lg shadow-lg">
        <div className="p-4 mb-4 text-sm text-yellow-300 bg-yellow-900/50 rounded-lg border border-yellow-700">
          Please sign in to submit documents. If you are already signed in, please refresh the page.
        </div>
      </div>
    );
  }

  const handleError = (error: unknown, type: ErrorState['type']) => {
    console.error(`${type} error:`, error);
    let message = 'An unexpected error occurred. Please try again.';
    
    if (error instanceof Error) {
      message = error.message;
    } else if ((error as PostgrestError)?.message) {
      message = (error as PostgrestError).message;
    }
    
    setError({ type, message });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Please sign in to submit documents');
      return;
    }

    setError(null);
    try {
      // Validate vehicle year format
      if (formData.vehicleYear.length !== 4 || !/^\d{4}$/.test(formData.vehicleYear)) {
        handleError(new Error('Vehicle year must be a 4-digit number (e.g., 2025)'), 'driver');
        return;
      }
      // Upload files and get URLs
      const fileUrls: Record<FileType, string | null> = {
        license: null,
        vehicle: null,
        insurance: null
      };

      for (const [type, file] of Object.entries(files)) {
        if (file) {
          try {
            fileUrls[type as FileType] = await uploadFile(supabase, type as FileType, file);
          } catch (error) {
            handleError(error, 'upload');
            return;
          }
        }
      }

      // Insert or update driver profile
      const { data: driverData, error: driverError } = await supabase
        .from('driver_profiles')
        .upsert({
          id: user.id,
          license_number: formData.licenseNumber,
          vehicle_make: formData.vehicleMake,
          vehicle_model: formData.vehicleModel,
          vehicle_year: formData.vehicleYear,
          license_url: fileUrls.license,
          vehicle_url: fileUrls.vehicle,
          insurance_url: fileUrls.insurance,
          document_status: 'reviewing',
          availability: 'offline'
        })
        .select()
        .single();

      if (driverError) {
        handleError(driverError, 'driver');
        return;
      }

      // Create verification record
      for (const [type, file] of Object.entries(files)) {
        if (file) {
          try {
            fileUrls[type as FileType] = await uploadFile(supabase, type as FileType, file);
          } catch (uploadError) {
            handleError(uploadError, 'upload');
            return;
          }
        }
      }

      const { data: verificationData, error: verificationError } = await supabase
        .from('driver_verifications')
        .insert([{
          driver_id: driverData.id,
          license_doc_url: fileUrls.license,
          vehicle_doc_url: fileUrls.vehicle,
          insurance_doc_url: fileUrls.insurance,
          verification_status: 'pending'
        }])
        .select()
        .single();

      if (verificationError) {
        handleError(verificationError, 'verification');
        return;
      }

      await onSubmit(driverData.id, verificationData.id);
      setIsSubmitSuccess(true);
    } catch (error) {
      handleError(error, 'general');
    }
  };

  if (isSubmitSuccess || verificationStatus === 'reviewing') {
    return (
      <div className="bg-[#2a2a2a] p-6 rounded-lg shadow-lg space-y-6">
        <div className="p-4 text-sm text-blue-300 bg-blue-900/50 rounded-lg border border-blue-700">
          <h3 className="text-lg font-medium mb-2">
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Application Under Review
            </span>
          </h3>
          <p>Your documents are currently being reviewed by our team.</p>
          <p className="mt-2 text-blue-200">We will notify you via email once the review is complete.</p>
          <p className="mt-4 text-xs text-blue-200 opacity-75">This process typically takes 1-2 business days.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#2a2a2a] p-6 rounded-lg shadow-lg space-y-6">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-300 bg-red-900/50 rounded-lg border border-red-700">
          {error.type === 'driver' && 'Error saving driver information: '}
          {error.type === 'upload' && 'Error uploading documents: '}
          {error.type === 'verification' && 'Error saving verification information: '}
          {error.type === 'general' && 'Error: '}
          {error.message}
        </div>
      )}
      {verificationStatus === 'rejected' && (
        <div className="p-4 mb-4 text-sm text-red-300 bg-red-900/50 rounded-lg border border-red-700">
          Your documents were rejected. Please update and resubmit.
        </div>
      )}
      {verificationStatus === 'pending' && (
        <div className="p-4 mb-4 text-sm text-yellow-300 bg-yellow-900/50 rounded-lg border border-yellow-700">
          Your documents are being reviewed.
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white">License Number</label>
          <input
            type="text"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={(e) => onChange('licenseNumber', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#333333] shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-white placeholder-gray-400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Vehicle Make</label>
          <input
            type="text"
            name="vehicleMake"
            value={formData.vehicleMake}
            onChange={(e) => onChange('vehicleMake', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#333333] shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-white placeholder-gray-400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Vehicle Model</label>
          <input
            type="text"
            name="vehicleModel"
            value={formData.vehicleModel}
            onChange={(e) => onChange('vehicleModel', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#333333] shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-white placeholder-gray-400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Vehicle Year</label>
          <input
            type="text"
            name="vehicleYear"
            value={formData.vehicleYear}
            onChange={(e) => onChange('vehicleYear', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-700 bg-[#333333] shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-white placeholder-gray-400"
            pattern="\d{4}"
            maxLength={4}
            placeholder="YYYY"
            title="Please enter a 4-digit year (e.g., 2025)"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white">License Document</label>
          <input
            type="file"
            onChange={(e) => {
              setError(null);
              e.target.files?.[0] && onUpload('license', e.target.files[0]);
            }}
            className="mt-1 block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-900/50 file:text-blue-300
              hover:file:bg-blue-800/50
              file:border file:border-blue-700"
            accept="image/*,.pdf"
            required
          />
          {files.license && (
            <p className="mt-1 text-sm text-gray-400">
              Selected: {files.license.name}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Vehicle Document</label>
          <input
            type="file"
            onChange={(e) => {
              setError(null);
              e.target.files?.[0] && onUpload('vehicle', e.target.files[0]);
            }}
            className="mt-1 block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-900/50 file:text-blue-300
              hover:file:bg-blue-800/50
              file:border file:border-blue-700"
            accept="image/*,.pdf"
            required
          />
          {files.vehicle && (
            <p className="mt-1 text-sm text-gray-400">
              Selected: {files.vehicle.name}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Insurance Document</label>
          <input
            type="file"
            onChange={(e) => {
              setError(null);
              e.target.files?.[0] && onUpload('insurance', e.target.files[0]);
            }}
            className="mt-1 block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-900/50 file:text-blue-300
              hover:file:bg-blue-800/50
              file:border file:border-blue-700"
            accept="image/*,.pdf"
            required
          />
          {files.insurance && (
            <p className="mt-1 text-sm text-gray-400">
              Selected: {files.insurance.name}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-blue-700 rounded-md shadow-sm text-sm font-medium text-blue-300 bg-blue-900/50 hover:bg-blue-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
};

export default DocumentForm;
