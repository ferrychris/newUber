import React, { useState } from 'react';
import { MapPin, Calendar, Clock, Package } from 'lucide-react';
import ServiceSelector from './ServiceSelector';
import RideShareForm from './RideShareForm';

export default function ShipmentForm() {
  const [selectedService, setSelectedService] = useState('');
  const [formData, setFormData] = useState({
    serviceType: '',
    pickupAddress: '',
    deliveryAddress: '',
    date: '',
    time: '',
    volume: '',
    weight: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Shipment data:', formData);
  };

  if (selectedService === 'rideshare') {
    return <RideShareForm />;
  }

  return (
    <div className="bg-white rounded-xl shadow-xl p-8 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Réserver votre transport</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <ServiceSelector 
          onSelect={(serviceType) => {
            setSelectedService(serviceType);
            setFormData({...formData, serviceType});
          }} 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="animate-slide-in" style={{animationDelay: '0.1s'}}>
            <label className="block text-sm font-medium text-gray-700">Adresse de départ</label>
            <div className="mt-1 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-indigo-500" />
              <input
                type="text"
                className="input-custom"
                placeholder="Saisissez l'adresse de départ"
                value={formData.pickupAddress}
                onChange={(e) => setFormData({...formData, pickupAddress: e.target.value})}
              />
            </div>
          </div>

          <div className="animate-slide-in" style={{animationDelay: '0.2s'}}>
            <label className="block text-sm font-medium text-gray-700">Adresse d'arrivée</label>
            <div className="mt-1 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-indigo-500" />
              <input
                type="text"
                className="input-custom"
                placeholder="Saisissez l'adresse d'arrivée"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({...formData, deliveryAddress: e.target.value})}
              />
            </div>
          </div>

          {/* ... autres champs ... */}
        </div>

        <button type="submit" className="btn-primary">
          <Package className="h-5 w-5 mr-2" />
          Réserver maintenant
        </button>
      </form>
    </div>
  );
}