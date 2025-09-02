interface NotificationPreferences {
  walletNotifications: boolean;
  orderNotifications: boolean;
  messageNotifications: boolean;
  soundEnabled: boolean;
  toastEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  walletNotifications: true,
  orderNotifications: true,
  messageNotifications: true,
  soundEnabled: true,
  toastEnabled: true,
};

export const getNotificationPreferences = (): NotificationPreferences => {
  try {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Error loading notification preferences:', error);
  }
  return DEFAULT_PREFERENCES;
};

export const shouldShowNotification = (type: 'wallet' | 'order' | 'message'): boolean => {
  const preferences = getNotificationPreferences();
  
  switch (type) {
    case 'wallet':
      return preferences.walletNotifications;
    case 'order':
      return preferences.orderNotifications;
    case 'message':
      return preferences.messageNotifications;
    default:
      return true;
  }
};

export const shouldPlaySound = (): boolean => {
  const preferences = getNotificationPreferences();
  return preferences.soundEnabled;
};

export const shouldShowToast = (): boolean => {
  const preferences = getNotificationPreferences();
  return preferences.toastEnabled;
};
