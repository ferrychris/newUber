export interface VehicleType {
  id: string;
  name: string;
  maxWeight: number; // en kg
  maxVolume: number; // en m3
  description: string;
  requirements: string[];
  insuranceLevel: 'basic' | 'medium' | 'premium';
}

export interface Freter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleType: string;
  licenseNumber: string;
  insuranceNumber: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  completedDeliveries: number;
  documents: {
    drivingLicense: string;
    insurance: string;
    vehicleRegistration: string;
    identityProof: string;
  };
}

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'bike',
    name: 'Vélo',
    maxWeight: 20,
    maxVolume: 0.1,
    description: 'Pour les petites livraisons écologiques',
    requirements: [
      'Vélo en bon état',
      'Équipement de sécurité',
      'Assurance responsabilité civile'
    ],
    insuranceLevel: 'basic'
  },
  {
    id: 'motorcycle',
    name: 'Moto',
    maxWeight: 50,
    maxVolume: 0.3,
    description: 'Pour les livraisons rapides et urgentes',
    requirements: [
      'Permis A',
      'Assurance deux-roues',
      'Moto de moins de 5 ans'
    ],
    insuranceLevel: 'basic'
  },
  {
    id: 'car',
    name: 'Voiture',
    maxWeight: 200,
    maxVolume: 1.5,
    description: 'Pour le covoiturage et petites livraisons',
    requirements: [
      'Permis B',
      'Assurance personnelle',
      'Véhicule de moins de 10 ans'
    ],
    insuranceLevel: 'basic'
  },
  {
    id: 'van',
    name: 'Utilitaire',
    maxWeight: 800,
    maxVolume: 6,
    description: 'Pour les livraisons moyennes et déménagements',
    requirements: [
      'Permis B',
      'Assurance professionnelle',
      'Véhicule de moins de 8 ans',
      'Carte professionnelle'
    ],
    insuranceLevel: 'medium'
  },
  {
    id: 'truck',
    name: 'Camion',
    maxWeight: 3500,
    maxVolume: 20,
    description: 'Pour les grandes livraisons et déménagements',
    requirements: [
      'Permis C',
      'Assurance transport professionnel',
      'FIMO/FCO à jour',
      'Carte chronotachygraphe'
    ],
    insuranceLevel: 'premium'
  }
];