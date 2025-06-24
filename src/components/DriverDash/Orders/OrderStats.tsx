import React from 'react';
import { Order } from '../types';

interface OrderStatsProps {
  orders: Order[];
}

const OrderStats: React.FC<OrderStatsProps> = ({ orders }) => {
  const stats = {
    totalEarnings: orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.price || 0), 0),
    completedOrders: orders.filter(order => order.status === 'completed').length,
    pendingOrders: orders.filter(order => order.status === 'pending').length,
    acceptedOrders: orders.filter(order => order.status === 'accepted').length,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-[#333333] p-4 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Total Earnings</h3>
        <p className="text-2xl font-bold text-green-400">${stats.totalEarnings.toFixed(2)}</p>
      </div>
      
      <div className="bg-[#333333] p-4 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Completed Orders</h3>
        <p className="text-2xl font-bold text-green-300">{stats.completedOrders}</p>
      </div>
      
      <div className="bg-[#333333] p-4 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Pending Orders</h3>
        <p className="text-2xl font-bold text-yellow-300">{stats.pendingOrders}</p>
      </div>
      
      <div className="bg-[#333333] p-4 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Active Orders</h3>
        <p className="text-2xl font-bold text-blue-300">{stats.acceptedOrders}</p>
      </div>
    </div>
  );
};

export default OrderStats;
