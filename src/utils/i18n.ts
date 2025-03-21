import i18n from 'i18next';
import { InitOptions, Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

interface IpApiResponse {
  country: string;
  error?: boolean;
}

interface TimeTranslations {
  minutes: string;
  hours: string;
  days: string;
  minutes_plural?: string;
  hours_plural?: string;
  days_plural?: string;
}

interface Resources {
  en: {
    translation: {
      common: {
        search: string;
        notifications: string;
        viewAll: string;
        loading: string;
        error: string;
        success: string;
        close: string;
        retry: string;
        frenchAddressOnly: string;
      };

      nav: {
        dashboard: string;
        orders: string;
        settings: string;
        help: string;
        placeOrder: string;
      };

      services: {
        selectTitle: string;
        selectDescription: string;
        defaultFeature1: string;
        defaultFeature2: string;
        carpooling: {
          title: string;
          description: string;
          baseRate: string;
          features: string[];
        };
        shopping: {
          title: string;
          description: string;
          baseRate: string;
          features: string[];
        };
        largeItems: {
          title: string;
          description: string;
          baseRate: string;
          features: string[];
        };
      };

      location: {
        franceOnly: string;
        currentLocation: string;
        addressPlaceholder: string;
        required: string;
        notFrenchAddress: string;
        invalidPostalCode: string;
        invalidPostalCodeRange: string;
        streetLevelRequired: string;
        invalidAddress: string;
        validationError: string;
        searchingLocation: string;
        locationError: string;
        pickup: string;
        destination: string;
        distanceError: string;
        sameAddressError: string;
        bothAddressesRequired: string;
        noRouteFound: string;
        noSuggestions: string;
      };

      form: {
        pickupLocation: string;
        destination: string;
        scheduledDate: string;
        scheduledTime: string;
        price: string;
        submit: string;
        submitting: string;
        cancel: string;
        calculating: string;
        create: string;
        update: string;
        errors: {
          pickupRequired: string;
          destinationRequired: string;
          sameAddress: string;
          dateRequired: string;
          timeRequired: string;
          pastDate: string;
          pastDateTime: string;
          businessHours: string;
          invalidPrice: string;
          minPrice: string;
          distanceRequired: string;
        };
      };

      orders: {
        viewOrder: string;
        newOrder: string;
        noOrders: string;
        upcomingOrders: string;
        pastOrders: string;
        orderDetails: string;
        orderStatus: string;
        orderDate: string;
        orderTotal: string;
        orderService: string;
        orderPickup: string;
        orderDestination: string;
        orderDistance: string;
        orderDuration: string;
        orderSchedule: string;
        cancelOrder: string;
        rateOrder: string;
        helpTitle: string;
        helpText: string;
        confirmCancel: string;
        cancelling: string;
        cancelSuccess: string;
        cancelError: string;
        orderId: string;
        createdAt: string;
        estimatedPrice: string;
        status: {
          title: string;
          pending: string;
          accepted: string;
          active: string;
          completed: string;
          cancelled: string;
          in_transit: string;
          unknown: string;
        };
        creating: string;
        create: string;
        empty: string;
        emptyMessage: string;
        createFirst: string;
        details: string;
        loadError: string;
        createSuccess: string;
        createError: string;
        title: string;
        date: string;
        service: string;
        actions: string;
        selectService: string;
      };

      price: {
        baseRate: string;
        minimum: string;
        total: string;
        distance: string;
        duration: string;
        breakdown: string;
        distanceRate: string;
        baseFee: string;
        serviceCharge: string;
      };

      settings: {
        title: string;
        account: string;
        profile: string;
        preferences: string;
        language: string;
        notifications: string;
        privacy: string;
        security: string;
        payment: string;
        logout: string;
      };

      errors: {
        general: string;
        network: string;
        auth: string;
        server: string;
        notFound: string;
        permission: string;
      };

      dates: {
        today: string;
        tomorrow: string;
        yesterday: string;
        days: string[];
        months: string[];
        time: TimeTranslations;
      };

      tracking: {
        title: string;
        subtitle: string;
        noOrders: string;
        noOrdersMessage: string;
        activeOrders: string;
        driverInfo: string;
        driverLocation: string;
        driver: string;
        orderDetails: string;
        deliveryStatus: string;
        orderAccepted: string;
        driverAssigned: string;
        inTransit: string;
        itemInTransit: string;
        waitingPickup: string;
        selectOrder: string;
        selectOrderMessage: string;
      };
    };
  };
  fr: {
    translation: {
      // French translations structure mirrors English
    };
  };
}

// Define resources with translations
const resources: Resources = {
  en: {
    translation: {
      common: {
        search: "Search",
        notifications: "Notifications",
        viewAll: "View all",
        loading: "Loading...",
        error: "Error",
        success: "Success",
        close: "Close",
        retry: "Retry",
        frenchAddressOnly: "French addresses only",
      },
      nav: {
        dashboard: "Dashboard",
        orders: "Orders",
        settings: "Settings",
        help: "Help",
        placeOrder: "Place Order",
      },
      services: {
        selectTitle: "Select a Service",
        selectDescription: "Choose the service that best fits your needs",
        defaultFeature1: "Service available 7 days a week",
        defaultFeature2: "Secure payment options",
        carpooling: {
          title: "Carpooling",
          description: "Eco-friendly shared rides for passengers",
          baseRate: "€0.50/km",
          features: [
            "Shared rides with up to 3 passengers",
            "Pick-up and drop-off points",
            "Real-time tracking",
            "Eco-friendly option"
          ]
        },
        shopping: {
          title: "Shopping Delivery",
          description: "Get your groceries and purchases delivered",
          baseRate: "€0.75/km",
          features: [
            "Same-day delivery possible",
            "Temperature-controlled options",
            "Careful handling of delicate items",
            "Delivery confirmation"
          ]
        },
        largeItems: {
          title: "Large Item Delivery",
          description: "Transport for furniture and bulky items",
          baseRate: "€1.00/km",
          features: [
            "Professional handling",
            "Specialized vehicles",
            "Assembly/disassembly assistance",
            "Insurance coverage"
          ]
        }
      },
      location: {
        franceOnly: "Service available only in France",
        currentLocation: "Use my current location",
        addressPlaceholder: "Enter address",
        required: "Address is required",
        notFrenchAddress: "Please enter a valid French address",
        invalidPostalCode: "Invalid postal code format",
        invalidPostalCodeRange: "Postal code must be between 01000 and 95999, or 97100 and 98799",
        streetLevelRequired: "Please provide a complete street address",
        invalidAddress: "Invalid address. Please try again.",
        validationError: "Error validating address",
        searchingLocation: "Searching location...",
        locationError: "Failed to get location",
        pickup: "Pickup",
        destination: "Destination",
        distanceError: "Unable to calculate distance",
        sameAddressError: "Pickup and destination cannot be the same",
        bothAddressesRequired: "Both pickup and destination addresses are required",
        noRouteFound: "No route found between these locations",
        noSuggestions: "No suggestions found",
      },
      form: {
        pickupLocation: "Pickup Location",
        destination: "Destination",
        scheduledDate: "Date",
        scheduledTime: "Time",
        price: "Price",
        submit: "Submit Order",
        submitting: "Processing...",
        cancel: "Cancel",
        calculating: "Calculating distance...",
        create: "Create",
        update: "Update",
        errors: {
          pickupRequired: "Pickup location is required",
          destinationRequired: "Destination is required",
          sameAddress: "Pickup and destination cannot be the same",
          dateRequired: "Date is required",
          timeRequired: "Time is required",
          pastDate: "Date cannot be in the past",
          pastDateTime: "Please schedule at least 15 minutes in advance",
          businessHours: "Service is available between 8:00 AM and 8:00 PM only",
          invalidPrice: "Invalid price",
          minPrice: "Minimum price is",
          distanceRequired: "Distance calculation is required",
        }
      },
      orders: {
        viewOrder: "Order Details: {{service}}",
        newOrder: "New {{service}} Order",
        noOrders: "You haven't placed any orders yet",
        upcomingOrders: "Upcoming Orders",
        pastOrders: "Past Orders",
        orderDetails: "Order Details",
        orderStatus: "Status",
        orderDate: "Date",
        orderTotal: "Total",
        orderService: "Service",
        orderPickup: "Pickup",
        orderDestination: "Destination",
        orderDistance: "Distance",
        orderDuration: "Estimated Duration",
        orderSchedule: "Scheduled For",
        cancelOrder: "Cancel Order",
        rateOrder: "Rate Order",
        helpTitle: "Need Help?",
        helpText: "Contact our support team for assistance with your order",
        confirmCancel: "Are you sure you want to cancel this order? This action cannot be undone.",
        cancelling: "Cancelling your order...",
        cancelSuccess: "Order cancelled successfully",
        cancelError: "Failed to cancel order. Please try again later.",
        orderId: "Order ID",
        createdAt: "Created At",
        estimatedPrice: "Estimated Price",
        status: {
          title: "Status",
          pending: "Pending",
          accepted: "Accepted",
          active: "Active",
          completed: "Completed",
          cancelled: "Cancelled",
          in_transit: "In Transit",
          unknown: "Unknown"
        },
        creating: "Creating order...",
        create: "Create",
        empty: "No orders found",
        emptyMessage: "You haven't placed any orders yet",
        createFirst: "Create your first order",
        details: "Details",
        loadError: "Error loading orders",
        createSuccess: "Order created successfully",
        createError: "Failed to create order",
        title: "Orders",
        date: "Date",
        service: "Service",
        actions: "Actions",
        selectService: "Select Service"
      },
      price: {
        baseRate: "Base Rate",
        minimum: "Minimum",
        total: "Total",
        distance: "Distance",
        duration: "Est. Duration",
        breakdown: "Price Breakdown",
        distanceRate: "Distance Rate",
        baseFee: "Base Fee",
        serviceCharge: "Service Charge",
      },
      settings: {
        title: "Settings",
        account: "Account",
        profile: "Profile",
        preferences: "Preferences",
        language: "Language",
        notifications: "Notifications",
        privacy: "Privacy",
        security: "Security",
        payment: "Payment Methods",
        logout: "Log Out",
      },
      errors: {
        general: "Something went wrong",
        network: "Network error. Please check your connection",
        auth: "Authentication error",
        server: "Server error. Please try again later",
        notFound: "Not found",
        permission: "You don't have permission to access this",
      },
      dates: {
        today: "Today",
        tomorrow: "Tomorrow",
        yesterday: "Yesterday",
        days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        time: {
          minutes: "{{count}} minute",
          minutes_plural: "{{count}} minutes",
          hours: "{{count}} hour",
          hours_plural: "{{count}} hours",
          days: "{{count}} day",
          days_plural: "{{count}} days",
        }
      },
      tracking: {
        title: "Tracking",
        subtitle: "Track your orders and deliveries",
        noOrders: "No orders found",
        noOrdersMessage: "You haven't placed any orders yet",
        activeOrders: "Active Orders",
        driverInfo: "Driver Information",
        driverLocation: "Driver Location",
        driver: "Driver",
        orderDetails: "Order Details",
        deliveryStatus: "Delivery Status",
        orderAccepted: "Order Accepted",
        driverAssigned: "Driver Assigned",
        inTransit: "In Transit",
        itemInTransit: "Item in Transit",
        waitingPickup: "Waiting for Pickup",
        selectOrder: "Select Order",
        selectOrderMessage: "Select an order to track"
      }
    }
  },
  fr: {
    translation: {
      // French translations will stay the same
    }
  }
};

// Function to detect user's language based on location
export async function detectUserLanguage(): Promise<string> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json() as IpApiResponse;
    
    // For now we only support French and English
    // If the user is in France, return French, otherwise English
    return data.country === 'FR' ? 'fr' : 'en';
  } catch (error) {
    console.error('Error detecting user location:', error);
    return 'en'; // Default to English
  }
}

// Function to get location configuration
export function getLocationConfig(language: string = 'en') {
  return {
    country: "FR",
    language: language,
    region: "fr",
    types: ["street_address", "premise"],
    componentRestrictions: { country: "fr" },
  };
}

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: resources as unknown as Resource,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  } as InitOptions);

// Format currency in EUR
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format date in English format
export function formatDate(date: string): string {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

// Format date for input field
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Check if time is within business hours (8h-20h)
export function isBusinessHours(date: Date): boolean {
  const hours = date.getHours();
  return hours >= 8 && hours < 20;
}

// Format distance in kilometers or meters
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  } else {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  }
}

// Format duration in hours and minutes
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  } else {
    return `${minutes} min`;
  }
}

export default i18n;