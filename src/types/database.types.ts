export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  password: string;
  profile_image: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  type: 'car' | 'bike' | 'truck';
  brand: string | null;
  model: string | null;
  plate_number: string;
  color: string | null;
  capacity: number | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: 'Carpooling' | 'Parcels' | 'Shopping' | 'Meals' | 'Large Items';
  description: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  service_id: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  pickup_location: string;
  dropoff_location: string;
  estimated_price: number | null;
  actual_price: number | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  payment_method: 'card' | 'mobile_money' | 'cash';
  created_at: string;
}

export interface RatingReview {
  id: string;
  order_id: string;
  reviewer_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface AuthMetadata {
  full_name: string;
  phone: string | null;
  profile_image: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  last_updated: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'payment' | 'earnings';
  status: 'pending' | 'completed' | 'failed';
  reference: string | null;
  description: string | null;
  payment_method: 'stripe' | 'bank_transfer' | 'wallet' | null;
  metadata: Record<string, any> | null;
  created_at: string;
}
