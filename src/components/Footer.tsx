import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from 'react-icons/fa';

// Placeholder for logo - using the same style as Navbar
const FooterLogo = () => (
  <div className="flex items-center space-x-1">
    <div className="w-5 h-5 bg-[#D95F3B] rounded-sm transform -skew-x-12"></div>
    <span className="text-xl font-bold text-[#D95F3B]">Colctay</span>
  </div>
);

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#F8F4F0] text-gray-600 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo and About */}
          <div className="space-y-4">
            <FooterLogo />
            <p className="text-sm">
              Reliable large item delivery services. Fast, secure, and always on time.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-[#333] mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-[#D95F3B]">Home</Link></li>
              <li><Link to="/services" className="hover:text-[#D95F3B]">Services</Link></li>
              <li><Link to="/about" className="hover:text-[#D95F3B]">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-[#D95F3B]">Contact</Link></li>
              <li><Link to="/faq" className="hover:text-[#D95F3B]">FAQ</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-[#333] mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-[#D95F3B]">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#D95F3B]">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact & Socials */}
          <div>
            <h3 className="font-semibold text-[#333] mb-3">Connect</h3>
            <ul className="space-y-2 text-sm mb-4">
              <li>info@colctay.com</li> 
              <li>+1 234 567 890</li>
            </ul>
            <div className="flex space-x-3">
              <a href="#" className="text-gray-500 hover:text-[#D95F3B]"><FaFacebookF size={18}/></a>
              <a href="#" className="text-gray-500 hover:text-[#D95F3B]"><FaTwitter size={18}/></a>
              <a href="#" className="text-gray-500 hover:text-[#D95F3B]"><FaInstagram size={18}/></a>
              <a href="#" className="text-gray-500 hover:text-[#D95F3B]"><FaLinkedinIn size={18}/></a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 pt-8 text-center text-sm">
          &copy; {currentYear} Colctay. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer; 