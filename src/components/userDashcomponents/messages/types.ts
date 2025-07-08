export interface MessageProps {
  orderId: string;
  receiverId: string;
  isDriver: boolean;
  onClose: () => void;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
  is_system_message?: boolean;
}

export interface ReceiverInfo {
  name: string;
  image?: string;
}

export interface MessageThread {
  order: {
    id: string;
    services?: {
      name: string;
    };
    created_at: string;
  };
  otherParticipant: {
    id: string;
    full_name: string;
    profile_image?: string;
  };
  latestMessage: {
    created_at: string;
  };
  unreadCount: number;
}

export interface DebugInfo {
  authLoading: boolean;
  hasAuthUser: boolean;
  userId: string | null;
  error: string | null;
}
