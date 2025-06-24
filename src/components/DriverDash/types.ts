export type OrderAction = 'accept' | 'reject' | 'complete' | 'cancel';
export type OrderStatus = 'pending' | 'accepted' | 'delivered' | 'completed' | 'rejected' | 'cancelled' | 'en_route' | 'arrived' | 'picked_up';
export type FileType = 'license' | 'vehicle' | 'insurance';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface Order {
  id: string;
  status: OrderStatus;
  pickup_location: string;
  dropoff_location: string;
  price?: number;
  distance: number;
  estimated_time: number;
  created_at: string;
  customer_id: string;
  driver_id?: string;
  user_id?: string;
  delivery_confirmed?: boolean;
}

export interface VerificationRecord {
  id: string;
  driver_id: string;
  document_status: 'pending' | 'verified' | 'rejected';
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFormData {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehiclePlate: string;
  insuranceNumber: string;
  insuranceExpiry: string;
}

export interface DocumentFormProps {
  formData: DocumentFormData;
  files: Record<FileType, File | null>;
  onChange: (field: keyof DocumentFormData, value: string) => void;
  onUpload: (type: FileType, file: File) => Promise<void>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  verificationStatus: VerificationStatus;
}

export interface AvailabilityToggleProps {
  available: boolean;
  onToggle: () => Promise<void>;
  isToggling: boolean;
  isDisabled: boolean;
}

export interface OrderListProps {
  orders: Order[];
  onAction: (orderId: string, action: OrderAction) => Promise<void>;
  isLoading: boolean;
}

export interface SidebarProps {
  driverId: string;
  documentStatus: VerificationStatus;
  onShowDocumentForm: () => void;
}

export interface DatabaseDriver {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  license_number: string;
  license_expiry: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_color: string;
  vehicle_plate: string;
  insurance_number: string;
  insurance_expiry: string;
  verification_status: VerificationStatus;
  is_available: boolean;
  total_rides: number;
  average_rating: number;
}

export interface Driver {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  licenseNumber: string;
  licenseExpiry: Date;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehiclePlate: string;
  insuranceNumber: string;
  insuranceExpiry: Date;
  verificationStatus: VerificationStatus;
  isAvailable: boolean;
  totalRides: number;
  averageRating: number;
  walletBalance: number;
  totalOrders: number;
}

