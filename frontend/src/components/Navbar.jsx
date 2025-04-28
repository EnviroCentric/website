import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo.png';

export default function Navbar() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [navbarStyle, setNavbarStyle] = useState({
    opacity: 0,
    transform: 'translateY(20px)',
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const maxScroll = 400;
      
      const progress = Math.min(1, scrollPosition / maxScroll);
      // Only start appearing when progress is > 0.7 (70% scrolled)
      const adjustedProgress = Math.max(0, (progress - 0.7) / 0.3);
      const opacity = Math.min(1, adjustedProgress * 1.5);
      const translateY = (1 - adjustedProgress) * 20;

      setNavbarStyle({
        opacity,
        transform: `translateY(${translateY}px)`,
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Empty div for spacing */}
          <div className="w-8"></div>
          
          {/* Centered Logo with smooth transition */}
          <div className="flex-1 flex justify-center">
            <Link to="/" className="flex items-center">
              <img 
                src={logo} 
                alt="Enviro-Centric Logo" 
                className="h-12 w-auto transition-all duration-300"
                style={{
                  ...navbarStyle,
                  transition: 'all 0.1s ease-out',
                }}
              />
            </Link>
          </div>

          {/* Dark/Light Mode Toggle */}
          <div className="flex items-center">
            <button
              onClick={handleThemeToggle}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
