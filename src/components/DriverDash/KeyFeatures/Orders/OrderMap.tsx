import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Button } from '@mui/material';
import { Navigation as NavigationIcon } from '@mui/icons-material';

interface OrderMapProps {
  pickupLocation: string;
  dropoffLocation: string;
}

// Note: Replace with your actual Mapbox token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function OrderMap({ pickupLocation, dropoffLocation }: OrderMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token is not available');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initializeMap = async () => {
      try {
        if (!mapContainer.current) {
          console.error('Map container is not available');
          return;
        }

        // Convert addresses to coordinates using Mapbox Geocoding API
        const [pickupCoords, dropoffCoords] = await Promise.all([
          getCoordinates(pickupLocation),
          getCoordinates(dropoffLocation)
        ]);

        if (!pickupCoords || !dropoffCoords) {
          console.error('Could not get coordinates for locations');
          return;
        }

        // Initialize map
        if (!map.current) {
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: pickupCoords,
            zoom: 12
          });
        }

        // Wait for map to load before adding markers and route
        map.current.on('load', () => {
          if (!map.current) return;

          // Add markers
          new mapboxgl.Marker({ color: '#2196f3' })
            .setLngLat(pickupCoords)
            .addTo(map.current);

          new mapboxgl.Marker({ color: '#4caf50' })
            .setLngLat(dropoffCoords)
            .addTo(map.current);

          // Get and add route
          getRoute(pickupCoords, dropoffCoords).then(route => {
            if (!route || !map.current) return;

            // Add route source and layer
            if (!map.current.getSource('route')) {
              map.current.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: route
                  }
                }
              });

              map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': '#888',
                  'line-width': 6
                }
              });
            }

            // Fit bounds to show entire route
            const bounds = new mapboxgl.LngLatBounds();
            route.forEach(coord => bounds.extend(coord));
            map.current.fitBounds(bounds, { padding: 50 });
          });
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Initialize map after a short delay to ensure container is ready
    const timer = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [pickupLocation, dropoffLocation]);

  const handleNavigate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const url = `https://www.google.com/maps/dir/${latitude},${longitude}/${encodeURIComponent(pickupLocation)}`;
        window.open(url, '_blank');
      });
    }
  };

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      <div ref={mapContainer} style={{ height: '100%' }} />
      <Button
        variant="contained"
        startIcon={<NavigationIcon />}
        onClick={handleNavigate}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
        }}
      >
        Navigate
      </Button>
    </Box>
  );
}

async function getCoordinates(address: string): Promise<[number, number] | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].center;
    }
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

async function getRoute(start: [number, number], end: [number, number]): Promise<[number, number][] | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
    );
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates;
    }
    return null;
  } catch (error) {
    console.error('Error getting route:', error);
    return null;
  }
}
