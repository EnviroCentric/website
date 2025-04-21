import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, isTokenExpired, getTokenData, setAuthToken } from '../utils/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      if (isTokenExpired(token)) {
        setUser(null);
        navigate('/login');
      } else {
        setUser(getTokenData(token));
      }
    }
    setIsLoading(false);
  }, [navigate]);

  const login = (token) => {
    setAuthToken(token);
    setUser(getTokenData(token));
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    navigate('/login');
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}; 