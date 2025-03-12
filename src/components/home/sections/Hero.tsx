import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaShieldAlt, FaMapMarkerAlt, FaClock, FaEuroSign } from "react-icons/fa";

const features = [
  { icon: <FaShieldAlt className="w-6 h-6 text-sunset" />, title: "Sécurité Garantie", description: "Transport sécurisé pour tous vos besoins" },
  { icon: <FaMapMarkerAlt className="w-6 h-6 text-green-500" />, title: "Suivi en Temps Réel", description: "Suivez vos livraisons en direct" },
  { icon: <FaClock className="w-6 h-6 text-purple-500" />, title: "Service 24/7", description: "Disponible à tout moment" },
  { icon: <FaEuroSign className="w-6 h-6 text-sunset" />, title: "Prix Compétitifs", description: "Tarifs transparents dès 0,50€/km" }
];

const Hero = () => {
  return (
    <div className="relative h-full w-full bg-white">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="h-full w-full bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mt-[30px]">
              <span className="block">Solutions de Transport</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sunset to-purple-500">
                Simples et Efficaces
              </span>
            </h1>
            <p className="mt-9 text-lg text-gray-600 dark:text-gray-300 max-w-xl">
              Des services de transport adaptés à vos besoins : covoiturage, livraison de courses, transport d'objets volumineux.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/register" className="px-6 py-3 rounded-md text-white bg-gradient-to-r from-sunset to-purple-500 hover:opacity-90 font-medium">
                Commander maintenant
              </Link>
              <Link to="/services" className="px-6 py-3 rounded-md border border-sunset text-sunset hover:bg-sunset/10 font-medium">
                Nos Services
              </Link>
            </div>
          </motion.div>

          {/* Right Column - Features Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                    {React.cloneElement(feature.icon, { className: "w-8 h-8" })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
