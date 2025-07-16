import React, { useEffect, useState, memo, CSSProperties } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Define our custom Order type to match what we're using in OrderTracker
interface Order {
  id: string;
  status: string;
  user_id: string;
  driver_id?: string;
  created_at: string;
  pickup_location?: string | [number, number];
  destination_location?: string | [number, number];
  dropoff_location?: string; // Add this for backward compatibility
  services?: {
    id: string;
    name: string;
    type?: string;
    description?: string;
    image?: string;
  };
}

// Map updater component for recenter map when location changes
const MapUpdater = memo(({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
});

// Props interface
interface OrderMapPanelProps {
  selectedOrder: Order | null;
  driverLocation: [number, number] | null;
  pickupLocation: [number, number] | null;
  destinationLocation: [number, number] | null;
  driverDetails: any | null;
  mapContainerStyle?: CSSProperties;
  mapWrapperStyle?: CSSProperties;
  driverIcon: L.Icon;
  pickupIcon: L.Icon;
  destinationIcon: L.Icon;
}

// Calculate estimated arrival time based on distance and speed
const calculateETA = (start: [number, number], end: [number, number]): string => {
  if (!start || !end) return '-- min';
  
  // Calculate distance in km using Haversine formula
  const R = 6371; // Earth radius in km
  const dLat = (end[0] - start[0]) * Math.PI / 180;
  const dLon = (end[1] - start[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(start[0] * Math.PI / 180) * Math.cos(end[0] * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Assume average speed of 30 km/h in city
  const avgSpeedKmh = 30;
  const timeHours = distance / avgSpeedKmh;
  const timeMinutes = Math.round(timeHours * 60);
  
  return timeMinutes <= 1 ? '1 min' : `${timeMinutes} min`;
};

// Calculate route progress percentage
const calculateProgress = (start: [number, number], current: [number, number], end: [number, number]): number => {
  if (!start || !current || !end) return 0;
  
  // Calculate total distance and current distance
  const totalDistance = calculateDistance(start, end);
  const currentDistance = calculateDistance(start, current);
  
  // Calculate progress percentage
  return Math.min(100, Math.max(0, (currentDistance / totalDistance) * 100));
};

// Helper function to calculate distance between two points
const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  const R = 6371; // Earth radius in km
  const dLat = (point2[0] - point1[0]) * Math.PI / 180;
  const dLon = (point2[1] - point1[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Memoized marker component to prevent unnecessary re-renders
const LocationMarker = memo(({ 
  position, 
  icon, 
  popupTitle, 
  popupContent 
}: { 
  position: [number, number]; 
  icon: L.Icon; 
  popupTitle: string; 
  popupContent?: string;
}) => (
  <Marker position={position} icon={icon as any}>
    <Popup>
      <div className="font-medium">{popupTitle}</div>
      {popupContent && <div className="text-sm">{popupContent}</div>}
    </Popup>
  </Marker>
));

// Enable display names for debugging
MapUpdater.displayName = 'MapUpdater';
LocationMarker.displayName = 'LocationMarker';

// Route line component
const RouteLine = memo(({ 
  points, 
  color = '#4f46e5', 
  opacity = 0.75,
  weight = 3,
  dashArray = '5, 5'
}: { 
  points: [number, number][]; 
  color?: string;
  opacity?: number;
  weight?: number;
  dashArray?: string;
}) => {
  return (
    <Polyline 
      positions={points} 
      pathOptions={{ 
        color, 
        opacity, 
        weight,
        dashArray
      }} 
    />
  );
});

RouteLine.displayName = 'RouteLine';

const OrderMapPanel: React.FC<OrderMapPanelProps> = memo(({
  selectedOrder,
  driverLocation,
  pickupLocation,
  destinationLocation,
  driverDetails,
  mapContainerStyle,
  mapWrapperStyle,
  driverIcon,
  pickupIcon,
  destinationIcon
}) => {
  const { t } = useTranslation();
  const [mapReady, setMapReady] = useState(false);
  
  // Set map as ready after initial render
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Display a placeholder when no order is selected
  if (!selectedOrder) {
    return (
      <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-4 sm:p-8 flex items-center justify-center h-[300px] sm:h-[400px]">
        <div className="text-center">
          <FaMapMarkerAlt className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('tracking.selectOrder')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-stone-400 max-w-xs mx-auto">
            {t('tracking.selectOrderMessage')}
          </p>
        </div>
      </div>
    );
  }
  
  // Calculate ETA if driver and destination locations are available
  const eta = driverLocation && destinationLocation ? 
    calculateETA(driverLocation, destinationLocation) : '--';
    
  // Calculate progress percentage if all locations are available
  const progress = driverLocation && pickupLocation && destinationLocation ? 
    calculateProgress(pickupLocation, driverLocation, destinationLocation) : 0;
  
  return (
    <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden" style={mapWrapperStyle}>
      {/* ETA and Progress Bar */}
      {selectedOrder && selectedOrder.status === 'in_transit' && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/20">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center text-sm font-medium text-indigo-700 dark:text-indigo-300">
              <FaClock className="mr-1" />
              <span>ETA: {eta}</span>
            </div>
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {Math.round(progress)}% {t('tracking.complete')}
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <motion.div 
              className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full" 
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
      
      <div className="h-[300px] sm:h-[350px]">
        {pickupLocation && destinationLocation ? (
          <MapContainer
            style={mapContainerStyle}
            zoom={13}
            attributionControl={false}
            whenReady={() => setMapReady(true)}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Only render markers when map is ready to prevent rendering issues */}
            {mapReady && (
              <>
                {/* Route lines */}
                {pickupLocation && destinationLocation && (
                  <RouteLine 
                    points={[pickupLocation, destinationLocation]} 
                    color="#6366f1" 
                    dashArray="5, 5"
                  />
                )}
                
                {/* Driver route line (only show when driver is in transit) */}
                {driverLocation && pickupLocation && selectedOrder.status === 'in_transit' && (
                  <RouteLine 
                    points={[driverLocation, destinationLocation]} 
                    color="#4f46e5"
                    dashArray=""
                    opacity={0.6}
                  />
                )}
                
                {/* Driver marker */}
                {driverLocation && (
                  <LocationMarker 
                    position={driverLocation} 
                    icon={driverIcon} 
                    popupTitle={t('tracking.driverLocation')}
                    popupContent={driverDetails?.full_name || t('tracking.driver')} 
                  />
                )}
                
                {/* Pickup marker */}
                <LocationMarker
                  position={pickupLocation}
                  icon={pickupIcon}
                  popupTitle={t('location.pickup')}
                  popupContent={typeof selectedOrder.pickup_location === 'string' ? selectedOrder.pickup_location : 'Pickup Location'}
                />
                
                {/* Destination marker */}
                <LocationMarker
                  position={destinationLocation}
                  icon={destinationIcon}
                  popupTitle={t('location.destination')}
                  popupContent={selectedOrder.dropoff_location || (typeof selectedOrder.destination_location === 'string' ? selectedOrder.destination_location : 'Destination Location')}
                />
                
                {/* Update map center when driver location changes */}
                <MapUpdater center={driverLocation || pickupLocation} />
              </>
            )}
          </MapContainer>
      ) : (
        <div className="flex justify-center items-center h-full">
          <FaClock className="text-indigo-600 dark:text-indigo-400 text-2xl mr-2" /> Calculating...
        </div>
      )}
      </div>
      
      {/* Map Legend */}
      <div className="px-4 py-2 bg-white dark:bg-midnight-800 border-t border-gray-100 dark:border-stone-700/20">
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span>{t('location.pickup')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span>{t('location.destination')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span>{t('tracking.driver')}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// Add display name for better debugging
OrderMapPanel.displayName = 'OrderMapPanel';

export default OrderMapPanel;
