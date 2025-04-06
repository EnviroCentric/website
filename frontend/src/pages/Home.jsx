import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import RegisterForm from '../components/RegisterForm';
import useToken from "@galvanize-inc/jwtdown-for-react";

function Home() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { token } = useToken();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) {
        setUserData(null);
        return;
      }
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/self`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData(null);
      }
    };

    fetchUserData();
  }, [token]);

  // Clear user data when token is removed
  useEffect(() => {
    if (!token) {
      setUserData(null);
    }
  }, [token]);

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
  };

  return (
    <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Hero Section */}
      <section className="min-h-[80vh] flex items-center justify-center text-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg">
        <div className="max-w-3xl p-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            {userData ? `Welcome back, ${userData.first_name}!` : 'Welcome to Your App'}
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
            {userData ? 'Your one-stop solution for amazing experiences' : 'Your one-stop solution for amazing experiences'}
          </p>
          {!userData && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300"
            >
              Get Started
            </button>
          )}
          {userData && (
            <div className="space-y-4">
              <Link
                to="/profile"
                className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300"
              >
                View Profile
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12">
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg hover:-translate-y-2 transition-transform duration-300">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Feature 1</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Description of your first amazing feature
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg hover:-translate-y-2 transition-transform duration-300">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Feature 2</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Description of your second amazing feature
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg hover:-translate-y-2 transition-transform duration-300">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Feature 3</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Description of your third amazing feature
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 text-center bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
          About Us
        </h2>
        <p className="max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Welcome to our platform! We're dedicated to providing the best experience
          for our users. Our mission is to make your life easier and more
          productive.
        </p>
      </section>

      {/* Call to Action */}
      {!userData && (
        <section className="py-16 text-center bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8">
            Join thousands of satisfied users today!
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-block px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-300"
          >
            Sign Up Now
          </button>
        </section>
      )}

      <Modal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)}>
        <RegisterForm
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={handleSwitchToLogin}
        />
      </Modal>
    </div>
  );
}

export default Home; 