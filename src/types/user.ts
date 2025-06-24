export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role?: 'customer' | 'driver' | 'admin';
  created_at?: string;
  updated_at?: string;
}
