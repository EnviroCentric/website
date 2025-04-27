import api from './api';
import { setAuthToken } from '../utils/auth';

export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const { access_token } = response.data;
    setAuthToken(access_token);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

export const refreshToken = async () => {
  try {
    const response = await api.post('/auth/refresh');
    const { access_token } = response.data;
    setAuthToken(access_token);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Token refresh failed' };
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    setAuthToken(null);
  }
}; 