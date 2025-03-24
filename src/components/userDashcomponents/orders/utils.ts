import { Service, LocationValidationResult, ToastConfig, OrderFormErrors, OrderStatus, ServiceType } from './types';
import i18n from '../../../utils/i18n';
import { supabase } from '../../../utils/supabase';

/**
 * Validates the order form data
 */
export const validateOrderForm = (
  formData: {
    pickupLocation: string;
    destination: string;
    scheduledDate: string;
    scheduledTime: string;
    price: number;
    minPrice: number;
    paymentMethod: 'wallet' | 'cash' | 'card';
    walletBalance?: number;
  },
  hasDistance: boolean = false
): OrderFormErrors => {
  const errors: OrderFormErrors = {};
  const { t } = i18n;

  // Check if pickup location is provided
  if (!formData.pickupLocation) {
    errors.pickupLocation = t('form.errors.pickupRequired');
  }

  // Check if destination is provided
  if (!formData.destination) {
    errors.destination = t('form.errors.destinationRequired');
  }

  // Check if pickup and destination are the same
  if (formData.pickupLocation && formData.destination && formData.pickupLocation === formData.destination) {
    errors.sameAddress = t('form.errors.sameAddress');
  }

  // Get current date and time
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if scheduled date is provided and valid
  if (!formData.scheduledDate) {
    errors.scheduledDate = t('form.errors.dateRequired');
  } else {
    const selectedDate = new Date(formData.scheduledDate + 'T00:00:00');
    
    // Check if date is in the past (before today)
    if (selectedDate < today) {
      errors.scheduledDate = t('form.errors.pastDate');
    }
  }
  
  // Check if time is provided and valid
  if (!formData.scheduledTime) {
    errors.scheduledTime = t('form.errors.timeRequired');
  } else {
    // Validate time is within business hours (8am-8pm)
    const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
    if (hours < 8 || hours >= 20) {
      errors.scheduledTime = t('form.errors.businessHours');
    }
    
    // Check if the date and time combined is in the past or too close to current time
    if (formData.scheduledDate && !errors.scheduledDate) {
      // Create a date object with the selected date and time
      const [year, month, day] = formData.scheduledDate.split('-').map(Number);
      
      // Note: month is 0-indexed in JavaScript Date
      const scheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      
      // Create a buffer time (current time + 15 minutes)
      const bufferTime = new Date(now.getTime() + 15 * 60000);
      
      if (scheduledDateTime < bufferTime) {
        errors.scheduledTime = t('form.errors.pastDateTime');
      }
    }
  }

  // Check if price is provided and valid
  if (!formData.price || isNaN(formData.price) || formData.price <= 0) {
    errors.price = t('form.errors.invalidPrice');
  } else if (formData.price < formData.minPrice) {
    errors.price = `${t('form.errors.minPrice')} ${formData.minPrice}€`;
  }

  // Check if distance calculation has been performed if both pickup and destination are provided
  if (!hasDistance && formData.pickupLocation && formData.destination && formData.pickupLocation !== formData.destination) {
    errors.distance = t('form.errors.distanceRequired');
  }

  // Validate payment method
  if (formData.paymentMethod === 'wallet' && formData.walletBalance !== undefined && formData.walletBalance < formData.price) {
    errors.insufficientFunds = t('price.insufficientFunds');
  }

  return errors;
};

/**
 * Calculates the price based on distance and service
 */
export const calculatePrice = (distanceInKm: number, service: Service): number => {
  const baseRate = getBaseRate(service);
  const ratePerKm = getRatePerKm(service);
  
  // Calculate the price: base rate + (distance * rate per km)
  const calculatedPrice = baseRate + (distanceInKm * ratePerKm);
  
  // Round to 2 decimal places and ensure it's at least the minimum price
  const roundedPrice = Math.max(Math.round(calculatedPrice * 100) / 100, service.minPrice);
  
  return roundedPrice;
};

/**
 * Gets the base rate for a service
 */
const getBaseRate = (service: Service): number => {
  // Base rates for different service types in euros
  switch (service.type) {
    case ServiceType.CARPOOLING:
      return 2.50;
    case ServiceType.SHOPPING:
      return 5.00;
    case ServiceType.LARGE_ITEMS:
      return 8.00;
    default:
      return 2.50; // Default base rate
  }
};

/**
 * Gets the rate per kilometer for a service
 */
const getRatePerKm = (service: Service): number => {
  // Rates per kilometer for different service types in euros
  switch (service.type) {
    case ServiceType.CARPOOLING:
      return 0.40;
    case ServiceType.SHOPPING:
      return 0.50;
    case ServiceType.LARGE_ITEMS:
      return 0.70;
    default:
      return 0.40; // Default rate per km
  }
};

