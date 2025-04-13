import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const getAuthHeader = () => {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/self`, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${refreshToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (refreshResponse.ok) {
            const { access_token, refresh_token } = await refreshResponse.json();
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            // Retry the original request
            return checkAuth();
          }
        }
        // If refresh fails or no refresh token, clear everything
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        console.error('Unexpected auth check error:', response.status);
        setUser(null);
        setLoading(false);
        return;
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${API_URL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid email or password');
        } else {
          const data = await response.json();
          throw new Error(data.detail || 'Login failed');
        }
      }

      const { access_token, refresh_token } = await response.json();
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Get user data
      const userResponse = await fetch(`${API_URL}/api/users/self`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
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

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
      } catch {
        data = { detail: 'Invalid response from server' };
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Registration endpoint not found. Please check the API configuration.');
        } else if (response.status === 409 || 
                  (response.status === 400 && 
                   (data.detail?.includes('already exists') || 
                    data.detail?.includes('duplicate key value')))) {
          throw new Error('An account with this email already exists. Please use a different email or try logging in.');
        } else if (response.status === 422) {
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
    loading,
    login,
    logout,
    register,
    checkEmailExists,
    getAuthHeader,
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