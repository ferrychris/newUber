import React from 'react';
import { Order } from '../types';

interface OrderActionsProps {
  order: Order;
  onAction: (orderId: string, action: 'accept' | 'reject' | 'complete') => void;
}

const OrderActions: React.FC<OrderActionsProps> = ({ order, onAction }) => {
  return (
    <div className="flex gap-2">
      {order.status === 'pending' && (
        <>
          <button
            onClick={() => onAction(order.id, 'accept')}
            className="flex-1 py-2 px-4 bg-blue-900/50 text-blue-300 rounded-md border border-blue-700 hover:bg-blue-800/50 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => onAction(order.id, 'reject')}
            className="flex-1 py-2 px-4 bg-red-900/50 text-red-300 rounded-md border border-red-700 hover:bg-red-800/50 transition-colors"
          >
            Reject
          </button>
        </>
      )}
      
      {order.status === 'accepted' && (
        <button
          onClick={() => onAction(order.id, 'complete')}
          className="w-full py-2 px-4 bg-green-900/50 text-green-300 rounded-md border border-green-700 hover:bg-green-800/50 transition-colors"
        >
          Complete Delivery
        </button>
      )}
    </div>
  );
};

export default OrderActions;
