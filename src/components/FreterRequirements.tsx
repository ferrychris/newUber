import React from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { VEHICLE_TYPES } from '../types/vehicle';

export default function FreterRequirements() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center mb-6">
        <Shield className="h-8 w-8 text-indigo-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">
          Rejoignez la communauté des Freters
        </h2>
      </div>

      <p className="text-gray-600 mb-8">
        Les Freters sont notre communauté de transporteurs certifiés. 
        Chaque membre est vérifié et assuré pour garantir un service de qualité et sécurisé.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {VEHICLE_TYPES.map((type) => (
          <div key={type.id} className="border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">{type.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{type.description}</p>
            
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">Capacité max :</span>
                <ul className="mt-1 space-y-1">
                  <li>• {type.maxWeight} kg</li>
                  <li>• {type.maxVolume} m³</li>
                </ul>
              </div>

              <div>
                <span className="text-sm font-medium">Prérequis :</span>
                <ul className="mt-1 space-y-1">
                  {type.requirements.map((req, index) => (
                    <li key={index} className="text-sm flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-indigo-50 rounded-lg">
        <h4 className="font-semibold text-indigo-900 mb-2">
          Pourquoi devenir Freter ?
        </h4>
        <ul className="text-indigo-700 space-y-2">
          <li>• Rejoignez une communauté de professionnels certifiés</li>
          <li>• Optimisez vos trajets et réduisez les véhicules vides</li>
          <li>• Bénéficiez d'une assurance adaptée à votre activité</li>
          <li>• Développez votre activité avec une clientèle locale</li>
        </ul>
      </div>
    </div>
  );
}