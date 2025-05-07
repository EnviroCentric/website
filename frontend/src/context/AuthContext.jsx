import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAuthToken, 
  isTokenExpired, 
  login as loginService, 
  register as registerService, 
  getCurrentUser, 
  logout as logoutService, 
  refreshToken 
} from '../services/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(getAuthToken());
  const navigate = useNavigate();
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  const fetchUserData = async (force = false) => {
    const now = Date.now();
    if (!force && user && now - lastFetchTime.current < CACHE_DURATION) {
      return; // Use cached data if it's still valid
    }

    if (fetchInProgress.current) {
      return; // Prevent concurrent fetches
    }

    try {
      fetchInProgress.current = true;
      const userData = await getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
      lastFetchTime.current = now;
    } catch (error) {
      console.error('Error fetching user data:', error);
      logout();
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    const currentToken = getAuthToken();
    if (currentToken && !isTokenExpired(currentToken)) {
      setToken(currentToken);
      fetchUserData();
    } else if (currentToken) {
      // Try to refresh the token
      refreshToken()
        .then(() => {
          setToken(getAuthToken());
          fetchUserData();
        })
        .catch(() => {
          logout();
          setLoading(false);
        });
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await loginService(email, password);
      setToken(getAuthToken());
      await fetchUserData(true); // Force fetch on login
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await registerService(userData);
      setToken(getAuthToken());
      await fetchUserData(true); // Force fetch after registration
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    logoutService();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  const refreshUserData = async () => {
    await fetchUserData(true); // Force refresh
  };

  const value = {
    user,
    setUser,
    isAuthenticated,
    loading,
    token,
    login,
    register,
    logout,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 