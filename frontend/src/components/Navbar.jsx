import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo.png';
import Login from '../pages/Login';
import Register from '../pages/Register';

const navigation = [
  { name: "Home", href: "/", current: true },
  { name: "Projects", href: "/projects", current: false }
];

const userMenuOptions = [
  { name: "Profile", href: "/profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { name: "User Management", href: "/user-management", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { name: "Logout", action: "logout", icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" }
];

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const [navbarStyle, setNavbarStyle] = useState({
    opacity: 0,
    transform: 'translate(0, 0)',
  });

  const isHomePage = location.pathname === '/';
  const isSuperuser = user?.is_superuser || user?.roles?.some(role => role.name.toLowerCase() === 'admin');

  const getUserInitials = () => {
    if (!user?.first_name && !user?.last_name) return null;
    
    const firstInitial = user.first_name ? user.first_name[0].toUpperCase() : '';
    const lastInitial = user.last_name ? user.last_name[0].toUpperCase() : '';
    return `${firstInitial}${lastInitial}`;
  };

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

  useEffect(() => {
    onNav();
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (isHomePage) {
        const scrollPosition = window.scrollY;
        const maxScroll = 400;
        
        const progress = Math.min(1, scrollPosition / maxScroll);
        // Start appearing when progress is > 0.7 (70% scrolled)
        const adjustedProgress = Math.max(0, (progress - 0.7) / 0.3);
        const opacity = Math.min(1, adjustedProgress * 1.5);

        setNavbarStyle({
          opacity,
          transform: 'translate(0, 0)',
        });
      } else {
        // Always show logo on non-home pages
        setNavbarStyle({
          opacity: 1,
          transform: 'translate(0, 0)',
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Set initial state
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleSwitchToRegister = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Navigation Links */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
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

              {/* Navigation Links */}
              <div className="hidden md:block">
                <div className="ml-2 flex items-center space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        item.current
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      } px-3 py-2 rounded-md text-sm font-medium`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center space-x-4">
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

              {isAuthenticated ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                  >
                    {getUserInitials() ? (
                      <div className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-medium">
                        {getUserInitials()}
                      </div>
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </button>
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                      {userMenuOptions
                        .filter(option => {
                          if (option.name === "Access Management") {
                            return isSuperuser;
                          }
                          if (option.name === "Role Management" || option.name === "User Management") {
                            return isSuperuser || user?.roles?.some(role =>
                              role.permissions?.includes('manage_roles') || role.permissions?.includes('manage_users')
                            );
                          }
                          return true;
                        })
                        .map((option) => (
                          <div key={option.name}>
                            {option.href ? (
                              <Link
                                to={option.href}
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setIsProfileMenuOpen(false)}
                              >
                                <div className="flex items-center">
                                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                                  </svg>
                                  {option.name}
                                </div>
                              </Link>
                            ) : (
                              <button
                                onClick={() => {
                                  if (option.action === 'logout') {
                                    handleLogout();
                                  }
                                  setIsProfileMenuOpen(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <div className="flex items-center">
                                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                                  </svg>
                                  {option.name}
                                </div>
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <Login 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <Register 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
}
