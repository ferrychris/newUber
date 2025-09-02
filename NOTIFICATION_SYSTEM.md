# Driver Dashboard Notification System

## Overview
The notification system provides real-time alerts for drivers about wallet top-ups, order status changes, and new messages. It includes audio notifications, toast messages, and a comprehensive notification center with user preferences.

## Features

### 🔔 Real-time Notifications
- **Wallet Top-ups**: Automatic alerts when wallet is credited with earnings or deposits
- **Order Status Changes**: Notifications when order status changes (accepted, picked up, delivered, etc.)
- **New Messages**: Alerts for new support messages or customer communications

### 🎵 Audio & Visual Feedback
- **Sound Notifications**: Plays audio alert for important events
- **Toast Messages**: Visual popup notifications with details
- **Badge Counter**: Shows unread notification count on bell icon

### ⚙️ User Preferences
- **Notification Types**: Toggle wallet, order, and message notifications
- **Sound Control**: Enable/disable audio notifications
- **Toast Control**: Enable/disable visual toast messages
- **Persistent Settings**: Preferences saved in localStorage

## Components

### 1. NotificationCenter
**Location**: `src/components/DriverDash/Notifications/NotificationCenter.tsx`

Dropdown component showing all notifications with:
- Notification history with timestamps
- Mark as read functionality
- Settings access
- Responsive design with dark mode support

### 2. NotificationSettings
**Location**: `src/components/DriverDash/Notifications/NotificationSettings.tsx`

Modal for configuring notification preferences:
- Toggle notification types (wallet/order/message)
- Control sound and toast notifications
- Save settings to localStorage

### 3. useNotifications Hook
**Location**: `src/hooks/useNotifications.ts`

Custom hook managing notification state:
- Real-time Supabase subscriptions
- Notification counting and management
- Integration with user preferences

## Usage

### In DriverNavBar
The notification system is integrated into the driver navigation bar:

```tsx
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationCenter } from './Notifications/NotificationCenter';

const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

// Bell icon with badge
<button onClick={() => setNotificationOpen(!notificationOpen)}>
  <Bell size={20} />
  {unreadCount > 0 && (
    <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
  )}
</button>

// Notification dropdown
<NotificationCenter
  isOpen={notificationOpen}
  onClose={() => setNotificationOpen(false)}
  notifications={notifications}
  onMarkAsRead={markAsRead}
  onMarkAllAsRead={markAllAsRead}
/>
```

### Notification Types

#### Wallet Notifications
Triggered when:
- Driver receives earnings from completed orders
- Wallet is topped up with deposits
- Any transaction with type 'earnings' or 'deposit'

#### Order Notifications  
Triggered when order status changes to:
- `accepted` - Driver accepts an order
- `en_route` - Driver is on the way to pickup
- `arrived` - Driver has arrived at pickup location
- `picked_up` - Order has been picked up
- `delivered` - Order has been delivered
- `cancelled` - Order has been cancelled

#### Message Notifications
Triggered when:
- New support messages are received
- Customer sends a message through the chat system

## Database Integration

### Real-time Subscriptions
The system uses Supabase real-time subscriptions to monitor:

1. **wallet_transactions** table for new transactions
2. **orders** table for status updates
3. **support_messages** table for new messages

### Row Level Security
Notifications respect RLS policies:
- Drivers only see their own wallet transactions
- Drivers only get notifications for their assigned orders
- Message notifications filtered by receiver_id

## Customization

### Notification Preferences
Users can customize notifications through the settings modal:

```typescript
interface NotificationPreferences {
  walletNotifications: boolean;
  orderNotifications: boolean;
  messageNotifications: boolean;
  soundEnabled: boolean;
  toastEnabled: boolean;
}
```

### Adding New Notification Types
To add a new notification type:

1. Update the notification type union in interfaces
2. Add the new subscription in `useNotifications.ts`
3. Update preference checking in `notificationPreferences.ts`
4. Add appropriate icon in `NotificationCenter.tsx`

## Testing

### Manual Testing
1. **Wallet Notifications**: Create a wallet transaction with type 'deposit' or 'earnings'
2. **Order Notifications**: Update an order status in the database
3. **Message Notifications**: Insert a new message in support_messages table

### Using Test Script
```bash
# Run the notification test script
node scripts/test-notifications.mjs <driverId> <orderId>
```

## Troubleshooting

### Common Issues

1. **No Sound Playing**
   - Check if notification.mp3 exists in public folder
   - Verify browser allows audio autoplay
   - Check user preferences for sound enabled

2. **Notifications Not Appearing**
   - Verify Supabase connection
   - Check RLS policies for proper access
   - Ensure user is authenticated

3. **Settings Not Persisting**
   - Check localStorage permissions
   - Verify JSON serialization/deserialization

### Debug Mode
Enable console logging by setting:
```javascript
localStorage.setItem('debug_notifications', 'true');
```

## Performance Considerations

- Notifications are limited to 50 items in memory
- Old notifications are automatically cleaned up
- Subscriptions are properly unsubscribed on component unmount
- Settings are cached in localStorage to avoid repeated reads

## Future Enhancements

- Push notifications for mobile devices
- Email notification fallback
- Notification scheduling and quiet hours
- Advanced filtering and search
- Notification templates and customization
