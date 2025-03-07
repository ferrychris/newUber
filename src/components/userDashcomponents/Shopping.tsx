import React, { useState } from 'react';
import { FaShoppingCart, FaStore, FaClock, FaMapMarkerAlt, FaSearch, FaFilter, FaPlus } from 'react-icons/fa';

interface ShoppingItem {
  id: number;
  store: string;
  items: string[];
  total: number;
  status: 'pending' | 'transit' | 'delivered';
  deliveryTime: string;
  address: string;
  shopper?: string;
}

const Shopping: React.FC = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'my-orders'>('available');

  const orders: ShoppingItem[] = [
    {
      id: 1,
      store: "Whole Foods Market",
      items: ["Organic Vegetables", "Fresh Fruits", "Dairy Products"],
      total: 85.50,
      status: "pending",
      deliveryTime: "2-3 hours",
      address: "123 Main St, San Francisco",
    },
    {
      id: 2,
      store: "Target",
      items: ["Home Supplies", "Electronics", "Clothing"],
      total: 150.75,
      status: "shopping",
      deliveryTime: "1-2 hours",
      address: "456 Market St, San Francisco",
      shopper: "Alice Johnson"
    }
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🛒 Shopping Service</h1>
          <p className="text-gray-600 mt-1">Get your shopping done by our shoppers</p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors">
          <FaPlus />
          <span>New Order</span>
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores or items..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <FaFilter />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
            <select className="px-4 py-2 border border-gray-200 rounded-lg">
              <option>Store</option>
              <option>Whole Foods</option>
              <option>Target</option>
              <option>Walmart</option>
            </select>
            <select className="px-4 py-2 border border-gray-200 rounded-lg">
              <option>Delivery Time</option>
              <option>1-2 hours</option>
              <option>2-3 hours</option>
              <option>3-4 hours</option>
            </select>
            <select className="px-4 py-2 border border-gray-200 rounded-lg">
              <option>Order Status</option>
              <option>Pending</option>
              <option>Shopping</option>
              <option>Delivered</option>
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          className={`pb-2 px-1 ${
            activeTab === 'available'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('available')}
        >
          Available Orders
        </button>
        <button
          className={`pb-2 px-1 ${
            activeTab === 'my-orders'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('my-orders')}
        >
          My Orders
        </button>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FaStore className="text-green-600" />
                  <h3 className="font-semibold text-gray-800">{order.store}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">{order.items.length} items</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                order.status === 'pending' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : order.status === 'shopping'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {order.status}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-600">Items:</div>
              <ul className="mt-1 space-y-1">
                {order.items.map((item, index) => (
                  <li key={index} className="text-sm text-gray-500">• {item}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <FaMapMarkerAlt className="text-green-600" />
                <span className="text-sm">{order.address}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <FaClock className="text-green-600" />
                <span className="text-sm">Delivery in {order.deliveryTime}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {order.shopper && `Shopper: ${order.shopper}`}
                </div>
                <div className="text-lg font-semibold text-gray-800">
                  ${order.total.toFixed(2)}
                </div>
              </div>
            </div>

            <button className="w-full mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              {order.status === 'pending' ? 'Place Order' : 'Track Order'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shopping;