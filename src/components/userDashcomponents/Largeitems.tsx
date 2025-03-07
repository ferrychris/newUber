import React, { useState } from 'react';
import { FaTruck, FaBox, FaCalendar, FaMapMarkerAlt, FaDollarSign, FaSearch, FaFilter } from 'react-icons/fa';

interface Item {
  id: number;
  title: string;
  type: string;
  pickup: string;
  delivery: string;
  date: string;
  price: number;
  status: 'pending' | 'in-transit' | 'delivered';
  dimensions: string;
  weight: string;
}

const LargeItems: React.FC = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'my-items'>('available');

  const items: Item[] = [
    {
      id: 1,
      title: "Moving Furniture",
      type: "Furniture Set",
      pickup: "San Francisco",
      delivery: "Los Angeles",
      date: "2025-03-15",
      price: 250,
      status: "pending",
      dimensions: "6' x 4' x 3'",
      weight: "200 lbs"
    },
    {
      id: 2,
      title: "Piano Delivery",
      type: "Musical Instrument",
      pickup: "Seattle",
      delivery: "Portland",
      date: "2025-03-20",
      price: 300,
      status: "in-transit",
      dimensions: "5' x 5' x 4'",
      weight: "400 lbs"
    }
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🚛 Large Item Transport</h1>
          <p className="text-gray-600 mt-1">Schedule transport for large items and furniture</p>
        </div>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors">
          Request Transport
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
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              <option>Item Type</option>
              <option>Furniture</option>
              <option>Appliances</option>
              <option>Musical Instruments</option>
            </select>
            <input
              type="date"
              className="px-4 py-2 border border-gray-200 rounded-lg"
            />
            <select className="px-4 py-2 border border-gray-200 rounded-lg">
              <option>Price Range</option>
              <option>$0 - $100</option>
              <option>$100 - $300</option>
              <option>$300+</option>
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          className={`pb-2 px-1 ${
            activeTab === 'available'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('available')}
        >
          Available Jobs
        </button>
        <button
          className={`pb-2 px-1 ${
            activeTab === 'my-items'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('my-items')}
        >
          My Items
        </button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.type}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                item.status === 'pending' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : item.status === 'in-transit'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {item.status}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <FaMapMarkerAlt className="text-purple-600" />
                <span>From: {item.pickup}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <FaMapMarkerAlt className="text-purple-600" />
                <span>To: {item.delivery}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <FaCalendar className="text-purple-600" />
                <span>{item.date}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <div>{item.dimensions}</div>
                  <div>{item.weight}</div>
                </div>
                <div className="text-lg font-semibold text-gray-800">
                  ${item.price}
                </div>
              </div>
            </div>

            <button className="w-full mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              Book Transport
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LargeItems;