/**
 * Formats the distance for display
 */
export const formatDistanceDisplay = (distanceInMeters: number): string => {
  if (distanceInMeters >= 1000) {
    const distanceInKm = distanceInMeters / 1000;
    return `${distanceInKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceInMeters)} m`;
};

export const validateFrenchAddress = (address: string): LocationValidationResult => {
  if (!address) {
    return {
      isValid: false,
      error: 'L\'adresse est requise'
    };
  }

  const isFrenchAddress = 
    address.toLowerCase().includes('france') ||
    /\b\d{5}\b/.test(address); // French postal code format

  if (!isFrenchAddress) {
    return {
      isValid: false,
      error: 'L\'adresse doit être en France'
    };
  }

  return { isValid: true };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getToastConfig = (type: 'success' | 'error'): ToastConfig => ({
  style: {
    background: '#1a1b1e',
    color: '#e2e2e2',
    borderRadius: '0.5rem',
    border: `1px solid ${type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
  },
  duration: type === 'success' ? 3000 : 4000,
  iconTheme: {
    primary: type === 'success' ? '#FF7C58' : '#ef4444',
    secondary: '#1a1b1e'
  }
});

/**
 * Returns styling configuration for order status
 */
export const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case OrderStatus.PENDING:
      return {
        bgClass: 'bg-sunset/10 dark:bg-sunset/20',
        textClass: 'text-sunset dark:text-sunset'
      };
    case OrderStatus.ACTIVE:
      return {
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        textClass: 'text-green-700 dark:text-green-400'
      };
    case OrderStatus.IN_TRANSIT:
      return {
        bgClass: 'bg-purple-100 dark:bg-purple-900/30',
        textClass: 'text-purple-700 dark:text-purple-400'
      };
    case OrderStatus.COMPLETED:
      return {
        bgClass: 'bg-teal-100 dark:bg-teal-900/30',
        textClass: 'text-teal-700 dark:text-teal-400'
      };
    case OrderStatus.CANCELLED:
      return {
        bgClass: 'bg-red-100 dark:bg-red-900/30',
        textClass: 'text-red-700 dark:text-red-400'
      };
    default:
      return {
        bgClass: 'bg-gray-100 dark:bg-gray-800/50',
        textClass: 'text-gray-700 dark:text-gray-400'
      };
  }
};

/**
 * Order form data interface
 */
export interface OrderFormData {
  serviceType?: string;
  description?: string;
  imageUrl?: string;
  price: number;
  paymentMethod?: 'wallet' | 'cash' | 'card';
  estimatedTime?: string;
  walletBalance?: number;
  pickupLocation: string;
  destination: string;
  scheduledDate: string;
  scheduledTime: string;
}

/**
 * Order result interface
 */
export interface OrderResult {
  success: boolean;
  error?: string;
  order?: {
    id: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
  };
}

/**
 * Submit order to Supabase database
 * @param formData The form data or order data object
 * @param userId Optional user ID (only needed for form data)
 * @returns Promise with order result
 */
export async function submitOrder(
  data: OrderFormData | {
    user_id: string;
    service_id: string;
    status: string;
    pickup_location: string;
    dropoff_location: string;
    estimated_price: number;
    payment_method: 'wallet' | 'cash';
  }, 
  userId?: string
): Promise<OrderResult> {
  console.log("Submitting order with data:", data);
  
  try {
    let orderData;
    
    // Check if we're dealing with form data or direct order data
    if ('pickupLocation' in data) {
      // It's form data, convert it to database format
      if (!userId) {
        throw new Error('User ID is required when submitting form data');
      }
      
      // Original implementation for form data
      const formData = data as OrderFormData;
      
      // Implementation details as before...
      // Format order data for database
      const price = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
      
      orderData = {
        user_id: userId,
        status: 'pending',
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.destination,
        scheduled_date: formData.scheduledDate,
        scheduled_time: formData.scheduledTime,
        estimated_price: price,
        payment_method: formData.paymentMethod || 'cash',
      };
    } else {
      // It's already formatted order data, use as is
      orderData = data;
    }
    
    // Insert the order
    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert([orderData])
      .select();
    
    if (error) {
      console.error("Order creation error:", error);
      throw error;
    }

    return { 
      success: true, 
      order: newOrder?.[0] ? {
        id: newOrder[0].id,
        status: newOrder[0].status,
        paymentStatus: 'completed',
        createdAt: newOrder[0].created_at
      } : undefined 
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}