import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

mapboxgl.accessToken = "YOUR_MAPBOX_ACCESS_TOKEN"; // Replace with your API key

const LocationAutocomplete = ({ onSelect }: { onSelect: (location: any) => void }) => {
  const geocoderRef = useRef<HTMLDivElement>(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (!geocoderRef.current) return;

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      types: "place,postcode,address",
      marker: false, // Don't add marker automatically
    });

    geocoder.addTo(geocoderRef.current);

    geocoder.on("result", (e) => {
      const location = {
        lat: e.result.center[1],
        lng: e.result.center[0],
        address: e.result.place_name,
      };
      setSelectedLocation(location);
      onSelect(location);
    });

    return () => geocoder.remove();
  }, []);

  return (
    <div>
      <div ref={geocoderRef} className="w-full border p-2" />
      {selectedLocation && (
        <p className="text-sm mt-2">
          Selected Location: {selectedLocation.address}
        </p>
      )}
    </div>
  );
};

export default LocationAutocomplete;
