import React, { memo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { FaSpinner, FaMapMarkerAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';

// Map updater component for recenter map when location changes
const MapUpdater = memo(({ center }: { center: [number, number] }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
});

// Props interface
interface OrderMapPanelProps {
  selectedOrder: any | null;
  driverLocation: [number, number] | null;
  pickupLocation: [number, number] | null;
  destinationLocation: [number, number] | null;
  driverDetails: any | null;
  isLoadingLocation: boolean;
  mapContainerStyle: React.CSSProperties;
  mapWrapperStyle: React.CSSProperties;
  driverIcon: L.Icon; 
  pickupIcon: L.Icon;
  destinationIcon: L.Icon;
}

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

const OrderMapPanel: React.FC<OrderMapPanelProps> = memo(({
  selectedOrder,
  driverLocation,
  pickupLocation,
  destinationLocation,
  driverDetails,
  isLoadingLocation,
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
  
  return (
    <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden h-[300px] sm:h-[400px]" style={mapWrapperStyle}>
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
                popupContent={selectedOrder.pickup_location}
              />
              
              {/* Destination marker */}
              <LocationMarker
                position={destinationLocation}
                icon={destinationIcon}
                popupTitle={t('location.destination')}
                popupContent={selectedOrder.dropoff_location}
              />
              
              {/* Update map center when driver location changes */}
              <MapUpdater center={driverLocation || pickupLocation} />
            </>
          )}
        </MapContainer>
      ) : (
        <div className="flex justify-center items-center h-full">
          <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
OrderMapPanel.displayName = 'OrderMapPanel';

export default OrderMapPanel;
