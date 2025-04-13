import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Modal from './Modal';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const navigation = [
  { name: "Home", href: "/", current: true }
];

const userMenuOptions = [
  { name: "Profile", href: "/profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { name: "Update Profile", href: "/profile/update", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { name: "Manage Users", href: "/manage-users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", securityLevel: 10 },
  { name: "Manage Roles", href: "/manage-roles", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", securityLevel: 10 },
  { name: "Access Management", href: "/access-management", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", securityLevel: 10 },
  { name: "Logout", action: "logout", icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" }
];

function Navbar() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [changed, setChanged] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const onNav = () => {
    for (let nav of navigation) {
      if (nav.href === location.pathname) {
        nav.current = true;
      } else {
        nav.current = false;
      }
    }
    setChanged(!changed);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    setShowLoginModal(false);
    setShowRegisterModal(false);
    setLoginSuccessMessage("");
    navigate('/');
  };

  const switchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
    setLoginSuccessMessage("");
  };

  const switchToLogin = (message) => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
    setLoginSuccessMessage(message || "");
  };

  useEffect(() => {
    onNav();
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUserMenuAction = (option) => {
    if (option.action === "logout") {
      handleLogout();
    }
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 shadow-lg w-full fixed top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-gray-800 dark:text-white">
                New App
              </Link>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8 ml-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      item.current
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    } px-3 py-2 rounded-md text-sm font-medium`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
              >
                {isDarkMode ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{user.first_name}</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
                      <div className="py-1" role="menu">
                        {userMenuOptions.map((option) => {
                          // Skip options that require higher security level
                          if (option.securityLevel && !user.roles?.some(role => role.name === 'admin')) {
                            return null;
                          }
                          
                          return option.action ? (
                            <button
                              key={option.name}
                              onClick={() => handleUserMenuAction(option)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              role="menuitem"
                            >
                              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                              </svg>
                              {option.name}
                            </button>
                          ) : (
                            <Link
                              key={option.name}
                              to={option.href}
                              onClick={() => handleUserMenuAction(option)}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              role="menuitem"
                            >
                              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                              </svg>
                              {option.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {!isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                } block px-3 py-2 rounded-md text-base font-medium`}
              >
                {item.name}
              </Link>
            ))}
            {user && user.roles?.some(role => role.name === 'admin') && (
              <Link
                to="/manage-users"
                className="text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                Manage Users
              </Link>
            )}
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLoginModal(true);
                }}
                className="w-full text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)}>
        <LoginForm 
          onClose={() => setShowLoginModal(false)}
          onSwitchToRegister={switchToRegister}
          onLoginSuccess={() => setShowLoginModal(false)}
          successMessage={loginSuccessMessage}
        />
      </Modal>

      <Modal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)}>
        <RegisterForm
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={switchToLogin}
        />
      </Modal>
    </>
  );
}

export default Navbar;
