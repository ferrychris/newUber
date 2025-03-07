export interface Vehicle {
  id: string;
  type: 'car' | 'van' | 'truck';
  capacity: {
    volume: number; // en m3
    weight: number; // en kg
  };
  currentLocation: {
    lat: number;
    lng: number;
  };
}

export interface Shipment {
  id: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  delivery: {
    address: string;
    lat: number;
    lng: number;
  };
  cargo: {
    volume: number;
    weight: number;
    description: string;
  };
  status: 'pending' | 'accepted' | 'in-transit' | 'delivered';
}