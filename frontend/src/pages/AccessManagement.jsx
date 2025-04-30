import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AccessManagement() {
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Check if user has admin role using the user data we already have
    const isAdmin = user?.is_superuser || user?.roles?.some(role => role.name.toLowerCase() === 'admin');
    setHasAccess(isAdmin);

    if (isAdmin) {
      fetchData();
    } else {
      navigate('/');
    }
    setIsLoading(false);
  }, [isAuthenticated, user, navigate]);

  const fetchData = async () => {
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/roles`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/roles/permissions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!rolesResponse.ok || !permissionsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [rolesData, permissionsData] = await Promise.all([
        rolesResponse.json(),
        permissionsResponse.json(),
      ]);

      // Filter out the admin role
      const filteredRoles = rolesData.filter(role => role.name.toLowerCase() !== 'admin');
      setRoles(filteredRoles);
      setPermissions(permissionsData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/roles/${role.role_id}/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch role permissions');
      }

      const data = await response.json();
      setSelectedPermissions(data.permissions || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePermissionToggle = (permission) => {
    if (!selectedRole) return;

    const isAdding = !selectedPermissions.includes(permission);
    const newPermissions = isAdding
      ? [...selectedPermissions, permission]
      : selectedPermissions.filter(p => p !== permission);

    setSelectedPermissions(newPermissions);
    
    setPendingChanges(prev => {
      const roleId = selectedRole.role_id;
      const currentChanges = prev[roleId] || { added: [], removed: [] };
      
      if (isAdding) {
        const newRemoved = currentChanges.removed.filter(p => p !== permission);
        const newAdded = currentChanges.added.includes(permission) 
          ? currentChanges.added 
          : [...currentChanges.added, permission];
        
        return {
          ...prev,
          [roleId]: { added: newAdded, removed: newRemoved }
        };
      } else {
        const newAdded = currentChanges.added.filter(p => p !== permission);
        const newRemoved = currentChanges.removed.includes(permission)
          ? currentChanges.removed
          : [...currentChanges.removed, permission];
        
        return {
          ...prev,
          [roleId]: { added: newAdded, removed: newRemoved }
        };
      }
    });
  };

  const handleSubmit = async () => {
    try {
      for (const [roleId, changes] of Object.entries(pendingChanges)) {
        const currentPermissions = selectedRole?.role_id === parseInt(roleId) 
          ? selectedPermissions 
          : [];
        
        const finalPermissions = [
          ...currentPermissions.filter(p => !changes.removed.includes(p)),
          ...changes.added
        ];

        const response = await fetch(`${import.meta.env.VITE_API_URL}/roles/${roleId}/permissions`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ permissions: finalPermissions }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update permissions for role ${roleId}`);
        }
      }

      setPendingChanges({});
      await fetchData();
      setShowConfirmationModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatRoleName = (name) => {
    return name
      .split(/[\s_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatPermissionName = (name) => {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-blue-900 dark:to-blue-950 px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Management</h1>
            <p className="text-gray-700 dark:text-blue-200 mt-2">Manage role permissions and access levels</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Roles List */}
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Roles</h2>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <button
                      key={role.role_id}
                      onClick={() => handleRoleSelect(role)}
                      className={`w-full text-left px-4 py-2 rounded ${
                        selectedRole?.role_id === role.role_id
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {formatRoleName(role.name)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions List */}
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  {selectedRole ? `Permissions for ${formatRoleName(selectedRole.name)}` : 'Select a Role'}
                </h2>
                <div className="space-y-2">
                  {selectedRole ? (
                    permissions.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission)}
                          onChange={() => handlePermissionToggle(permission)}
                          className="form-checkbox h-5 w-5 text-blue-600 dark:text-blue-400"
                        />
                        <span className="text-gray-900 dark:text-white">
                          {formatPermissionName(permission)}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Select a role to view and manage its permissions
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            {Object.keys(pendingChanges).length > 0 && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowConfirmationModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Submit Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm Changes</h2>
              <p className="mt-2 text-gray-700 dark:text-gray-300">The following changes will be applied:</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(pendingChanges).map(([roleId, changes]) => {
                  const role = roles.find(r => r.role_id === parseInt(roleId));
                  if (!role) return null;
                  
                  return (
                    <div key={roleId} className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                        {formatRoleName(role.name)}
                      </h3>

                      <div className="space-y-3">
                        {changes.added.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Adding:
                            </h4>
                            <ul className="space-y-1">
                              {changes.added.map(permission => (
                                <li 
                                  key={`add-${permission}`} 
                                  className="text-green-600 dark:text-green-400 text-sm flex items-center"
                                >
                                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                  {formatPermissionName(permission)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {changes.removed.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                              Removing:
                            </h4>
                            <ul className="space-y-1">
                              {changes.removed.map(permission => (
                                <li 
                                  key={`remove-${permission}`} 
                                  className="text-red-600 dark:text-red-400 text-sm flex items-center"
                                >
                                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                  {formatPermissionName(permission)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Confirm Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 