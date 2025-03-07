import React, { useState } from 'react';
import { FaSearch, FaFilter, FaBox, FaTruck, FaMapMarkerAlt } from 'react-icons/fa';

const Parcel = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [showFilters, setShowFilters] = useState(false);

  const deliveries = [
    {
      id: 1,
      trackingNumber: 'FR-2025-001',
      status: 'pending',
      from: 'San Francisco, CA',
      to: 'Los Angeles, CA',
      weight: '5.2 lbs',
      estimatedDelivery: '2025-03-08',
      price: 45.99
    },
    {
      id: 2,
      trackingNumber: 'FR-2025-002',
      status: 'in-transit',
      from: 'Seattle, WA',
      to: 'Portland, OR',
      weight: '3.8 lbs',
      estimatedDelivery: '2025-03-07',
      price: 35.50
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Parcel Delivery</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search deliveries..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <FaFilter />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'available'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Available Deliveries
        </button>
        <button
          onClick={() => setActiveTab('my-deliveries')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'my-deliveries'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          My Deliveries
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Weight Range</label>
              <select className="w-full p-2 border rounded-lg">
                <option>Any weight</option>
                <option>0-5 lbs</option>
                <option>5-10 lbs</option>
                <option>10+ lbs</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price Range</label>
              <select className="w-full p-2 border rounded-lg">
                <option>Any price</option>
                <option>$0-$25</option>
                <option>$25-$50</option>
                <option>$50+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="w-full p-2 border rounded-lg">
                <option>All</option>
                <option>Pending</option>
                <option>In Transit</option>
                <option>Delivered</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deliveries.map((delivery) => (
          <div key={delivery.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-sm text-gray-500">Tracking #</span>
                <h3 className="font-semibold">{delivery.trackingNumber}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                delivery.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                delivery.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <FaMapMarkerAlt className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">From</div>
                  <div>{delivery.from}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <FaMapMarkerAlt className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">To</div>
                  <div>{delivery.to}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <FaBox className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Weight</div>
                  <div>{delivery.weight}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <FaTruck className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Estimated Delivery</div>
                  <div>{delivery.estimatedDelivery}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">${delivery.price}</span>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  {activeTab === 'available' ? 'Accept Delivery' : 'Track'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Parcel;