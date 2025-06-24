
import { useState } from 'react';
import { Order, OrderAction } from './types';
import OrderCard from './Orders/OrderCard';
import OrderFilters from './Orders/OrderFilters';
import OrderStats from './Orders/OrderStats';

interface OrderListProps {
  orders: Order[];
  onAction: (orderId: string, action: OrderAction) => void;
  isLoading: boolean;
}

export default function OrderList({ orders, onAction, isLoading }: OrderListProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true;
    return order.status === activeFilter;
  });

  return (
    <div className="bg-[#2a2a2a] p-6 rounded-lg shadow text-white">
      <h2 className="text-xl font-semibold mb-6 text-white">Orders Dashboard</h2>
      
      <OrderStats orders={orders} />
      
      <OrderFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {isLoading ? (
        <div className="text-center py-4">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-white mt-2">Loading orders...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No orders available at the moment.</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={onAction}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
