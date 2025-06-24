import React from 'react';
import { useOutletContext } from 'react-router-dom';
import OrderList from '../components/DriverDash/Order';
import { Order, OrderAction } from '../components/DriverDash/types';

interface DriverDashboardContext {
  currentOrders: Order[];
  pastOrders: Order[];
  isLoadingCurrentOrders: boolean;
  isLoadingPastOrders: boolean;
  handleOrderAction: (orderId: string, action: OrderAction) => Promise<void>;
}

export default function DriverOrders() {
  const [activeTab, setActiveTab] = React.useState<'current' | 'past'>('current');
  const {
    currentOrders,
    pastOrders,
    isLoadingCurrentOrders,
    isLoadingPastOrders,
    handleOrderAction
  } = useOutletContext<DriverDashboardContext>();



  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'current'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Current Orders
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'past'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Past Orders
          </button>
        </div>

        {activeTab === 'current' ? (
          <OrderList
            orders={currentOrders}
            onAction={handleOrderAction}
            isLoading={isLoadingCurrentOrders}
          />
        ) : (
          <OrderList
            orders={pastOrders}
            onAction={handleOrderAction}
            isLoading={isLoadingPastOrders}
          />
        )}
      </div>
    </div>
  );
}
