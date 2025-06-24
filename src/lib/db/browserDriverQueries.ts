import { supabase } from '../supabaseClient';

// Define types for browser usage
export type DriverProfile = {
  id: string;
  created_at: string;
  updated_at: string;
  document_status: string | null;
  availability: string | null;
  license_url: string | null;
  vehicle_url: string | null;
  insurance_url: string | null;
  license_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  notes: string | null;
  verifications: Array<DriverVerification>;
};

export type DriverVerification = {
  id: number;
  driver_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  admin_notes: string | null;
};

// Browser-safe driver profile queries using Supabase client
export const driverProfileQueries = {
  // Get driver profile by user ID
  getByUserId: async (userId: string): Promise<DriverProfile | null> => {
    try {
      console.log('Fetching driver profile for user ID:', userId);
      
      // Fetch driver profile
      const { data: profileData, error: profileError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching driver profile:', profileError);
        throw profileError;
      }
      
      if (!profileData) {
        return null;
      }
      
      // Fetch verifications
      const { data: verifications, error: verificationError } = await supabase
        .from('driver_verifications')
        .select('*')
        .eq('driver_id', userId);
      
      if (verificationError) {
        console.error('Error fetching verifications:', verificationError);
        throw verificationError;
      }
      
      // Return data directly since it matches our type
      return {
        id: profileData.id,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
        document_status: profileData.document_status,
        availability: profileData.availability,
        license_url: profileData.license_url,
        vehicle_url: profileData.vehicle_url,
        insurance_url: profileData.insurance_url,
        license_number: profileData.license_number,
        vehicle_make: profileData.vehicle_make,
        vehicle_model: profileData.vehicle_model,
        vehicle_year: profileData.vehicle_year,
        notes: profileData.notes,
        verifications: verifications ? verifications.map(v => ({
          id: v.id,
          driver_id: v.driver_id,
          status: v.status,
          created_at: v.created_at,
          updated_at: v.updated_at,
          admin_notes: v.admin_notes
        })) : []
      };
    } catch (error) {
      console.error('Error in getByUserId:', error);
      throw error;
    }
  },
  
  // Create a new driver profile
  create: async (userId: string): Promise<DriverProfile[]> => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('driver_profiles')
        .insert([{
          id: userId,
          created_at: now,
          updated_at: now,
          document_status: 'pending',
          availability: 'offline',
        }])
        .select();
      
      if (error) {
        console.error('Error creating driver profile:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('Failed to create driver profile');
      }
      
      // Return data directly since it matches our type
      return data.map(profile => ({
        id: profile.id,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        document_status: profile.document_status,
        availability: profile.availability,
        license_url: profile.license_url,
        vehicle_url: profile.vehicle_url,
        insurance_url: profile.insurance_url,
        license_number: profile.license_number,
        vehicle_make: profile.vehicle_make,
        vehicle_model: profile.vehicle_model,
        vehicle_year: profile.vehicle_year,
        notes: profile.notes,
        verifications: []
      }));
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  },
  
  // Update driver profile
  update: async (userId: string, data: any): Promise<DriverProfile[]> => {
    try {
      console.log('Updating driver profile for user ID:', userId, 'with data:', data);
      
      // Transform our app format to Supabase format
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      if (data.documentStatus !== undefined) updateData.document_status = data.documentStatus;
      if (data.availability !== undefined) updateData.availability = data.availability;
      if (data.licenseUrl !== undefined) updateData.license_url = data.licenseUrl;
      if (data.vehicleUrl !== undefined) updateData.vehicle_url = data.vehicleUrl;
      if (data.insuranceUrl !== undefined) updateData.insurance_url = data.insuranceUrl;
      if (data.licenseNumber !== undefined) updateData.license_number = data.licenseNumber;
      if (data.vehicleMake !== undefined) updateData.vehicle_make = data.vehicleMake;
      if (data.vehicleModel !== undefined) updateData.vehicle_model = data.vehicleModel;
      if (data.vehicleYear !== undefined) updateData.vehicle_year = data.vehicleYear;
      if (data.notes !== undefined) updateData.notes = data.notes;
      
      const { data: updatedData, error } = await supabase
        .from('driver_profiles')
        .update(updateData)
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Error updating driver profile:', error);
        throw error;
      }
      
      if (!updatedData || updatedData.length === 0) {
        throw new Error('Failed to update driver profile');
      }
      
      // Return data directly since it matches our type
      return updatedData.map(profile => ({
        id: profile.id,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        document_status: profile.document_status,
        availability: profile.availability,
        license_url: profile.license_url,
        vehicle_url: profile.vehicle_url,
        insurance_url: profile.insurance_url,
        license_number: profile.license_number,
        vehicle_make: profile.vehicle_make,
        vehicle_model: profile.vehicle_model,
        vehicle_year: profile.vehicle_year,
        notes: profile.notes,
        verifications: []
      }));
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  },
  
  // Update driver availability
  updateAvailability: async (userId: string, availability: 'available' | 'offline') => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update({
          availability,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Error updating driver availability:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateAvailability:', error);
      throw error;
    }
  }
};

