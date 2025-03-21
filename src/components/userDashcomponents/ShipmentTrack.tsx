import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaBoxOpen, FaTruck, FaMap, FaMapMarkerAlt, FaLocationArrow, FaBox, FaCircle, FaDotCircle, FaArrowAltCircleRight, FaBatteryThreeQuarters, FaRuler, FaBoxes } from 'react-icons/fa';
import Map from './Map';

const ShipmentTrack: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tracking');

  // Demo data
  const shipmentData = {
    id: 'WYC-2234',
    status: 'In transit',
    percentage: 65,
    deliveryProgress: 65,
    trackingId: '912539-123-1330a',
    timeline: [
      { 
        status: 'Current Location',
        location: 'Los Angeles Gateway',
        time: 'March 21, 2023 - 14:23'
      },
      { 
        status: 'Shipment Weighed',
        location: 'Las Vegas, NV - USA',
        time: 'March 20, 2023 - 09:15'
      },
      { 
        status: 'Route Planned',
        location: 'San Diego, USA',
        time: 'March 19, 2023 - 16:45'
      }
    ],
    vehicle: {
      name: 'White Bengala Box',
      dimensions: {
        length: '46.3 m',
        width: '36 m',
        height: '18 m'
      },
      image: '/truck-image.png'
    },
    package: {
      total: 41.180,
      categories: [
        { name: 'Electronics', percentage: 67 },
        { name: 'Clothing', percentage: 24 },
        { name: 'Kitchen', percentage: 43 }
      ],
      stats: [
        { value: '25,200', color: 'purple' },
        { value: '9,245', color: 'teal' },
        { value: '12,955', color: 'blue' }
      ]
    },
    map: {
      distance: 50,
      time: '1h 20m',
      eta: '11:45 AM'
    }
  };

  // Custom progress bar to match design
  const ProgressBar = ({ percentage }: { percentage: number }) => (
    <div className="w-full h-1 bg-gray-200 dark:bg-midnight-800 rounded overflow-hidden">
      <div 
        className="h-full bg-teal-500 rounded-r transition-all duration-300"
        style={{ width: `${percentage}%` }} 
      />
    </div>
  );

  return (
    <div className="container mx-auto">
      {/* Title section with progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Shipment success</h1>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{shipmentData.percentage}%</span>
            <span className="text-sm text-green-500">+8%</span>
          </div>
        </div>
        <ProgressBar percentage={shipmentData.percentage} />
      </div>

      {/* Main grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tracking information panel */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-midnight-700 flex items-center justify-center mr-4">
                  <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" className="w-full h-full rounded-full" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Darrell Steward</h3>
                  <p className="text-sm text-gray-500 dark:text-stone-400">is calling you</p>
                </div>
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Accept
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 dark:text-stone-400">Company</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">VWDO</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-stone-400">Role</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Manager</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-stone-400">Phone</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">(+48)74352405</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-stone-400">City</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">San Diego</p>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-midnight-700 my-6" />

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tracking History</h3>
              <div className="flex gap-1 mb-4">
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs px-2 py-1 rounded-md">
                  {shipmentData.trackingId}
                </span>
                <button className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-1 rounded-md">
                  In Transit
                </button>
              </div>

              <div className="relative pl-6">
                {shipmentData.timeline.map((item, index) => (
                  <div key={index} className="mb-6 relative">
                    {/* Timeline connector */}
                    {index < shipmentData.timeline.length - 1 && (
                      <div className="absolute left-0 top-3 w-0.5 h-full -ml-3 bg-indigo-200 dark:bg-indigo-800/50"></div>
                    )}
                    
                    {/* Timeline dot */}
                    <div className={`absolute left-0 top-1 w-5 h-5 -ml-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-indigo-600' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                      <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-white' : 'bg-indigo-600'}`}></div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-stone-400">{item.status}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Map Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
          >
            <div className="h-64 lg:h-80 w-full rounded-lg overflow-hidden relative">
              <Map className="w-full h-full rounded-lg" />
              
              {/* Map overlay */}
              <div className="absolute bottom-4 left-4 bg-white dark:bg-midnight-900 p-3 rounded-lg shadow-md">
                <p className="text-xs text-gray-500 dark:text-stone-400">Distance to arrival</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {shipmentData.map.distance}<span className="text-xs text-gray-500 dark:text-stone-400"> km</span> · {shipmentData.map.time}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Right column */}
        <div className="space-y-6">
          {/* Vehicle Details Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">White Bengala Box</h3>
              <span className="text-xs text-gray-500 dark:text-stone-400">{shipmentData.id}</span>
            </div>
            
            <div className="flex justify-center mb-6">
              <div className="relative w-3/4">
                <img 
                  src="https://cdn3d.iconscout.com/3d/premium/thumb/delivery-truck-5349553-4468542.png" 
                  alt="Delivery truck" 
                  className="w-full h-auto object-contain" 
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <FaBatteryThreeQuarters className="text-teal-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">Total volume</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{shipmentData.vehicle.dimensions.length}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <FaRuler className="text-teal-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">Total weight</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{shipmentData.vehicle.dimensions.width}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <FaBoxes className="text-teal-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-stone-400">Total items</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{shipmentData.vehicle.dimensions.height}</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Package Details Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
            className="bg-white dark:bg-midnight-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Package Details</h3>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{shipmentData.package.total}</span>
                <span className="text-xs text-gray-500 dark:text-stone-400">(total items)</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                {shipmentData.package.categories.map((category, idx) => (
                  <div key={idx}>
                    <p className="text-xs text-gray-500 dark:text-stone-400">{category.name}</p>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{category.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-4 mb-4">
              {shipmentData.package.stats.map((stat, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full h-24 rounded-md mb-2 ${
                      idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-teal-500' : 'bg-blue-500'
                    }`}
                  ></div>
                  <span className="text-xs text-gray-500 dark:text-stone-400">{stat.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentTrack; 