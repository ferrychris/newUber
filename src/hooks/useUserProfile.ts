import { useQuery } from "@tanstack/react-query";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";

export interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  email: string;
  created_at: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  
  const fetchUserProfile = async (): Promise<UserProfile | null> => {
    if (!user?.id) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, role, email, created_at')
      .eq('id', user.id)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error);
      throw new Error(error.message);
    }
    
    return data;
  };
  
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: fetchUserProfile,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (replaces cacheTime in v5)
  });
  
  return {
    userProfile,
    isLoading,
    error,
  };
}; 