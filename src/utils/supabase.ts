import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Les variables d'environnement Supabase sont manquantes. Veuillez vérifier votre fichier .env");
}

// Create a regular Supabase client with the anon key for user operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'daviduberrepo'
    }
  }
});

// Add session state listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase Auth State Changed:', {
    event,
    hasSession: !!session,
    sessionExpiry: session?.expires_at,
    timestamp: new Date().toISOString()
  });
});

// Create a function to get a fresh reference to the user's session
export async function getCurrentUser() {
  try {
    // First check for Supabase Auth session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current Session State:', {
      hasSession: !!session,
      sessionExpiry: session?.expires_at,
      timestamp: new Date().toISOString()
    });

    if (session?.user) {
      return session.user;
    }
    
    // Fall back to localStorage if no Supabase Auth session
    const userSessionString = localStorage.getItem('userSession');
    if (userSessionString) {
      try {
        const userSession = JSON.parse(userSessionString);
        if (userSession && userSession.id) {
          console.log('Using localStorage session:', {
            userId: userSession.id,
            timestamp: new Date().toISOString()
          });
          // Format to match Supabase User object structure
          return {
            id: userSession.id,
            email: userSession.email,
            user_metadata: {
              full_name: userSession.full_name,
              role: userSession.role
            },
            app_metadata: {
              provider: 'custom'
            }
          };
        }
      } catch (parseError) {
        console.error("Error parsing user session from localStorage:", parseError);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Helper function to check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

// Get the current user synchronously (for components that can't use async)
export function getCurrentUserSync() {
  try {
    // Check localStorage first as it's synchronous
    const userSessionString = localStorage.getItem('userSession');
    if (userSessionString) {
      try {
        const userSession = JSON.parse(userSessionString);
        if (userSession && userSession.id) {
          return {
            id: userSession.id,
            email: userSession.email,
            user_metadata: {
              full_name: userSession.full_name,
              role: userSession.role
            },
            app_metadata: {
              provider: 'custom'
            }
          };
        }
      } catch (parseError) {
        console.error("Error parsing user session from localStorage:", parseError);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting current user synchronously:", error);
    return null;
  }
}

// Manual logout function
export async function logout() {
  try {
    // Clear localStorage session
    localStorage.removeItem('userSession');
    
    // Also attempt to sign out from Supabase Auth
    await supabase.auth.signOut();
    
    return { success: true };
  } catch (error) {
    console.error("Error logging out:", error);
    return { success: false, error };
  }
}
