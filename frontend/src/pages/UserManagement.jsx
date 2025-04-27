import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DraggableModal from '../legacy/DraggableModal';

const SORT_OPTIONS = {
  ALPHA_ASC: 'alpha_asc',
  ALPHA_DESC: 'alpha_desc',
};

function UserManagement() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.ALPHA_ASC);
  const modalRef = useRef(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!token) {
        setLoading(false);
        navigate('/');
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/roles/check-permission`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ permission: 'manage_users' })
        });
        
        if (!response.ok) {
          throw new Error('Failed to verify access');
        }
        
        const data = await response.json();
        setHasAccess(data.has_permission);
        
        if (data.has_permission) {
          await loadData();
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Error checking access:', err);
        setError('Failed to verify access permissions');
        setHasAccess(false);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      navigate('/');
    }
  }, [token, navigate]);

  const loadData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/management-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch management data');
      }

      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
      setRoles(data.roles);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    }
  };

  useEffect(() => {
    const filtered = users
      .filter(user => {
        const searchLower = searchQuery.toLowerCase();
        const userRoles = user.roles || [];
        const roleNames = userRoles.map(role => role.name.toLowerCase()).join(' ');
        
        return (
          user.first_name.toLowerCase().includes(searchLower) ||
          user.last_name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          roleNames.includes(searchLower)
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case SORT_OPTIONS.ALPHA_ASC:
            return (a.first_name + a.last_name).localeCompare(b.first_name + b.last_name);
          case SORT_OPTIONS.ALPHA_DESC:
            return (b.first_name + b.last_name).localeCompare(a.first_name + a.last_name);
          default:
            return 0;
        }
      });
    setFilteredUsers(filtered);
  }, [searchQuery, users, sortBy]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowRoleModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManageRoles = async (user) => {
    try {
      setSelectedUser(user);  // Set the selected user first
      setUserRoles(user.roles || []);  // Initialize with user's current roles
      setShowRoleModal(true);
    } catch (err) {
      console.error('Error managing user roles:', err);
      setError('Failed to manage user roles. Please try again.');
    }
  };

  const handleRoleToggle = (role) => {
    setUserRoles(prevRoles => {
      const hasRole = prevRoles.some(r => r.role_id === role.role_id);
      if (hasRole) {
        return prevRoles.filter(r => r.role_id !== role.role_id);
      } else {
        return [...prevRoles, role];
      }
    });
  };

  const handleSaveRoles = async () => {
    if (!selectedUser || !token) return;

    try {
      const roleChanges = {
        add: userRoles
          .filter(role => !selectedUser.roles.some(r => r.role_id === role.role_id))
          .map(role => role.role_id),
        remove: selectedUser.roles
          .filter(role => !userRoles.some(r => r.role_id === role.role_id))
          .map(role => role.role_id)
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/${selectedUser.user_id}/roles/batch`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roleChanges),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update roles');
      }

      // Refresh the users list to show updated roles
      await loadData();
      setShowRoleModal(false);
      setSelectedUser(null);
      setUserRoles([]);
    } catch (err) {
      console.error('Error saving roles:', err);
      setError('Failed to save role changes. Please try again.');
    }
  };

  const formatRoleName = (name) => {
    // Split by spaces, underscores, or hyphens
    return name
      .split(/[\s_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">User Management</h1>
      
      {/* Sticky Search and Sort Bar */}
      <div className="sticky top-16 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={SORT_OPTIONS.ALPHA_ASC}>Name (A to Z)</option>
              <option value={SORT_OPTIONS.ALPHA_DESC}>Name (Z to A)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.user_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.first_name} {user.last_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((role) => (
                      <span
                        key={role.name}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {formatRoleName(role.name)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => handleManageRoles(user)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Manage Roles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Management Modal */}
      {showRoleModal && selectedUser && (
        <DraggableModal
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
            setUserRoles([]);
          }}
        >
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Manage Roles for {selectedUser.first_name} {selectedUser.last_name}
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {roles.map((role) => (
                <label key={role.role_id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                  <input
                    type="checkbox"
                    checked={userRoles.some(r => r.role_id === role.role_id)}
                    onChange={() => handleRoleToggle(role)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatRoleName(role.name)}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveRoles}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  );
}

export default UserManagement; 