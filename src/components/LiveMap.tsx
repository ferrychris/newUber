import React, { useState } from 'react';
import Map, { Marker, Popup, ViewState, ViewStateChangeEvent } from 'react-map-gl';
import { Bike, Car, Truck, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { VehicleType } from '../types/vehicle';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZnJldGxhIiwiYSI6ImNsczg2ZXBxODE4NjYya3FwZzZ1NXZ2YXIifQ.0rHAW0H6RHUaQZVh2WOcRA';

type VehicleTypeKey = 'bike' | 'motorcycle' | 'car' | 'van' | 'truck';

interface Vehicle {
  id: string;
  type: VehicleTypeKey;
  currentLocation: {
    lat: number;
    lng: number;
  };
  capacity: {
    weight: number;
    volume: number;
  };
}

const VEHICLE_ICONS: Record<VehicleTypeKey, LucideIcon> = {
  bike: Bike,
  motorcycle: Bike,
  car: Car,
  van: Package,
  truck: Truck
};

const VEHICLE_COLORS: Record<VehicleTypeKey, string> = {
  bike: '#10B981',
  motorcycle: '#F59E0B',
  car: '#4F46E5',
  van: '#7C3AED',
  truck: '#EC4899'
};

interface LiveMapProps {
  vehicles: Vehicle[];
  onVehicleSelect: (vehicle: Vehicle) => void;
}

export default function LiveMap({ vehicles, onVehicleSelect }: LiveMapProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [viewport, setViewport] = useState<ViewState>({
    latitude: 14.616065,
    longitude: -61.05878,
    zoom: 11,
    bearing: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
    pitch: 0
  });

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    onVehicleSelect(vehicle);
  };

  const getVehicleLabel = (type: VehicleTypeKey) => {
    const labels: Record<VehicleTypeKey, string> = {
      bike: 'Vélo',
      motorcycle: 'Moto',
      car: 'Voiture',
      van: 'Utilitaire',
      truck: 'Camion'
    };
    return labels[type];
  };

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden shadow-lg">
      <Map
        {...viewport}
        onMove={(evt: ViewStateChangeEvent) => setViewport(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {vehicles.map((vehicle) => {
          const Icon = VEHICLE_ICONS[vehicle.type];
          return (
            <Marker
              key={vehicle.id}
              latitude={vehicle.currentLocation.lat}
              longitude={vehicle.currentLocation.lng}
              onClick={() => handleVehicleClick(vehicle)}
            >
              <div className="relative cursor-pointer transform hover:scale-110 transition-transform marker-pulse">
                <div 
                  className="p-2 rounded-full shadow-lg transition-custom"
                  style={{ backgroundColor: VEHICLE_COLORS[vehicle.type] }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Marker>
          );
        })}

        {selectedVehicle && (
          <Popup
            latitude={selectedVehicle.currentLocation.lat}
            longitude={selectedVehicle.currentLocation.lng}
            onClose={() => setSelectedVehicle(null)}
            closeButton={true}
            closeOnClick={false}
            className="bg-white rounded-lg shadow-lg p-4 animate-fade-in"
          >
            <div className="space-y-2">
              <h3 className="font-semibold">
                {getVehicleLabel(selectedVehicle.type)}
              </h3>
              <p className="text-sm text-gray-600">
                Capacité: {selectedVehicle.capacity.weight}kg / {selectedVehicle.capacity.volume}m³
              </p>
              <button
                onClick={() => onVehicleSelect(selectedVehicle)}
                className="btn-primary"
              >
                Réserver maintenant
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}