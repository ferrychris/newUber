import { ReactElement, CSSProperties } from 'react';

export enum ServiceType {
  CARPOOLING = 'Carpooling',
  PARCELS = 'Parcels',
  SHOPPING = 'Shopping',
  MEALS = 'Meals',
  LARGE_ITEMS = 'Large Items'
}

export enum OrderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  IN_TRANSIT = 'in-transit',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Order {
  id: string;
  user_id: string;
  service_id: string;
  pickup_location: string;
  dropoff_location: string;
  status: OrderStatus;
  estimated_price: number;
  actual_price?: number;
  created_at: string;
  payment_method?: 'wallet' | 'cash';
  // Foreign key relationship with services table
  services?: {
    id: string;
    name: string;
    [key: string]: any;
  };
  driver_id?: string;
}

export interface Service {
  id: string;
  name: string;
  type: ServiceType;
  description: string;
  minPrice: number;
  image: string;
  icon?: ReactElement;
  baseRate?: number;
  theme: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface OrderFormData {
  pickupLocation: string;
  destination: string;
  scheduledDate: string;
  scheduledTime: string;
  price: number;
  serviceType: ServiceType;
  paymentMethod?: 'wallet' | 'cash' | 'card';
  walletBalance?: number;
  estimatedTime?: string;
}

export interface OrderFormErrors {
  pickupLocation?: string;
  destination?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  price?: string;
  sameAddress?: string;
  distance?: string;
  form?: string;
  insufficientFunds?: string;
  paymentError?: string;
  cardSetupError?: string;
  cardProcessingError?: string;
}

export interface ToastConfig {
  style?: CSSProperties;
  icon?: ReactElement;
  iconTheme?: {
    primary: string;
    secondary: string;
  };
  duration?: number;
}

export interface DistanceValue {
  text: string;
  value: number;
}

export interface DistanceResult {
  distance: DistanceValue;
  duration: DistanceValue;
}

export interface PriceInfoCardProps {
  distanceResult: DistanceResult;
  service: Service;
  price: number;
  walletBalance?: number;
  onPaymentMethodChange?: (method: 'wallet' | 'cash' | 'card') => void;
  selectedPaymentMethod?: 'wallet' | 'cash' | 'card';
}

export interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  text: string;
  place_type: string[];
  properties: {
    accuracy?: string;
    address?: string;
    category?: string;
    maki?: string;
    wikidata?: string;
  };
  context: Array<{
    id: string;
    text: string;
    wikidata?: string;
  }>;
}

export interface MapboxGeocodeResponse {
  type: string;
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export interface MapboxRouteResponse {
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: Array<[number, number]>;
      type: string;
    };
    weight: number;
    weight_name: string;
  }>;
  waypoints: Array<{
    distance: number;
    name: string;
    location: [number, number];
  }>;
  code: string;
  uuid: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  error?: string;
  formattedAddress?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

// Legacy types from old address API - keeping for reference
export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface AddressObject {
  address_components: AddressComponent[];
  formatted_address: string;
  place_id: string;
  postcode_localities?: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    location_type: string;
    viewport: {
      northeast: {
        lat: number;
        lng: number;
      };
      southwest: {
        lat: number;
        lng: number;
      };
    };
    bounds?: {
      northeast: {
        lat: number;
        lng: number;
      };
      southwest: {
        lat: number;
        lng: number;
      };
    };
  };
  partial_match?: boolean;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  oldcitycode?: string;
  district?: string;
}