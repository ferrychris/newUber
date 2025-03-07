import React from 'react';
import { Truck, ShoppingBag, Package, Users } from 'lucide-react';
import ServiceCard from './ServiceCard';

const services = [
  {
    icon: Users,
    title: "Covoiturage",
    description: "Partagez vos trajets quotidiens"
  },
  {
    icon: Package,
    title: "Colis & Petits volumes",
    description: "Livraison rapide de vos colis"
  },
  {
    icon: ShoppingBag,
    title: "Courses & Repas",
    description: "Vos courses livrées à domicile"
  },
  {
    icon: Truck,
    title: "Grands volumes",
    description: "Transport de meubles et déménagement"
  }
];

export default function ServiceGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
      {services.map((service, index) => (
        <ServiceCard key={index} {...service} />
      ))}
    </div>
  );
}