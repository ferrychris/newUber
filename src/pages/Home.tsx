import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// import { Player } from "@lottiefiles/react-lottie-player"; // No longer needed
// import { DotLottieReact } from '@lottiefiles/dotlottie-react'; // No longer needed
import Navbar from "../components/Navbar";
import { TruckIcon, ShieldCheckIcon, ClockIcon, CubeIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { FaFacebookF, FaTwitter, FaInstagram } from 'react-icons/fa'; // Import social icons
import heroImage from '../components/home/sections/imageside.png'; // Import the local image
import Footer from '../components/Footer'; // Import the Footer component
import { motion } from 'framer-motion'; // Import motion

// Animation Variants
const fadeInSlideUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

// Define featuresData array outside the component - Remove emojis from titles
const featuresData = [
  {
    icon: <TruckIcon className="w-6 h-6" />, 
    title: "Fast & Reliable Same-Day Delivery",
    description: "Get your large items delivered the same day within the city—our network of drivers ensures quick service."
  },
  {
    icon: <ShieldCheckIcon className="w-6 h-6" />,
    title: "Expert Heavy Item Handling",
    description: "Professional drivers trained to move bulky, fragile, and industrial equipment with care."
  },
  {
    icon: <ClockIcon className="w-6 h-6" />,
    title: "Real-Time Driver Tracking",
    description: "Know exactly where your delivery is with live GPS updates from your assigned driver."
  },
  {
    icon: <CubeIcon className="w-6 h-6" />,
    title: "No Job Too Big",
    description: "From furniture and appliances to machinery and oversized cargo—we handle it all."
  },
  {
    icon: <ChatBubbleLeftRightIcon className="w-6 h-6" />,
    title: "Dedicated Support Team",
    description: "24/7 assistance to coordinate deliveries, resolve issues, and keep you informed."
  }
];

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Effect to check if user is already logged in and redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      // If user is authenticated, redirect based on role
      if (user.role === 'driver') {
        console.log('User is a driver, redirecting to driver dashboard');
        navigate('/driver/dashboard');
      } else if (user.role === 'admin') {
        console.log('User is an admin, redirecting to admin dashboard');
        navigate('/admin/dashboard');
      } else {
        // Default to customer dashboard
        console.log('User is a customer, redirecting to customer dashboard');
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-[#F8F4F0] text-[#333]">
      <Navbar />
      
      {/* Hero Section - Redesigned with Background Pattern */}
      <section 
        className="relative min-h-screen flex bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]"
      >
        {/* Radial Gradient Overlay - Use orange-100 */}
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,theme(colors.orange.100),transparent)]"></div>
        
        {/* Main Hero Content Container - Add relative and z-10 */}
        <div className="container relative z-10 mx-auto px-4 pt-8 pb-10 flex flex-col lg:flex-row items-center gap-8">
          {/* Left Content Area */}
          <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
            <p className="text-sm text-gray-500 uppercase tracking-wider">Rove ay Urarert</p>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-[#D95F3B]">
              Reliable delivery,
              <span className="block">every time</span>
            </h1>
            <p className="text-lg text-gray-600">
              Fast and secure delivery for all your large item needs
            </p>
            <motion.button 
              className="bg-[#D95F3B] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#C8532F] transition-colors duration-300"
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
            
            {/* Footer Links & Socials */}
            <div className="pt-8 flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
              <div className="flex gap-4">
                <a href="#" className="hover:text-[#D95F3B]">Privacy Policy</a>
                <a href="#" className="hover:text-[#D95F3B]">Terms of Service</a>
                <a href="#" className="hover:text-[#D95F3B]">FAQ</a>
              </div>
              <div className="flex gap-4">
                <a href="#" className="bg-white p-2 rounded-full shadow hover:shadow-md transition-shadow"><FaFacebookF className="text-[#D95F3B]"/></a>
                <a href="#" className="bg-white p-2 rounded-full shadow hover:shadow-md transition-shadow"><FaTwitter className="text-[#D95F3B]"/></a>
                <a href="#" className="bg-white p-2 rounded-full shadow hover:shadow-md transition-shadow"><FaInstagram className="text-[#D95F3B]"/></a>
              </div>
            </div>
          </div>
          
          {/* Right Image Area */}
          <div className="lg:w-1/2 relative mt-8 lg:mt-0">
            <img 
              // src="https://img.freepik.com/free-photo/delivery-truck-with-packages-back_1340-37281.jpg?t=st=1719591906~exp=1719595506~hmac=e5e5a694f18b396200e84e42774a18663396a4a40e619e10ae92c78552164022&w=1380" // Replace with your actual truck image URL
              src={heroImage} // Use the imported image variable
              alt="Delivery truck with boxes"
              className="w-full h-auto object-contain rounded-lg"
              // Removed shadow from image itself
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            Why Choose Us?
          </h2>
          {/* Stagger wrapper for feature cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {/* Map over featuresData */}
            {featuresData.map((feature, index) => (
              <motion.div 
                key={index} 
                variants={fadeInSlideUp}
                className="group bg-white p-6 rounded-2xl flex items-start gap-4 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:transform hover:-translate-y-1 transition-colors duration-300 shadow-xl hover:shadow-2xl"
              >
                <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 w-12 h-12 rounded-lg flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-md font-semibold mb-1 text-gray-900 group-hover:text-white">{feature.title}</h3> 
                  <p className="text-gray-600 text-sm group-hover:text-white">{feature.description}</p> 
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services Section - Updated Pricing */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">Simple, Transparent Pricing</h2>
          <div className="flex justify-center">
            {/* Pricing card already has animation */}
            <motion.div 
              className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-10 rounded-2xl shadow-xl shadow-orange-500/30 max-w-lg w-full"
              variants={fadeInSlideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <h3 className="text-3xl font-bold mb-4 text-center">Large Item Transport</h3>
              <p className="text-center text-orange-100 mb-6">Fair pricing based on distance, with a clear minimum.</p>
              <div className="flex justify-around items-center mb-8 text-center">
                <div>
                  <p className="text-4xl font-bold">€1.00</p>
                  <p className="text-orange-200">per kilometer</p>
                </div>
                <div className="border-l border-orange-400 h-16 mx-4"></div>
                <div>
                  <p className="text-4xl font-bold">€15</p>
                  <p className="text-orange-200">minimum charge</p>
                </div>
              </div>
              <p className="text-sm text-center text-orange-200 mb-8">
                Applies to furniture, appliances, commercial equipment, and more. No hidden fees.
              </p>
              {/* Add animation to Pricing Button */}
              <motion.button 
                className="w-full py-3 rounded-lg text-lg font-semibold bg-white text-orange-600 hover:bg-gray-50 transition-all duration-300 shadow-md"
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
              >
                Get an Instant Quote
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
        {/* Add animation to CTA content */}
        <motion.div 
          className="container mx-auto px-4 text-center"
          variants={fadeInSlideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-8 text-white">Choose Your Delivery Partner</h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
            Browse profiles, ratings, and vehicle types to find the perfect match for your large item delivery needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {/* Add animation to CTA Button */}
            <motion.button 
              className="bg-white text-orange-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-md"
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
            >
              View Available Drivers
            </motion.button>
          </div>
        </motion.div>
      </section>
      
      {/* Add the Footer component */}
      <Footer /> 
    </div>
  );
}
