import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserData = async (token) => {
    try {
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
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('access_token');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
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
    await fetchUserData(accessToken);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('loginFormData');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    token: localStorage.getItem('access_token'),
    setUser
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