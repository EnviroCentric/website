import api from './api';
import jwtDecode from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Configure axios defaults
api.defaults.baseURL = API_URL;

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a request interceptor
api.interceptors.request.use(
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

// Add a response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await api.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token } = response.data;
        setAuthToken(access_token);
        localStorage.setItem('refreshToken', refresh_token);

        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

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
    const response = await api.post('/api/v1/auth/register', {
      ...userData,
      password_confirm: userData.password
    });
    const { access_token, refresh_token } = response.data;
    setAuthToken(access_token);
    localStorage.setItem('refreshToken', refresh_token);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'An error occurred during registration' };
  }
};

// Test login function
export const testLogin = async (email, password) => {
  try {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    console.log('Sending test login request to:', `${API_URL}/test-login`);
    console.log('Request data:', {
      username: email,
      password: '***' // Don't log actual password
    });

    const response = await api.post('/test-login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Test login response:', response.data);
    return response.data;
  } catch (error) {
    console.log('Test login error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      message: error.message,
      code: error.code
    });
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    // Use URLSearchParams for form-encoded data instead of FormData for multipart
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    console.log('=== LOGIN DEBUG INFO ===');
    console.log('Email:', email);
    console.log('Form data string:', formData.toString());
    console.log('API base URL:', import.meta.env.VITE_API_URL || 'http://localhost:8000');
    console.log('Full URL will be:', `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/login`);

    // Use direct fetch instead of axios to debug
    const directResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData
    });

    console.log('Direct fetch response status:', directResponse.status);
    console.log('Direct fetch response headers:', Object.fromEntries(directResponse.headers.entries()));

    if (directResponse.ok) {
      const data = await directResponse.json();
      console.log('✅ Direct fetch succeeded!', data);
      setAuthToken(data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      return data;
    } else {
      const errorText = await directResponse.text();
      console.log('❌ Direct fetch failed:', errorText);
      throw new Error(`Direct fetch failed: ${directResponse.status} - ${errorText}`);
    }

    // Original axios code (commented out for debugging)
    /*
    const response = await api.post('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const { access_token, refresh_token } = response.data;
    setAuthToken(access_token);
    localStorage.setItem('refreshToken', refresh_token);
    return response.data;
    */
  } catch (error) {
    if (error.code === 'ERR_NETWORK') {
      throw { detail: 'Network error: Unable to reach the server. Please check your connection.' };
    }
    if (error.response?.data?.detail) {
      if (Array.isArray(error.response.data.detail)) {
        throw { detail: error.response.data.detail[0].msg };
      } else if (typeof error.response.data.detail === 'object') {
        throw { detail: error.response.data.detail.msg };
      } else {
        throw { detail: error.response.data.detail };
      }
    }
    throw { detail: 'An error occurred during login' };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'An error occurred while fetching user data' };
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}; 