import React, { useState } from 'react';
import { MapPin, Calendar, Clock, Users } from 'lucide-react';

interface RideShareFormData {
  departure: string;
  destination: string;
  date: string;
  time: string;
  seats: number;
  description: string;
}

export default function RideShareForm() {
  const [formData, setFormData] = useState<RideShareFormData>({
    departure: '',
    destination: '',
    date: '',
    time: '',
    seats: 1,
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('RideShare data:', formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-xl p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Proposer un trajet</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Lieu de départ</label>
            <div className="mt-1 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-indigo-500" />
              <input
                type="text"
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Saisissez le lieu de départ"
                value={formData.departure}
                onChange={(e) => setFormData({...formData, departure: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Destination</label>
            <div className="mt-1 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-indigo-500" />
              <input
                type="text"
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Saisissez la destination"
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <div className="mt-1 relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-indigo-500" />
              <input
                type="date"
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Heure</label>
            <div className="mt-1 relative">
              <Clock className="absolute left-3 top-3 h-5 w-5 text-indigo-500" />
              <input
                type="time"
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de places</label>
            <div className="mt-1 relative">
              <Users className="absolute left-3 top-3 h-5 w-5 text-indigo-500" />
              <input
                type="number"
                min="1"
                max="8"
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.seats}
                onChange={(e) => setFormData({...formData, seats: parseInt(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Informations complémentaires</label>
          <textarea
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={3}
            placeholder="Détails sur le trajet, points d'arrêt possibles..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Users className="h-5 w-5 mr-2" />
          Publier le trajet
        </button>
      </form>
    </div>
  );
}