// Browser-safe driver verification queries
export const driverVerificationQueries = {
  // Get verification by driver ID
  getByDriverId: async (driverId: string): Promise<DriverVerification | null> => {
    try {
      const { data: verifications, error } = await supabase
        .from('driver_verifications')
        .select('*')
        .eq('driver_id', driverId)
        .single();
      
      if (error) {
        console.error('Error fetching verification:', error);
        throw error;
      }
      
      if (!verifications) {
        return null;
      }
      
      return {
        id: verifications.id,
        driver_id: verifications.driver_id,
        status: verifications.status,
        created_at: verifications.created_at,
        updated_at: verifications.updated_at,
        admin_notes: verifications.admin_notes
      };
    } catch (error) {
      console.error('Error in getByDriverId:', error);
      throw error;
    }
  },
  
  // Create a new verification record
  create: async (driverId: string): Promise<DriverVerification[]> => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('driver_verifications')
        .insert([{
          driver_id: driverId,
          status: 'pending',
          created_at: now,
          updated_at: now
        }])
        .select();
      
      if (error) {
        console.error('Error creating verification:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('Failed to create verification');
      }
      
      return data.map(v => ({
        id: v.id,
        driver_id: v.driver_id,
        status: v.status,
        created_at: v.created_at,
        updated_at: v.updated_at,
        admin_notes: v.admin_notes
      }));
    } catch (error) {
      console.error('Error in create verification:', error);
      throw error;
    }
  },
  
  // Update verification status
  updateStatus: async (verificationId: number, status: string, adminNotes?: string): Promise<DriverVerification[]> => {
    try {
      const now = new Date().toISOString();
      
      const updateData: Record<string, any> = {
        status,
        updated_at: now
      };
      
      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
      }
      
      const { data, error } = await supabase
        .from('driver_verifications')
        .update(updateData)
        .eq('id', verificationId)
        .select();
      
      if (error) {
        console.error('Error updating verification:', error);
        throw error;
      }
      
      return data.map(v => ({
        id: v.id,
        driver_id: v.driver_id,
        status: v.status,
        created_at: v.created_at,
        updated_at: v.updated_at,
        admin_notes: v.admin_notes
      }));
    } catch (error) {
      console.error('Error in updateStatus:', error);
      throw error;
    }
  }
};

// Browser-safe driver queries
export const driverQueries = {
  // Create or update driver record
  createOrUpdate: async (data: { id: string, licenseNumber: string, vehicleType: string, vehicleYear: string }): Promise<any> => {
    try {
      // Check if driver exists
      const { data: existingDriver, error: fetchError } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', data.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking for existing driver:', fetchError);
        throw fetchError;
      }
      
      if (existingDriver) {
        // Update existing driver
        const { data: updatedDriver, error: updateError } = await supabase
          .from('drivers')
          .update({
            license_number: data.licenseNumber,
            vehicle_type: data.vehicleType,
            vehicle_year: data.vehicleYear,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
          .select();
        
        if (updateError) {
          console.error('Error updating driver:', updateError);
          throw updateError;
        }
        
        return updatedDriver;
      } else {
        // Create new driver
        const { data: newDriver, error: createError } = await supabase
          .from('drivers')
          .insert([{
            id: data.id,
            user_id: data.id,
            license_number: data.licenseNumber,
            vehicle_type: data.vehicleType,
            vehicle_year: data.vehicleYear,
            status: 'pending',
            is_available: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();
        
        if (createError) {
          console.error('Error creating driver:', createError);
          throw createError;
        }
        
        return newDriver;
      }
    } catch (error) {
      console.error('Error in createOrUpdate:', error);
      throw error;
    }
  }
};

// Browser-safe order queries
export const orderQueries = {
  // Get orders for a driver
  getByDriverId: async (driverId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', driverId);
      
      if (error) {
        console.error('Error fetching driver orders:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getByDriverId:', error);
      throw error;
    }
  },
  
  // Get pending orders (not assigned to any driver)
  getPendingOrders: async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .is('driver_id', null)
        .eq('status', 'pending');
      
      if (error) {
        console.error('Error fetching pending orders:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getPendingOrders:', error);
      throw error;
    }
  },
  
  // Update order status
  updateStatus: async (orderId: string, status: string, driverId?: string) => {
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (driverId !== undefined) {
        updateData.driver_id = driverId;
      }
      
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select();
      
      if (error) {
        console.error('Error updating order status:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateStatus:', error);
      throw error;
    }
  }
};

// Helper function to get the current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};
