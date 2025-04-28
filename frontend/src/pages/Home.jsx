import React, { useEffect, useState } from 'react';
import logo from '../assets/logo.png';

export default function Home() {
  const [logoStyle, setLogoStyle] = useState({
    height: '400px',
    opacity: 1,
    transform: 'translateY(0)',
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const maxScroll = 400;
      const minSize = 48;
      const maxSize = 400;
      
      const progress = Math.min(1, scrollPosition / maxScroll);
      const newHeight = maxSize - (progress * (maxSize - minSize));
      const opacity = Math.max(0, 1 - (progress * 1.5));
      const translateY = -progress * 100;

      setLogoStyle({
        height: `${newHeight}px`,
        opacity,
        transform: `translateY(${translateY}px)`,
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Large Logo Section */}
      <div className="flex justify-center items-center h-[70vh] relative">
        <img 
          src={logo} 
          alt="Enviro-Centric Logo" 
          className="transition-all duration-300 absolute bottom-0"
          style={{
            ...logoStyle,
            width: 'auto',
            transition: 'all 0.1s ease-out',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6" style={{ marginTop: '-50px' }}>
        {/* Services Section */}
        <section className="py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12">
            Our Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Asbestos</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Inspections/Surveys, Clearances & Project Monitoring
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Lead</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Inspections, Risk Assessments, Clearances & Project Monitoring
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Microbial</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Inspections/Surveys & Clearances
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
                  Serving all of California
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Our Expertise</h3>
                <ul className="text-lg text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Asbestos Consultants</li>
                  <li>CDPH Lead Inspectors</li>
                  <li>Risk Assessors</li>
                  <li>Project Monitors</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials and Contact Section */}
        <section className="py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12">
            Our Information
          </h2>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Credentials Section */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Our Credentials
                </h3>
                <div className="flex flex-col space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Licenses</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      CAC 23-7444<br />
                      LRC 00002495
                    </p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">NAICS Codes</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      236220, 238320, 238910,<br />
                      238990, 541350, 541380,<br />
                      54162
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Contact Us
                </h3>
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                  <p>Phone: (714) 335-5973</p>
                  <p>Phone: (619) 779-1698</p>
                  <p>Email: info@enviro-centric.com</p>
                  <p>P.O. Box 122202</p>
                  <p>Chula Vista, CA 91912</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 