import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';

export default function UserManagement() {
  const { token, isAuthenticated, user: currentUser, refreshUserData } = useAuth();
  const { roles, fetchRoles } = useRoles();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editedUser, setEditedUser] = useState({
    email: '',
    is_active: true,
    roles: []
  });
  const [hasAccess, setHasAccess] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const checkAccess = () => {
      if (currentUser?.is_superuser) return true;
      return currentUser?.roles?.some(role =>
        role.permissions?.includes('manage_users')
      );
    };

    const hasPermission = checkAccess();
    setHasAccess(hasPermission);
    if (hasPermission) {
      fetchData();
    } else {
      navigate('/');
    }
    setIsLoading(false);
  }, [isAuthenticated, currentUser, navigate]);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && users.length > 0 && now - lastFetchTime.current < CACHE_DURATION) {
      return; // Use cached data if it's still valid
    }

    if (fetchInProgress.current) {
      return; // Prevent concurrent fetches
    }

    try {
      fetchInProgress.current = true;
      await fetchRoles(force); // This will use the cached roles if available
      
      const usersRes = await fetch(`${import.meta.env.VITE_API_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!usersRes.ok) throw new Error('Failed to fetch users');
      const usersData = await usersRes.json();

      // Create default admin role if it doesn't exist
      const defaultAdminRole = {
        id: 'admin',
        name: 'Admin',
        description: 'Administrator role'
      };

      // Add admin role to superusers
      const adminRole = roles.find(r => r.name.toLowerCase() === 'admin') || defaultAdminRole;
      const usersWithAdminRole = usersData.map(user => ({
        ...user,
        roles: user.is_superuser 
          ? [...user.roles, adminRole]
          : user.roles
      }));
      setUsers(usersWithAdminRole);

      lastFetchTime.current = now;
    } catch (err) {
      setError(err.message);
    } finally {
      fetchInProgress.current = false;
    }
  }, [token, fetchRoles, users.length, roles]);

  const handleEditUser = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${selectedUser.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_active: editedUser.is_active,
        }),
      });
      if (!res.ok) throw new Error('Failed to update user');

      if (JSON.stringify(editedUser.roles) !== JSON.stringify(selectedUser.roles.map(r => r.id))) {
        const rolesRes = await fetch(`${import.meta.env.VITE_API_URL}/users/${selectedUser.id}/roles/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role_ids: editedUser.roles }),
        });
        if (!rolesRes.ok) throw new Error('Failed to update user roles');
      }

      // Update local state with the new roles
      const updatedRoles = roles.filter(r => editedUser.roles.includes(r.id || r.role_id));
      
      // Create a new user object with the updated roles
      const updatedUser = {
        ...selectedUser,
        is_active: editedUser.is_active,
        roles: updatedRoles
      };
      
      // Update the users state with the new user data
      const updatedUsers = users.map(u =>
        u.id === selectedUser.id ? updatedUser : u
      );
      
      setUsers(updatedUsers);

      // If the edited user is the current user, refresh user data
      if (selectedUser.id === currentUser.id) {
        await refreshUserData();
      }

      setShowEditModal(false);
      setSelectedUser(null);
      setEditedUser({ email: '', is_active: true, roles: [] });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${selectedUser.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete user');
      
      // Update local state
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatUserName = (user) => {
    return `${user.first_name} ${user.last_name}`.trim() || 'Unnamed User';
  };

  // Update the role selection handler
  const handleRoleChange = (role, checked) => {
    const roleId = role?.id || role?.role_id;
    if (!roleId) return; // Skip if no valid role ID

    const newRoles = checked
      ? [...editedUser.roles, roleId]
      : editedUser.roles.filter(id => id !== roleId);
    
    setEditedUser(prev => ({
      ...prev,
      roles: newRoles
    }));
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
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-blue-900 dark:to-blue-950 px-6 py-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  User Management
                </h1>
                <p className="text-gray-700 dark:text-blue-200 mt-2">
                  Manage system users and their roles
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatUserName(user)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role, index) => (
                            <span
                              key={`user-${user.id}-role-${role?.id || role?.role_id || index}`}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {(role?.name || 'Unnamed Role').split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.id !== currentUser.id && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setEditedUser({
                                email: user.email,
                                is_active: user.is_active,
                                roles: user.roles.map(r => r.id)
                              });
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setSelectedUser(null);
              setEditedUser({
                email: '',
                is_active: true,
                roles: []
              });
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Manage User
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setEditedUser({
                      email: '',
                      is_active: true,
                      roles: []
                    });
                  }}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* User Info Card */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-xl font-semibold text-blue-600 dark:text-blue-300">
                          {editedUser.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {editedUser.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        User ID: {selectedUser?.id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Account Status</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {editedUser.is_active ? 'User can access the system' : 'User access is restricted'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditedUser({ ...editedUser, is_active: !editedUser.is_active });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        editedUser.is_active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          editedUser.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Roles Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">User Roles</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roles.map((role, index) => (
                      <label
                        key={`edit-role-${role?.id || role?.role_id || index}`}
                        className="relative flex items-start p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editedUser.roles.includes(role?.id || role?.role_id)}
                              onChange={(e) => handleRoleChange(role, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                              {(role?.name || 'Unnamed Role').split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')}
                            </span>
                          </div>
                          {role?.description && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {role.description.charAt(0).toUpperCase() + role.description.slice(1)}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setEditedUser({
                      email: '',
                      is_active: true,
                      roles: []
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowConfirmationModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirmationModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Confirm Changes
                </h2>
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Changes Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Account Status</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        editedUser.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {editedUser.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Selected Roles</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {editedUser.roles.length > 0 ? (
                          roles
                            .filter(role => editedUser.roles.includes(role?.id || role?.role_id))
                            .map((role, index) => (
                              <span
                                key={`selected-role-${role?.id || role?.role_id || index}`}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              >
                                {(role?.name || 'Unnamed Role').split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                  .join(' ')}
                              </span>
                            ))
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            No Roles
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleEditUser();
                    setShowConfirmationModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Confirm Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}