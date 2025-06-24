export type ValidOrderStatus = 'pending' | 'accepted' | 'en_route' | 'arrived' | 'picked_up' | 'delivered' | 'completed' | 'cancelled';

export interface StatusConfig {
  label: string;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'info';
  nextStatus?: ValidOrderStatus;
  nextLabel?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  service_id?: string;
  status: ValidOrderStatus;
  pickup_location: string;
  dropoff_location: string;
  estimated_price?: number;
  actual_price?: number;
  created_at: string;
  driver_id?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  metadata?: string;
  payment_method?: string;
  customer_name?: string;
  customer_phone?: string;
  price?: number;
}
