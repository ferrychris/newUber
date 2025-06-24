import React from 'react';

interface Order {
  id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  driver_id?: string;
  customer_name: string;
  customer_phone?: string;
  pickup_location: string;
  dropoff_location: string;
  created_at: string;
  scheduled_time?: string;
  price: number;
  payment_method?: string;
  metadata?: string;
}

export interface OrderListProps {
  orders: Order[];
  title: string;
  onOrderAction: (orderId: string, action: 'accept' | 'complete' | 'cancel') => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, title, onOrderAction }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">{title}</h3>
      {orders.map((order) => (
        <div key={order.id} className="bg-white p-4 rounded-lg shadow space-y-4">
          {/* Order Header */}
          <div className="flex justify-between items-start border-b pb-2">
            <div>
              <p className="font-medium text-lg">Order #{order.id}</p>
              <p className="text-sm text-gray-500">
                Created: {formatDate(order.created_at)}
              </p>
            </div>
            <div className="space-x-2">
              {order.status === 'pending' && (
                <button
                  onClick={() => onOrderAction(order.id, 'accept')}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Accept
                </button>
              )}
              {order.status === 'active' && (
                <div className="space-x-2">
                  <button
                    onClick={() => onOrderAction(order.id, 'complete')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => onOrderAction(order.id, 'cancel')}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Customer Information</h4>
              <p className="text-sm">{order.customer_name}</p>
              {order.customer_phone && (
                <div className="flex space-x-2">
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {order.customer_phone}
                  </a>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Schedule</h4>
              <div className="text-sm space-y-1">
                <p>Created: {formatDate(order.created_at)}</p>
                {order.scheduled_time && (
                  <p>Scheduled: {formatDate(order.scheduled_time)}</p>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Payment Details</h4>
              <div className="text-sm space-y-1">
                <p className="font-medium">{formatCurrency(order.price)}</p>
                {order.payment_method && (
                  <p className="text-gray-600">Method: {order.payment_method}</p>
                )}
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="border-t pt-4 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Pickup Location</p>
                <p className="text-sm">{order.pickup_location}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Dropoff Location</p>
                <p className="text-sm">{order.dropoff_location}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.metadata && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-600">Notes</p>
              <p className="text-sm mt-1">{order.metadata}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default OrderList;
