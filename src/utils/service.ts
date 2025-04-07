import { IconType } from 'react-icons';
import { FaCar, FaShoppingBag, FaTruck } from 'react-icons/fa';
import type { ServiceType } from './types';

export interface Service {
  name: string;
  description: string;
  price: string;
  minPrice: string;
  features: string[];
  icon: IconType;
  href: string;
  theme: ServiceType;
}

export const services: Service[] = [
  {
    name: 'Carpooling',
    description: 'Economical and eco-friendly shared transport for your daily travels',
    price: '€0.50',
    minPrice: '€5',
    features: [
      'Shared trips',
      'Economic pricing',
      'Flexible booking'
    ],
    icon: FaCar,
    href: '/dashboard/place-order?service=carpooling',
    theme: 'carpooling'
  },
  {
    name: 'Shopping Delivery',
    description: 'Fast delivery service for your city purchases',
    price: '€0.75',
    minPrice: '€10',
    features: [
      'Express delivery',
      'Real-time tracking',
      'Purchase protection'
    ],
    icon: FaShoppingBag,
    href: '/dashboard/place-order?service=shopping',
    theme: 'shopping'
  },
  {
    name: 'Large Item Transport',
    description: 'Secure transport for your bulky items and furniture',
    price: '€1.00',
    minPrice: '€15',
    features: [
      'Bulky items',
      'Secure transport',
      'Insurance included'
    ],
    icon: FaTruck,
    href: '/dashboard/place-order?service=large-items',
    theme: 'large-items'
  }
] as const;

export function calculatePrice(distance: number, serviceType: ServiceType): number {
  const service = services.find(s => s.theme === serviceType);
  if (!service) throw new Error('Service not found');

  const pricePerKm = parseFloat(service.price.replace('€', ''));
  const minPrice = parseFloat(service.minPrice.replace('€', ''));
  
  const calculatedPrice = distance * pricePerKm;
  return Math.max(calculatedPrice, minPrice);
}

export function formatPrice(price: number): string {
  return '€' + price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function getServiceByType(type: ServiceType): Service {
  const service = services.find(s => s.theme === type);
  if (!service) throw new Error('Service not found');
  return service;
}