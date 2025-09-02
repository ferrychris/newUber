import { toast } from 'sonner';
import { shouldPlaySound, shouldShowToast } from './notificationPreferences';

// Function to play notification sound
export const playNotificationSound = () => {
  if (!shouldPlaySound()) return;
  
  try {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(error => {
      console.log('Audio play failed:', error);
    });
  } catch (error) {
    console.log('Failed to create audio:', error);
  }
};

// Function to show toast notification with sound
export const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  // Play notification sound if enabled
  if (shouldPlaySound()) {
    playNotificationSound();
  }
  
  // Show toast notification if enabled
  if (shouldShowToast()) {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'warning':
        toast.warn(message);
        break;
      default:
        toast.info(message);
        break;
    }
  }
};

// Function to check if a transaction is a top-up (deposit or earnings)
export const isTopUpTransaction = (transaction: { type: string }) => {
  return transaction.type === 'deposit' || transaction.type === 'earnings';
};

// Function to check if an order status change is significant
export const isSignificantOrderStatusChange = (oldStatus: string, newStatus: string) => {
  const significantStatuses = ['accepted', 'en_route', 'arrived', 'picked_up', 'delivered', 'cancelled'];
  return significantStatuses.includes(newStatus) && oldStatus !== newStatus;
};
