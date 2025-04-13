import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const checkAuth = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/self`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Failed to parse JSON:', text);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);

      // Fetch user data after successful login
      const userResponse = await fetch(`${API_URL}/api/users/self`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/');
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Failed to parse JSON:', text);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 