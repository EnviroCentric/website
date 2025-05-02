import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  const fetchUserData = async (token, force = false) => {
    const now = Date.now();
    if (!force && user && now - lastFetchTime.current < CACHE_DURATION) {
      return; // Use cached data if it's still valid
    }

    if (fetchInProgress.current) {
      return; // Prevent concurrent fetches
    }

    try {
      fetchInProgress.current = true;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/self`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      setUser(userData);
      setIsAuthenticated(true);
      lastFetchTime.current = now;
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('access_token');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUserData(token);
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const login = async (accessToken) => {
    localStorage.setItem('access_token', accessToken);
    await fetchUserData(accessToken, true); // Force fetch on login
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('loginFormData');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      await fetchUserData(token, true); // Force refresh
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    token: localStorage.getItem('access_token'),
    setUser,
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