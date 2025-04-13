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
      const response = await fetch(`${API_URL}/api/auth/token`, {
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
        // Don't log the error if it's just invalid JSON from a failed login
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid email or password');
        } else if (response.status === 405) {
          throw new Error('Login service temporarily unavailable');
        } else {
          throw new Error(data.detail || 'Login failed');
        }
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
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/');
  };

  const checkEmailExists = async (email) => {
    try {
      const response = await fetch(`${API_URL}/api/users/check-email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check email');
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Email check error:', error);
      throw new Error('Unable to verify email. Please try again later.');
    }
  };

  const register = async (userData) => {
    try {
      // Check if email exists first
      const emailExists = await checkEmailExists(userData.email);
      if (emailExists) {
        throw new Error('An account with this email already exists. Please use a different email or try logging in.');
      }

      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (_) {
        // Don't log parse errors, just handle them
        data = { detail: 'Invalid response from server' };
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Registration endpoint not found. Please check the API configuration.');
        } else if (response.status === 409 || 
                  (response.status === 400 && 
                   (data.detail?.includes('already exists') || 
                    data.detail?.includes('duplicate key value')))) {
          // Handle both explicit duplicate checks and database constraint violations
          throw new Error('An account with this email already exists. Please use a different email or try logging in.');
        } else if (response.status === 422) {
          // Handle validation errors
          const errorDetails = data.detail || [];
          if (Array.isArray(errorDetails)) {
            const errorMessages = errorDetails.map(error => {
              const field = error.loc[error.loc.length - 1];
              return `${field}: ${error.msg}`;
            });
            throw new Error(errorMessages.join('\n'));
          } else {
            throw new Error(data.detail || 'Validation failed');
          }
        } else {
          throw new Error(data.detail || 'Registration failed');
        }
      }

      return { success: true };
    } catch (error) {
      // Only log unexpected errors, not known error conditions
      if (!error.message.includes('already exists') && 
          !error.message.includes('Validation failed') &&
          !error.message.includes('duplicate key value')) {
        console.error('Registration error:', error);
      }
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
    checkEmailExists,
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