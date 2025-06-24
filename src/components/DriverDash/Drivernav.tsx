import { useState, useEffect } from 'react';
import { Bell, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface DriverNavProps {
  driverId: string;
  documentStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

export default function Drivernav({ driverId, documentStatus }: DriverNavProps): JSX.Element {

  const [notifications, setNotifications] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('driver_notifications')
          .select('id')
          .eq('driver_id', driverId)
          .eq('read', false);

        if (error) throw error;
        if (data) setNotifications(data.length);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();

    // Subscribe to notifications
    const notificationChannel = supabase.channel('driver_notifications');
    notificationChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_notifications',
          filter: `driver_id=eq.${driverId}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [driverId]);

  return (
    <nav className="bg-white shadow-lg p-4 fixed top-0 right-0 left-64 z-10 flex justify-between items-center text-black">
      <div className="flex items-center space-x-4">
        {documentStatus === 'approved' ? (
          <span className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Verified Driver</span>
          </span>
        ) : documentStatus === 'pending' ? (
          <span className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-sm">
            <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Verification Pending</span>
          </span>
        ) : (
          <span className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1.5 rounded-full text-sm">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Not Verified</span>
          </span>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-full">
          <Bell className="h-5 w-5" />
          {notifications > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <User className="h-5 w-5" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2">
              <button
                onClick={() => {
                  /* Handle profile click */
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  /* Handle settings click */
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
