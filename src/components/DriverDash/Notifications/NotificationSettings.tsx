import React, { useState, useEffect } from 'react';
import { Settings, Volume2, VolumeX, Bell, BellOff, Save } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPreferences {
  walletNotifications: boolean;
  orderNotifications: boolean;
  messageNotifications: boolean;
  soundEnabled: boolean;
  toastEnabled: boolean;
}

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    walletNotifications: true,
    orderNotifications: true,
    messageNotifications: true,
    soundEnabled: true,
    toastEnabled: true,
  });

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(parsed);
      } catch (error) {
        console.error('Error parsing notification preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = () => {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    toast.success('Notification preferences saved!');
    onClose();
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-midnight-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-stone-700/20">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-600 dark:text-stone-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notification Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-stone-300"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Notification Types */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Notification Types
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700 dark:text-stone-300">
                    Wallet Notifications
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.walletNotifications}
                    onChange={(e) => updatePreference('walletNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-stone-300">
                    Order Notifications
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.orderNotifications}
                    onChange={(e) => updatePreference('orderNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-700 dark:text-stone-300">
                    Message Notifications
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.messageNotifications}
                    onChange={(e) => updatePreference('messageNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Notification Methods */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Notification Methods
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {preferences.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-blue-500" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-stone-300">
                    Sound Notifications
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.soundEnabled}
                    onChange={(e) => updatePreference('soundEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {preferences.toastEnabled ? (
                    <BellOff className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Bell className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-stone-300">
                    Toast Notifications
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.toastEnabled}
                    onChange={(e) => updatePreference('toastEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-stone-700/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-stone-300 hover:text-gray-800 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={savePreferences}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
