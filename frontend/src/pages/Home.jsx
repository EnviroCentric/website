import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import Register from './Register';

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const { user } = useAuth();

  const handleSwitchToLogin = (message) => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
    if (message) {
      setLoginMessage(message);
    }
  };

  const handleSwitchToRegister = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
    setLoginMessage('');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Services Section */}
        <section className="py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12">
            Our Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Service One</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Comprehensive solutions for your needs
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Service Two</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Expert assistance and support
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Service Three</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Professional guidance and solutions
              </p>
            </div>
          </div>
        </section>

        {/* Company Info Section */}
        <section className="py-16 text-center bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
              About Our Company
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Service Areas</h3>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Serving customers worldwide
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Our Expertise</h3>
                <ul className="text-lg text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Expert Consultants</li>
                  <li>Professional Team</li>
                  <li>Quality Assurance</li>
                  <li>Customer Support</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Information Section */}
        <section className="py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12">
            Contact Us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Office Information</h3>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>123 Business Street</p>
                <p>City, State 12345</p>
                <p>Phone: (555) 123-4567</p>
                <p>Email: info@company.com</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Business Hours</h3>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
                <p>Saturday: 10:00 AM - 2:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials Section */}
        <section className="py-16 text-center bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12">
            Our Credentials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Licenses</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>State License #12345</li>
                <li>Federal License #67890</li>
                <li>Professional Certification #ABC123</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Certifications</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>ISO 9001 Certified</li>
                <li>Industry Standard Certified</li>
                <li>Safety Certified</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Affiliations</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>Industry Association Member</li>
                <li>Professional Organization</li>
                <li>Chamber of Commerce</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        {!user && (
          <section className="py-16 text-center bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-white mb-8">
                Join our community of satisfied users today!
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="inline-block px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-300"
                >
                  Sign Up Now
                </button>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="inline-block px-8 py-4 bg-indigo-700 text-white font-semibold rounded-lg hover:bg-indigo-800 transition-colors duration-300"
                >
                  Sign In
                </button>
              </div>
            </div>
          </section>
        )}

        {/* User Actions Section */}
        {user && (
          <section className="py-16 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                Welcome back, {user.first_name.charAt(0).toUpperCase() + user.first_name.slice(1)}!
              </h2>
              <div className="space-x-4">
                <Link
                  to="/profile"
                  className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300"
                >
                  View Profile
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-block px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-300"
                >
                  Go to Dashboard
                </Link>
          </div>
        </div>
          </section>
        )}
      </div>

      <Login 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={handleSwitchToRegister}
        successMessage={loginMessage}
      />
      <Register 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
} 