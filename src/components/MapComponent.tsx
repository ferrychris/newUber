// import React, { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import {useState, useEffect, useRef} from "react";
import LocationAutocomplete from "./LocationAutocomplete";

mapboxgl.accessToken = "YOUR_MAPBOX_ACCESS_TOKEN"; // Replace with your API key

const MapComponent = () => {
  const mapContainerRef = useRef(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (mapContainerRef.current) {
      const newMap = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [-0.1276, 51.5072], // Default to London
        zoom: 12,
      });
      setMap(newMap);
    }
  }, []);

  useEffect(() => {
    if (map && location) {
      map.flyTo({ center: [location.lng, location.lat], zoom: 14 });

      new mapboxgl.Marker()
        .setLngLat([location.lng, location.lat])
        .addTo(map);
    }
  }, [location]);

  return (
    <div>
      <LocationAutocomplete onSelect={setLocation} />
      <div ref={mapContainerRef} className="w-full h-96 mt-4" />
    </div>
  );
};

export default MapComponent;
