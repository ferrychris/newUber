import { supabase } from '../supabaseClient';

// Define types for browser usage based on the drivers table schema
export type Driver = {
  id: string;
  userId: string | null;
  vehicleId: string | null;
  licenseNumber: string;
  status: 'pending' | 'approved' | 'suspended';
  rating: number;
  totalRides: number;
  createdAt: Date;
  averageRating: number;
  insuranceExpiry: Date | null;
  insuranceNumber: string | null;
  licenseExpiry: Date | null;
  vehicleColor: string | null;
  vehicleMake: string | null;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleType: string;
  vehicleYear: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationSubmittedAt: Date | null;
  isAvailable: boolean;
};

// Browser-safe driver queries using Supabase client
export const driverQueries = {
  // Get driver by user ID
  getByUserId: async (userId: string): Promise<Driver | null> => {
    try {
      console.log('Fetching driver for user ID:', userId);
      
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          return null;
        }
        console.error('Error fetching driver:', error);
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Transform from Supabase format to our app format
      return {
        id: data.id,
        userId: data.user_id,
        vehicleId: data.vehicle_id,
        licenseNumber: data.license_number,
        status: data.status as 'pending' | 'approved' | 'suspended',
        rating: data.rating,
        totalRides: data.total_rides,
        createdAt: new Date(data.created_at),
        averageRating: data.average_rating,
        insuranceExpiry: data.insurance_expiry ? new Date(data.insurance_expiry) : null,
        insuranceNumber: data.insurance_number,
        licenseExpiry: data.license_expiry ? new Date(data.license_expiry) : null,
        vehicleColor: data.vehicle_color,
        vehicleMake: data.vehicle_make,
        vehicleModel: data.vehicle_model,
        vehiclePlate: data.vehicle_plate,
        vehicleType: data.vehicle_type,
        vehicleYear: data.vehicle_year,
        verificationStatus: data.verification_status as 'pending' | 'approved' | 'rejected',
        verificationSubmittedAt: data.verification_submitted_at ? new Date(data.verification_submitted_at) : null,
        isAvailable: data.is_available
      };
    } catch (error) {
      console.error('Error in getByUserId:', error);
      throw error;
    }
  },
  
  // Create a new driver
  create: async (userId: string, data: Partial<Driver> = {}): Promise<Driver> => {
    try {
      const now = new Date().toISOString();
      
      const { data: newDriver, error } = await supabase
        .from('drivers')
        .insert([{
          user_id: userId,
          license_number: data.licenseNumber || 'PENDING',
          vehicle_model: data.vehicleModel || 'PENDING',
          vehicle_plate: data.vehiclePlate || 'PENDING',
          vehicle_type: data.vehicleType || 'Car',
          vehicle_year: data.vehicleYear || new Date().getFullYear().toString(),
          vehicle_make: data.vehicleMake || null,
          vehicle_color: data.vehicleColor || null,
          status: 'pending',
          verification_status: 'pending',
          is_available: false,
          created_at: now,
          verification_submitted_at: null
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating driver:', error);
        throw error;
      }
      
      if (!newDriver) {
        throw new Error('Failed to create driver');
      }
      
      // Transform to our app format
      return {
        id: newDriver.id,
        userId: newDriver.user_id,
        vehicleId: newDriver.vehicle_id,
        licenseNumber: newDriver.license_number,
        status: newDriver.status as 'pending' | 'approved' | 'suspended',
        rating: newDriver.rating,
        totalRides: newDriver.total_rides,
        createdAt: new Date(newDriver.created_at),
        averageRating: newDriver.average_rating,
        insuranceExpiry: newDriver.insurance_expiry ? new Date(newDriver.insurance_expiry) : null,
        insuranceNumber: newDriver.insurance_number,
        licenseExpiry: newDriver.license_expiry ? new Date(newDriver.license_expiry) : null,
        vehicleColor: newDriver.vehicle_color,
        vehicleMake: newDriver.vehicle_make,
        vehicleModel: newDriver.vehicle_model,
        vehiclePlate: newDriver.vehicle_plate,
        vehicleType: newDriver.vehicle_type,
        vehicleYear: newDriver.vehicle_year,
        verificationStatus: newDriver.verification_status as 'pending' | 'approved' | 'rejected',
        verificationSubmittedAt: newDriver.verification_submitted_at ? new Date(newDriver.verification_submitted_at) : null,
        isAvailable: newDriver.is_available
      };
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  },
  
  // Update driver information
  update: async (driverId: string, data: Partial<Driver>): Promise<Driver> => {
    try {
      // Convert our app format to Supabase format
      const updateData: Record<string, any> = {};
      
      if (data.licenseNumber !== undefined) updateData.license_number = data.licenseNumber;
      if (data.vehicleMake !== undefined) updateData.vehicle_make = data.vehicleMake;
      if (data.vehicleModel !== undefined) updateData.vehicle_model = data.vehicleModel;
      if (data.vehicleYear !== undefined) updateData.vehicle_year = data.vehicleYear;
      if (data.vehicleColor !== undefined) updateData.vehicle_color = data.vehicleColor;
      if (data.vehiclePlate !== undefined) updateData.vehicle_plate = data.vehiclePlate;
      if (data.vehicleType !== undefined) updateData.vehicle_type = data.vehicleType;
      if (data.insuranceNumber !== undefined) updateData.insurance_number = data.insuranceNumber;
      if (data.insuranceExpiry !== undefined) updateData.insurance_expiry = data.insuranceExpiry?.toISOString().split('T')[0];
      if (data.licenseExpiry !== undefined) updateData.license_expiry = data.licenseExpiry?.toISOString().split('T')[0];
      if (data.verificationStatus !== undefined) {
        updateData.verification_status = data.verificationStatus;
        updateData.verification_submitted_at = new Date().toISOString();
      }
      
      const { data: updatedDriver, error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating driver:', error);
        throw error;
      }
      
      if (!updatedDriver) {
        throw new Error('Failed to update driver');
      }
      
      // Transform back to our app format
      return {
        id: updatedDriver.id,
        userId: updatedDriver.user_id,
        vehicleId: updatedDriver.vehicle_id,
        licenseNumber: updatedDriver.license_number,
        status: updatedDriver.status as 'pending' | 'approved' | 'suspended',
        rating: updatedDriver.rating,
        totalRides: updatedDriver.total_rides,
        createdAt: new Date(updatedDriver.created_at),
        averageRating: updatedDriver.average_rating,
        insuranceExpiry: updatedDriver.insurance_expiry ? new Date(updatedDriver.insurance_expiry) : null,
        insuranceNumber: updatedDriver.insurance_number,
        licenseExpiry: updatedDriver.license_expiry ? new Date(updatedDriver.license_expiry) : null,
        vehicleColor: updatedDriver.vehicle_color,
        vehicleMake: updatedDriver.vehicle_make,
        vehicleModel: updatedDriver.vehicle_model,
        vehiclePlate: updatedDriver.vehicle_plate,
        vehicleType: updatedDriver.vehicle_type,
        vehicleYear: updatedDriver.vehicle_year,
        verificationStatus: updatedDriver.verification_status as 'pending' | 'approved' | 'rejected',
        verificationSubmittedAt: updatedDriver.verification_submitted_at ? new Date(updatedDriver.verification_submitted_at) : null,
        isAvailable: updatedDriver.is_available
      };
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  },
  
  // Update driver availability
  updateAvailability: async (driverId: string, isAvailable: boolean): Promise<Driver> => {
    try {
      const { data: updatedDriver, error } = await supabase
        .from('drivers')
        .update({
          is_available: isAvailable
        })
        .eq('id', driverId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating driver availability:', error);
        throw error;
      }
      
      if (!updatedDriver) {
        throw new Error('Failed to update driver availability');
      }
      
      // Transform to our app format
      return {
        id: updatedDriver.id,
        userId: updatedDriver.user_id,
        vehicleId: updatedDriver.vehicle_id,
        licenseNumber: updatedDriver.license_number,
        status: updatedDriver.status as 'pending' | 'approved' | 'suspended',
        rating: updatedDriver.rating,
        totalRides: updatedDriver.total_rides,
        createdAt: new Date(updatedDriver.created_at),
        averageRating: updatedDriver.average_rating,
        insuranceExpiry: updatedDriver.insurance_expiry ? new Date(updatedDriver.insurance_expiry) : null,
        insuranceNumber: updatedDriver.insurance_number,
        licenseExpiry: updatedDriver.license_expiry ? new Date(updatedDriver.license_expiry) : null,
        vehicleColor: updatedDriver.vehicle_color,
        vehicleMake: updatedDriver.vehicle_make,
        vehicleModel: updatedDriver.vehicle_model,
        vehiclePlate: updatedDriver.vehicle_plate,
        vehicleType: updatedDriver.vehicle_type,
        vehicleYear: updatedDriver.vehicle_year,
        verificationStatus: updatedDriver.verification_status as 'pending' | 'approved' | 'rejected',
        verificationSubmittedAt: updatedDriver.verification_submitted_at ? new Date(updatedDriver.verification_submitted_at) : null,
        isAvailable: updatedDriver.is_available
      };
    } catch (error) {
      console.error('Error in updateAvailability:', error);
      throw error;
    }
  },
  
  // Submit driver verification documents
  submitVerification: async (driverId: string, data: {
    licenseNumber: string;
    licenseExpiry?: Date;
    vehicleMake?: string;
    vehicleModel: string;
    vehicleYear: string;
    vehiclePlate: string;
    vehicleColor?: string;
    vehicleType: string;
    insuranceNumber?: string;
    insuranceExpiry?: Date;
    licenseUrl?: string;
    vehicleUrl?: string;
    insuranceUrl?: string;
  }): Promise<Driver> => {
    try {
      const now = new Date().toISOString();
      
      // Convert our app format to Supabase format
      const updateData: Record<string, any> = {
        license_number: data.licenseNumber,
        vehicle_model: data.vehicleModel,
        vehicle_year: data.vehicleYear,
        vehicle_plate: data.vehiclePlate,
        vehicle_type: data.vehicleType,
        verification_status: 'pending',
        verification_submitted_at: now
      };
      
      if (data.licenseExpiry) updateData.license_expiry = data.licenseExpiry.toISOString();
      if (data.vehicleMake) updateData.vehicle_make = data.vehicleMake;
      if (data.vehicleColor) updateData.vehicle_color = data.vehicleColor;
      if (data.insuranceNumber) updateData.insurance_number = data.insuranceNumber;
      if (data.insuranceExpiry) updateData.insurance_expiry = data.insuranceExpiry.toISOString();
      
      const { data: updatedDriver, error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverId)
        .select()
        .single();
      
      if (error) {
        console.error('Error submitting verification:', error);
        throw error;
      }
      
      if (!updatedDriver) {
        throw new Error('Failed to submit verification');
      }
      
      // Transform to our app format
      return {
        id: updatedDriver.id,
        userId: updatedDriver.user_id,
        vehicleId: updatedDriver.vehicle_id,
        licenseNumber: updatedDriver.license_number,
        status: updatedDriver.status as 'pending' | 'approved' | 'suspended',
        rating: updatedDriver.rating,
        totalRides: updatedDriver.total_rides,
        createdAt: new Date(updatedDriver.created_at),
        averageRating: updatedDriver.average_rating,
        insuranceExpiry: updatedDriver.insurance_expiry ? new Date(updatedDriver.insurance_expiry) : null,
        insuranceNumber: updatedDriver.insurance_number,
        licenseExpiry: updatedDriver.license_expiry ? new Date(updatedDriver.license_expiry) : null,
        vehicleColor: updatedDriver.vehicle_color,
        vehicleMake: updatedDriver.vehicle_make,
        vehicleModel: updatedDriver.vehicle_model,
        vehiclePlate: updatedDriver.vehicle_plate,
        vehicleType: updatedDriver.vehicle_type,
        vehicleYear: updatedDriver.vehicle_year,
        verificationStatus: updatedDriver.verification_status as 'pending' | 'approved' | 'rejected',
        verificationSubmittedAt: updatedDriver.verification_submitted_at ? new Date(updatedDriver.verification_submitted_at) : null,
        isAvailable: updatedDriver.is_available
      };
    } catch (error) {
      console.error('Error in submitVerification:', error);
      throw error;
    }
  }
};

// Helper function to get the current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};
