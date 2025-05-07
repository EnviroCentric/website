import axios from 'axios';
import jwtDecode from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Configure axios defaults
axios.defaults.baseURL = API_URL;

// Add a request interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Token Management Functions
export const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

export const getTokenData = (token) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

// API Service Functions
export const register = async (userData) => {
  try {
    const response = await axios.post('/api/v1/auth/register', {
      ...userData,
      password_confirm: userData.password
    });
    const { access_token, refresh_token } = response.data;
    
    // Store tokens
    setAuthToken(access_token);
    localStorage.setItem('refresh_token', refresh_token);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'An error occurred during registration' };
  }
};

export const login = async (email, password) => {
  try {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await axios.post('/api/v1/auth/login', formData);
    const { access_token, refresh_token } = response.data;
    
    // Store tokens
    setAuthToken(access_token);
    localStorage.setItem('refresh_token', refresh_token);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'An error occurred during login' };
  }
};

export const refreshToken = async () => {
  try {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post('/api/v1/auth/refresh', {
      refresh_token
    });
    
    const { access_token, refresh_token: new_refresh_token } = response.data;
    
    // Update tokens
    setAuthToken(access_token);
    localStorage.setItem('refresh_token', new_refresh_token);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'An error occurred while refreshing token' };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await axios.get('/api/v1/auth/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'An error occurred while fetching user data' };
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
}; 