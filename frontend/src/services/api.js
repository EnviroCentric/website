import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log request details in development
    if (import.meta.env.DEV) {
      console.log('API Request:', {
        method: config.method.toUpperCase(),
        url: config.url,
        data: config.data,
        headers: config.headers,
      });
    }
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response details in development
    if (import.meta.env.DEV) {
      console.log('API Response:', {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
      });

      // Handle 401 Unauthorized errors
      if (error.response.status === 401) {
        // Only redirect if it's not a login attempt
        if (!error.config.url.includes('/auth/login')) {
          // Clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Request Error:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api; 