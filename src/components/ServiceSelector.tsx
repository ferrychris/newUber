import React from 'react';
import { Package, ShoppingBag, Truck, Users } from 'lucide-react';

interface ServiceOption {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const services: ServiceOption[] = [
  {
    id: 'rideshare',
    icon: Users,
    title: 'Covoiturage',
    description: 'Partagez vos trajets quotidiens'
  },
  {
    id: 'small',
    icon: Package,
    title: 'Colis & Petits volumes',
    description: 'Pour vos colis et petits objets'
  },
  {
    id: 'shopping',
    icon: ShoppingBag,
    title: 'Courses & Repas',
    description: 'Livraison de courses et repas'
  },
  {
    id: 'large',
    icon: Truck,
    title: 'Grands volumes',
    description: 'Déménagement et gros objets'
  }
];

export default function ServiceSelector({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => onSelect(service.id)}
          className="flex items-center p-4 border-2 border-indigo-100 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
        >
          <service.icon className="h-8 w-8 text-indigo-600 mr-4" />
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{service.title}</h3>
            <p className="text-sm text-gray-600">{service.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}