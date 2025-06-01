import axios from 'axios';
import jwtDecode from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Configure axios defaults
axios.defaults.baseURL = API_URL;

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
axios.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
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
axios.interceptors.response.use(
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
            return axios(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token } = response.data;
        setAuthToken(access_token);
        sessionStorage.setItem('refreshToken', refresh_token);

        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return axios(originalRequest);
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
    sessionStorage.setItem('token', token);
  } else {
    sessionStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  return sessionStorage.getItem('token');
};

// API Service Functions
export const register = async (userData) => {
  try {
    const response = await axios.post('/api/v1/auth/register', {
      ...userData,
      password_confirm: userData.password
    });
    const { access_token, refresh_token } = response.data;
    setAuthToken(access_token);
    sessionStorage.setItem('refreshToken', refresh_token);
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
    setAuthToken(access_token);
    sessionStorage.setItem('refreshToken', refresh_token);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'An error occurred during login' };
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
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refreshToken');
}; 