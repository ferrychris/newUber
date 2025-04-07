import axios from 'axios';

// Get Mapbox token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Types for Mapbox responses
export interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: {
    accuracy?: string;
    address?: string;
    category?: string;
    maki?: string;
  };
  text: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  context: {
    id: string;
    text: string;
    wikidata?: string;
    short_code?: string;
  }[];
}

export interface MapboxGeocodingResponse {
  type: string;
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export interface MapboxDirectionsResponse {
  routes: {
    distance: number; // in meters
    duration: number; // in seconds
    geometry: any;
    legs: {
      summary: string;
      distance: number;
      duration: number;
      steps: any[];
    }[];
  }[];
  waypoints: {
    name: string;
    coordinates: [number, number];
  }[];
  code: string;
  uuid: string;
}

/**
 * Get geocoding results for an address query
 * @param query The address to search for
 * @param countryFilter Optional country filter (default: 'fr' for France)
 * @param includeTerritories Whether to include French overseas territories (default: true)
 * @returns Promise with Mapbox geocoding results
 */
export const geocodeAddress = async (
  query: string,
  countryFilter: string = 'fr',
  includeTerritories: boolean = true
): Promise<MapboxGeocodingResponse> => {
  if (!query) throw new Error('Query is required');
  if (!MAPBOX_TOKEN) throw new Error('Mapbox token is not configured');

  try {
    // Base params
    const params: Record<string, any> = {
      access_token: MAPBOX_TOKEN,
      language: 'fr',
      limit: 5,
      types: 'address,place',
    };

    // If we want to include territories, use wider search with language filter instead of country
    if (includeTerritories) {
      // World bounding box that includes France and all territories
      // Don't use country filter as it would exclude overseas territories
      params.language = 'fr';
    } else {
      // Just metropolitan France
      params.country = countryFilter;
    }

    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
      { params }
    );
    
    // If we searched globally, filter the results to only include France-related places
    if (includeTerritories && response.data.features.length > 0) {
      response.data.features = response.data.features.filter((feature: MapboxFeature) => {
        // Check if this place is in metropolitan France
        const inFrance = feature.context?.some(ctx => 
          (ctx.short_code || '').toLowerCase() === 'fr'
        );
        
        if (inFrance) return true;
        
        // Check for French territories
        const frenchTerritories = [
          'martinique', 'guadeloupe', 'guyane', 'réunion', 'reunion', 'mayotte', 
          'nouvelle-calédonie', 'nouvelle-caledonie', 'polynésie française', 'polynesie francaise',
          'saint-martin', 'saint-barthélemy', 'saint-barthelemy'
        ];
        
        const placeName = feature.place_name.toLowerCase();
        return frenchTerritories.some(territory => placeName.includes(territory));
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
};

/**
 * Calculate the distance and duration between two coordinates
 * @param origin Origin coordinates [longitude, latitude]
 * @param destination Destination coordinates [longitude, latitude] 
 * @returns Promise with route information
 */
export const calculateRoute = async (
  origin: [number, number],
  destination: [number, number]
): Promise<MapboxDirectionsResponse> => {
  if (!origin || !destination) throw new Error('Origin and destination are required');
  if (!MAPBOX_TOKEN) throw new Error('Mapbox token is not configured');

  const originStr = origin.join(',');
  const destinationStr = destination.join(',');

  try {
    const response = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${originStr};${destinationStr}`,
      {
        params: {
          access_token: MAPBOX_TOKEN,
          geometries: 'geojson',
          overview: 'simplified',
          steps: false,
          language: 'fr',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error calculating route:', error);
    throw error;
  }
};

/**
 * Convert a Mapbox feature to formatted address string
 * @param feature Mapbox feature
 * @returns Formatted address string
 */
export const formatMapboxFeatureAddress = (feature: MapboxFeature): string => {
  return feature.place_name;
};

/**
 * Format distance in meters to human-readable text
 * @param meters Distance in meters
 * @returns Formatted distance string
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
};

/**
 * Format duration in seconds to human-readable text
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)} secondes`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} heure${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : ''}`;
};

/**
 * Check if coordinates are in France or French territories
 * @param coordinates [longitude, latitude]
 * @returns Promise<boolean>
 */
export const isLocationInFrance = async (coordinates: [number, number]): Promise<boolean> => {
  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.join(',')}.json`,
      {
        params: {
          access_token: MAPBOX_TOKEN,
          types: 'country,region',
          limit: 5,
        },
      }
    );
    
    const features = response.data.features;
    if (features && features.length > 0) {
      // Check for metropolitan France
      const isMetropolitanFrance = features.some((feature: MapboxFeature) => {
        // Look for country code in context
        return feature.context?.some(ctx => 
          (ctx.short_code || '').toLowerCase() === 'fr'
        ) || false;
      });

      if (isMetropolitanFrance) return true;
      
      // Check for French overseas territories
      const frenchTerritories = [
        'martinique', 'guadeloupe', 'guyane', 'réunion', 'reunion', 'mayotte', 
        'nouvelle-calédonie', 'nouvelle-caledonie', 'polynésie française', 
        'polynesie francaise', 'saint-martin', 'saint-barthélemy', 'saint-barthelemy'
      ];
      
      // Check if any of the region names contain French territories
      const isFrenchTerritory = features.some((feature: MapboxFeature) => {
        const placeName = feature.place_name.toLowerCase();
        return frenchTerritories.some(territory => placeName.includes(territory));
      });
      
      return isFrenchTerritory;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if location is in France:', error);
    return false;
  }
};
