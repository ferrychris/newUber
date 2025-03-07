import React, { useState } from 'react';
import { FaCar, FaMapMarkerAlt, FaClock, FaUsers, FaSearch } from 'react-icons/fa';

interface RideOption {
  id: number;
  driver: string;
  from: string;
  to: string;
  time: string;
  seats: number;
  price: number;
}

const Carpool = () => {
  const [searchParams, setSearchParams] = useState({
    from: '',
    to: '',
    date: '',
  });

  const availableRides: RideOption[] = [
    {
      id: 1,
      driver: "John Doe",
      from: "Downtown",
      to: "Airport",
      time: "10:00 AM",
      seats: 3,
      price: 25
    },
    {
      id: 2,
      driver: "Jane Smith",
      from: "University",
      to: "Shopping Mall",
      time: "2:30 PM",
      seats: 4,
      price: 15
    },
    {
      id: 3,
      driver: "Mike Johnson",
      from: "Suburbs",
      to: "City Center",
      time: "8:45 AM",
      seats: 2,
      price: 20
    }
  ];

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-6">Find a Ride</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter pickup location"
                value={searchParams.from}
                onChange={(e) => setSearchParams({ ...searchParams, from: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter destination"
                value={searchParams.to}
                onChange={(e) => setSearchParams({ ...searchParams, to: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchParams.date}
                onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
              />
            </div>
          </div>
        </div>
        <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
          <FaSearch />
          Search Rides
        </button>
      </div>

      {/* Available Rides */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-6">Available Rides</h2>
        <div className="space-y-4">
          {availableRides.map((ride) => (
            <div key={ride.id} className="border border-gray-200 rounded-md p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FaCar className="text-blue-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{ride.driver}</h3>
                    <div className="text-sm text-gray-500">
                      {ride.from} → {ride.to}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">${ride.price}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FaUsers />
                    {ride.seats} seats available
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <FaClock className="inline mr-1" />
                  {ride.time}
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Book Ride
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FaCar className="text-green-600 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">15</h3>
              <p className="text-gray-500">Active Drivers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaUsers className="text-blue-600 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">45</h3>
              <p className="text-gray-500">Available Seats</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FaMapMarkerAlt className="text-purple-600 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">8</h3>
              <p className="text-gray-500">Popular Routes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carpool;

