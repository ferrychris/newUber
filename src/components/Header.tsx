import React from 'react';
import { Truck, Menu, User, Package } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-white" />
            <span className="ml-2 text-2xl font-bold">FRETLA</span>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-white hover:text-indigo-200">Expédier</a>
            <a href="#" className="text-white hover:text-indigo-200">Suivre</a>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-indigo-500">
              <User className="h-6 w-6 text-white" />
            </button>
            <button className="md:hidden p-2 rounded-full hover:bg-indigo-500">
              <Menu className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}