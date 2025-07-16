import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useOrderTracker } from './OrderTrackerContext';

// Custom CSS to fix z-index issues with the map
const mapContainerStyle = {
  height: '100%',
  width: '100%',
  position: 'relative',
  zIndex: 1
} as React.CSSProperties;

const mapWrapperStyle = {
  position: 'relative',
  zIndex: 1,
  height: '400px',
  borderRadius: '8px',
  overflow: 'hidden'
} as React.CSSProperties;

// Custom marker icons
const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const OrderMapComponent: React.FC = () => {
  const {
    pickupLocation,
    destinationLocation,
    driverLocation,
    selectedOrder,
    driverDetails
  } = useOrderTracker();
  
  // Map controller component to access the map instance
  const MapController: React.FC<{
    pickupLocation: [number, number] | null;
    destinationLocation: [number, number] | null;
    driverLocation: [number, number] | null;
  }> = ({ pickupLocation, destinationLocation, driverLocation }) => {
    const map = useMap();
    
    // Update map bounds when locations change
    useEffect(() => {
      if (pickupLocation || destinationLocation || driverLocation) {
        const bounds = new L.LatLngBounds([]);
        
        if (pickupLocation) {
          bounds.extend(pickupLocation);
        }
        
        if (destinationLocation) {
          bounds.extend(destinationLocation);
        }
        
        if (driverLocation) {
          bounds.extend(driverLocation);
        }
        
        // Check if bounds has any points (not empty)
        if (bounds.getNorthEast().equals(bounds.getSouthWest()) === false) {
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15
          });
        }
      }
    }, [map, pickupLocation, destinationLocation, driverLocation]);
    
    return null;
  };
  
  // Default center if no locations are available
  const defaultCenter: [number, number] = [51.505, -0.09];
  const initialCenter = pickupLocation || destinationLocation || driverLocation || defaultCenter;
  
  return (
    <div style={mapWrapperStyle} className="shadow-md">
      <MapContainer
        center={initialCenter}
        zoom={13}
        style={mapContainerStyle}
      >
        <MapController
          pickupLocation={pickupLocation}
          destinationLocation={destinationLocation}
          driverLocation={driverLocation}
        />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Pickup location marker */}
        {pickupLocation && (
          <Marker position={pickupLocation} icon={pickupIcon}>
            <Popup>
              <strong>Pickup Location</strong>
              <br />
              {selectedOrder?.pickup_location && typeof selectedOrder.pickup_location === 'string'
                ? selectedOrder.pickup_location
                : `${pickupLocation[0].toFixed(4)}, ${pickupLocation[1].toFixed(4)}`}
            </Popup>
          </Marker>
        )}
        
        {/* Destination location marker */}
        {destinationLocation && (
          <Marker position={destinationLocation} icon={destinationIcon}>
            <Popup>
              <strong>Destination</strong>
              <br />
              {selectedOrder?.destination_location && typeof selectedOrder.destination_location === 'string'
                ? selectedOrder.destination_location
                : `${destinationLocation[0].toFixed(4)}, ${destinationLocation[1].toFixed(4)}`}
            </Popup>
          </Marker>
        )}
        
        {/* Driver location marker */}
        {driverLocation && (
          <Marker position={driverLocation} icon={driverIcon}>
            <Popup>
              <strong>Driver: {driverDetails?.full_name || 'Unknown'}</strong>
              <br />
              Current Location
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default OrderMapComponent;
