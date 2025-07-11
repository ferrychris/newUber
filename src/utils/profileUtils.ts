import { supabase } from './supabaseClient';

export interface ProfileData {
  id: string;
  full_name?: string;
  phone?: string;
  phone_number?: string; // Fallback field
  profile_image?: string;
  email?: string;
  vehicle_type?: string;
  role?: string;
}

/**
 * Fetches a user profile from the profiles table
 * @param userId The ID of the user to fetch
 * @returns The profile data or null if not found
 */
export const fetchUserProfile = async (userId: string): Promise<ProfileData | null> => {
  if (!userId) {
    console.warn('fetchUserProfile called with empty userId');
    return null;
  }

  try {
    console.log(`Fetching profile for user ID: ${userId}`);
    
    // Try a direct query to the database with explicit ID match
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, profile_image, vehicle_type, role')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileError) {
      console.error('Error fetching from profiles table:', profileError);
      // Return a minimal profile with just the ID and a default name
      return { id: userId, full_name: `User ${userId.substring(0, 8)}` };
    } 
    
    if (profileData) {
      console.log('Profile found with full_name:', profileData.full_name);
      return profileData;
    }
    
    // If we get here, no profile was found
    console.log('No profile found for user ID:', userId);
    
    // Return a minimal profile with just the ID and a default name
    return { id: userId, full_name: `User ${userId.substring(0, 8)}` };
  } catch (err) {
    console.error('Exception in fetchUserProfile:', err);
    // Return a minimal profile with just the ID and a default name
    return { id: userId, full_name: `User ${userId.substring(0, 8)}` };
  }
};

/**
 * Gets the best available phone number from a profile
 * @param profile The profile data
 * @returns The phone number or undefined if not available
 */
export const getProfilePhoneNumber = (profile: ProfileData | null): string | undefined => {
  if (!profile) return undefined;
  
  // Use the primary phone field if available
  if (profile.phone) return profile.phone;
  
  // Fall back to phone_number field if available
  if (profile.phone_number) return profile.phone_number;
  
  return undefined;
};

/**
 * Gets the display name from a profile
 * @param profile The profile data
 * @param fallbackName Optional fallback name if profile name is not available
 * @returns The best available name
 */
export const getProfileDisplayName = (
  profile: ProfileData | null, 
  fallbackName?: string
): string => {
  if (!profile) return fallbackName || 'Unknown User';
  
  if (profile.full_name) return profile.full_name;
  
  if (profile.email) {
    // Extract username from email
    const emailParts = profile.email.split('@');
    if (emailParts.length > 0) return emailParts[0];
  }
  
  // If we have a user ID but no name, show a generic name with ID
  if (profile.id) {
    const shortId = profile.id.substring(0, 8);
    return fallbackName || `User ${shortId}`;
  }
  
  return fallbackName || 'Unknown User';
};

/**
 * Fetches multiple user profiles at once
 * @param userIds Array of user IDs to fetch
 * @returns Object mapping user IDs to their profiles
 */
export const fetchMultipleProfiles = async (
  userIds: string[]
): Promise<Record<string, ProfileData>> => {
  if (!userIds.length) return {};
  
  // Filter out any empty IDs
  const validUserIds = userIds.filter(id => !!id);
  if (!validUserIds.length) return {};
  
  console.log(`Fetching profiles for ${validUserIds.length} users`);
  
  try {
    // Fetch from the profiles table with all fields
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*') // Select all fields to ensure we get everything
      .in('id', validUserIds);
      
    if (profilesError) {
      console.error('Error fetching multiple profiles:', profilesError);
    }
    
    // Convert array to map for easy lookup
    const profileMap: Record<string, ProfileData> = {};
    profilesData?.forEach(profile => {
      if (profile && profile.id) {
        console.log(`Found profile for ${profile.id} with name: ${profile.full_name || 'undefined'}`);
        profileMap[profile.id] = profile;
      }
    });
    
    // For any missing profiles, create minimal profiles with user IDs and default names
    const missingIds = validUserIds.filter(id => !profileMap[id]);
    if (missingIds.length > 0) {
      console.log(`Creating minimal profiles for ${missingIds.length} missing users`);
      
      for (const id of missingIds) {
        // Create a minimal profile with a default name based on the ID
        profileMap[id] = { 
          id, 
          full_name: `User ${id.substring(0, 8)}` 
        };
      }
    }
    
    return profileMap;
  } catch (err) {
    console.error('Exception in fetchMultipleProfiles:', err);
    return {};
  }
};
