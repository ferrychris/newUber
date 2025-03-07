import React from 'react';
import { FaCar, FaBox, FaShoppingCart, FaHamburger, FaTruck, FaMapMarkedAlt } from 'react-icons/fa';
import Map from './Map'
interface Activity {
  id: number;
  type: string;
  description: string;
  status: string;
  time: string;
}

const DashIndex = () => {
  const userName = "David"; // This would come from user context/auth
  const activities: Activity[] = [
    {
      id: 1,
      type: "Carpool",
      description: "Ride to Airport",
      status: "In Progress",
      time: "10:30 AM"
    },
    {
      id: 2,
      type: "Parcel",
      description: "Package #1234",
      status: "Out for Delivery",
      time: "11:45 AM"
    },
    {
      id: 3,
      type: "Meal",
      description: "Order from Burger King",
      status: "Preparing",
      time: "12:15 PM"
    }
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
        <h1 className="text-xl lg:text-2xl font-bold mb-2">👋 Hello, {userName}!</h1>
        <p className="text-gray-600">Ready to manage your deliveries?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <span className="text-blue-600 font-semibold">3</span>
            <p className="text-sm text-gray-600">Ongoing Rides</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <span className="text-green-600 font-semibold">5</span>
            <p className="text-sm text-gray-600">Pending Orders</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <span className="text-purple-600 font-semibold">2</span>
            <p className="text-sm text-gray-600">In Progress</p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <FaCar className="text-blue-600 text-xl" />
            <h3 className="font-semibold">Carpool Rides</h3>
          </div>
          <p className="text-sm text-gray-600">Next: Airport Pickup</p>
          <p className="text-xs text-gray-500">Today, 3:30 PM</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <FaBox className="text-orange-600 text-xl" />
            <h3 className="font-semibold">Parcel Deliveries</h3>
          </div>
          <p className="text-sm text-gray-600">3 Pending</p>
          <p className="text-xs text-gray-500">2 Delivered Today</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <FaShoppingCart className="text-green-600 text-xl" />
            <h3 className="font-semibold">Shopping Orders</h3>
          </div>
          <p className="text-sm text-gray-600">1 Processing</p>
          <p className="text-xs text-gray-500">Ready for Pickup</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <FaHamburger className="text-red-600 text-xl" />
            <h3 className="font-semibold">Meal Orders</h3>
          </div>
          <p className="text-sm text-gray-600">2 Active Orders</p>
          <p className="text-xs text-gray-500">Estimated: 20 mins</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <FaTruck className="text-purple-600 text-xl" />
            <h3 className="font-semibold">Large Items</h3>
          </div>
          <p className="text-sm text-gray-600">1 Scheduled</p>
          <p className="text-xs text-gray-500">Tomorrow, 10 AM</p>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg lg:text-xl font-semibold">🗂 Recent Activity</h2>
          <button className="text-blue-600 text-sm hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <div className="min-w-[600px] lg:w-full p-4 lg:p-0">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm">
                  <th className="pb-4">Type</th>
                  <th className="pb-4">Description</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id} className="border-t border-gray-100">
                    <td className="py-4">{activity.type}</td>
                    <td>{activity.description}</td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        activity.status === 'In Progress' 
                          ? 'bg-blue-100 text-blue-700'
                          : activity.status === 'Out for Delivery'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {activity.status}
                      </span>
                    </td>
                    <td>{activity.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Map Integration */}
      // Replace the map placeholder div with:
<div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-lg lg:text-xl font-semibold">📍 Live Tracking</h2>
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
      <span className="text-sm text-gray-500">Live Updates</span>
    </div>
  </div>
  <Map className="h-[200px] lg:h-[300px] rounded-lg" />
</div>
    </div>
  );
};

export default DashIndex;