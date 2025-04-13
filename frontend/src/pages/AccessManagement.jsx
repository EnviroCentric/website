import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AccessManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    const checkAccess = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/self`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to verify access');
        }

        const userData = await response.json();
        const userRoles = userData.roles || [];
        
        // Check if user has admin role
        const isAdmin = userRoles.some(role => role.name.toLowerCase() === 'admin');
        setHasAccess(isAdmin);

        if (isAdmin) {
          await fetchData();
        } else {
          navigate('/');
        }
      } catch (_) {
        setError('Failed to verify access permissions');
        setHasAccess(false);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const [rolesResponse, permissionsResponse] = await Promise.all([
        fetch(`${apiUrl}/roles`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${apiUrl}/roles/permissions`, {
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

      if (!Array.isArray(rolesData) || !Array.isArray(permissionsData)) {
        throw new Error('Invalid data structure received from server');
      }

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
    
    // Store the change in pendingChanges
    setPendingChanges(prev => {
      const roleId = selectedRole.role_id;
      const currentChanges = prev[roleId] || { added: [], removed: [] };
      
      if (isAdding) {
        // If we're adding a permission, remove it from removed if it was there
        const newRemoved = currentChanges.removed.filter(p => p !== permission);
        // Add it to added if it's not already there
        const newAdded = currentChanges.added.includes(permission) 
          ? currentChanges.added 
          : [...currentChanges.added, permission];
        
        return {
          ...prev,
          [roleId]: { added: newAdded, removed: newRemoved }
        };
      } else {
        // If we're removing a permission, remove it from added if it was there
        const newAdded = currentChanges.added.filter(p => p !== permission);
        // Add it to removed if it's not already there
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
      // Submit all pending changes
      for (const [roleId, changes] of Object.entries(pendingChanges)) {
        // Get current permissions for the role
        const currentPermissions = selectedRole?.role_id === parseInt(roleId) 
          ? selectedPermissions 
          : [];
        
        // Calculate final permissions by applying changes
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

      // Clear pending changes and refresh data
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Access Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Roles List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Roles</h2>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.role_id}
                onClick={() => handleRoleSelect(role)}
                className={`w-full text-left px-4 py-2 rounded ${
                  selectedRole?.role_id === role.role_id
                    ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {formatRoleName(role.name)}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {selectedRole ? `Permissions for ${formatRoleName(selectedRole.name)}` : 'Select a Role'}
          </h2>
          <div className="space-y-2">
            {selectedRole ? (
              permissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    className="form-checkbox h-5 w-5 text-green-600 dark:text-green-400"
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
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Submit Changes
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm Changes</h2>
              <p className="mt-2 text-gray-700 dark:text-gray-300">The following changes will be applied:</p>
            </div>

            {/* Modal Body - Scrollable */}
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
                        {/* Adding Permissions Section */}
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

                        {/* Removing Permissions Section */}
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
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
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