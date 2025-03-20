import { Service, LocationValidationResult, ToastConfig, OrderFormErrors } from './types';
import i18n from '../../../utils/i18n';

/**
 * Validates the order form data
 */
export const validateOrderForm = (
  pickupLocation: string,
  destination: string,
  scheduledDate: string,
  scheduledTime: string,
  price: number,
  minPrice: number,
  hasDistance: boolean = false
): OrderFormErrors => {
  const errors: OrderFormErrors = {};
  const { t } = i18n;

  // Check if pickup location is provided
  if (!pickupLocation) {
    errors.pickupLocation = t('form.errors.pickupRequired');
  }

  // Check if destination is provided
  if (!destination) {
    errors.destination = t('form.errors.destinationRequired');
  }

  // Check if pickup and destination are the same
  if (pickupLocation && destination && pickupLocation === destination) {
    errors.sameAddress = t('form.errors.sameAddress');
  }

  // Get current date and time
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if scheduled date is provided and valid
  if (!scheduledDate) {
    errors.scheduledDate = t('form.errors.dateRequired');
  } else {
    const selectedDate = new Date(scheduledDate + 'T00:00:00');
    
    // Check if date is in the past (before today)
    if (selectedDate < today) {
      errors.scheduledDate = t('form.errors.pastDate');
    }
  }
  
  // Check if time is provided and valid
  if (!scheduledTime) {
    errors.scheduledTime = t('form.errors.timeRequired');
  } else {
    // Validate time is within business hours (8am-8pm)
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    if (hours < 8 || hours >= 20) {
      errors.scheduledTime = t('form.errors.businessHours');
    }
    
    // Check if the date and time combined is in the past or too close to current time
    if (scheduledDate && !errors.scheduledDate) {
      // Create a date object with the selected date and time
      const [year, month, day] = scheduledDate.split('-').map(Number);
      
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
  if (!price || isNaN(price) || price <= 0) {
    errors.price = t('form.errors.invalidPrice');
  } else if (price < minPrice) {
    errors.price = `${t('form.errors.minPrice')} ${minPrice}€`;
  }

  // Check if distance calculation has been performed if both pickup and destination are provided
  if (!hasDistance && pickupLocation && destination && pickupLocation !== destination) {
    errors.distance = t('form.errors.distanceRequired');
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
    case 'carpooling':
      return 2.50;
    case 'shopping':
      return 5.00;
    case 'largeItem':
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
    case 'carpooling':
      return 0.40;
    case 'shopping':
      return 0.50;
    case 'largeItem':
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