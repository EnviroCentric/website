import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const RolesContext = createContext();

export function RolesProvider({ children }) {
  const { token } = useAuth();
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    if (roles.length > 0) return; // Already loaded

    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/roles/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      // Filter out the admin role
      const filteredRoles = data.filter(role => role.name.toLowerCase() !== 'admin');
      setRoles(filteredRoles);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, roles.length]);

  const addRole = useCallback((newRole) => {
    setRoles(prevRoles => [...prevRoles, newRole]);
  }, []);

  const updateRole = useCallback((roleId, updates) => {
    setRoles(prevRoles => 
      prevRoles.map(role => 
        role.role_id === roleId
          ? { ...role, ...updates }
          : role
      )
    );
  }, []);

  const deleteRole = useCallback((roleId) => {
    setRoles(prevRoles => prevRoles.filter(role => role.role_id !== roleId));
  }, []);

  const formatRoleName = useCallback((name) => {
    return name
      .split(/[\s_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const value = {
    roles,
    isLoading,
    error,
    fetchRoles,
    addRole,
    updateRole,
    deleteRole,
    formatRoleName
  };

  return (
    <RolesContext.Provider value={value}>
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const context = useContext(RolesContext);
  if (!context) {
    throw new Error('useRoles must be used within a RolesProvider');
  }
  return context;
} 