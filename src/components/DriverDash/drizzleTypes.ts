// This file adapts our Drizzle schema types to work with existing components
import { schema } from '@/lib/db';

// Re-export the OrderAction and FileType from the original types
export type { OrderAction, FileType, DocumentFormData } from './types';

// Map Drizzle types to component props
export type DrizzleDriverProfile = schema.DriverProfile;
export type DrizzleOrder = schema.Order;

// Extended DriverProfile type with verifications
export type DriverProfile = {
  id: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  documentStatus: string | null;
  availability: string | null;
  licenseUrl: string | null;
  vehicleUrl: string | null;
  insuranceUrl: string | null;
  licenseNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: string | null;
  notes: string | null;
  verifications: Array<{
    id: number;
    driverId: string | null;
    status: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    adminNotes: string | null;
  }>;
};

// Type adapters for OrderList component
export const adaptOrderForComponent = (order: DrizzleOrder): any => {
  return {
    id: order.id,
    customer_id: order.customerId || '',
    driver_id: order.driverId,
    pickup_location: order.pickupAddress || '',
    dropoff_location: order.deliveryAddress || '',
    status: order.status || 'pending',
    created_at: order.createdAt?.toISOString() || new Date().toISOString(),
    price: 0, // Default price
    distance: 0, // Default distance
    estimated_time: Math.floor((order.estimatedDeliveryTime?.getTime() || 0) - (order.createdAt?.getTime() || 0)) / 60000 // Convert to minutes
  };
};

// Document status and driver availability types
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type DriverAvailability = 'available' | 'offline' | 'busy';

// Order status type
export type OrderStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'assigned';
