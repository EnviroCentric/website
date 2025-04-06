import React, { useState, useEffect, useRef } from 'react';
import useToken from "@galvanize-inc/jwtdown-for-react";
import { useNavigate } from 'react-router-dom';

const SORT_OPTIONS = {
  ROLE_DESC: 'role_desc',
  ROLE_ASC: 'role_asc',
  ALPHA_ASC: 'alpha_asc',
  ALPHA_DESC: 'alpha_desc',
};

function UserManagement() {
  const { token } = useToken();
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
  const [currentUserId, setCurrentUserId] = useState(null);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.ROLE_DESC);
  const modalRef = useRef(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!token) {
        setLoading(false);
        navigate('/');
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/self`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to verify access');
        }
        
        const userData = await response.json();
        const userRoles = userData.roles || [];
        
        // Store current user's ID
        setCurrentUserId(userData.user_id);
        
        // Check if user has admin role or appropriate security level
        const hasRequiredAccess = userRoles.some(role => 
          role.name === 'admin' || role.security_level >= 10
        );
        
        setHasAccess(hasRequiredAccess);
        
        if (hasRequiredAccess) {
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
      await Promise.all([fetchUsers(), fetchRoles()]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    }
  };

  useEffect(() => {
    const filtered = users
      .filter(user => user.user_id !== currentUserId) // Filter out current user
      .filter(user => 
        user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortBy) {
          case SORT_OPTIONS.ROLE_DESC:
            return Math.max(...(b.roles || []).map(r => r.security_level)) - 
                   Math.max(...(a.roles || []).map(r => r.security_level));
          case SORT_OPTIONS.ROLE_ASC:
            return Math.max(...(a.roles || []).map(r => r.security_level)) - 
                   Math.max(...(b.roles || []).map(r => r.security_level));
          case SORT_OPTIONS.ALPHA_ASC:
            return (a.first_name + a.last_name).localeCompare(b.first_name + b.last_name);
          case SORT_OPTIONS.ALPHA_DESC:
            return (b.first_name + b.last_name).localeCompare(a.first_name + a.last_name);
          default:
            return 0;
        }
      });
    setFilteredUsers(filtered);
  }, [searchQuery, users, currentUserId, sortBy]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowRoleModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      const data = await response.json();
      
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        data.map(async (user) => {
          const rolesResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/roles/${user.user_id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (rolesResponse.ok) {
            const userData = await rolesResponse.json();
            return { ...user, roles: userData.roles };
          }
          return user;
        })
      );
      
      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      throw err;
    }
  };

  const fetchRoles = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.status}`);
      }
      const data = await response.json();
      setRoles(data);
    } catch (err) {
      console.error('Error fetching roles:', err);
      throw err;
    }
  };

  const handleManageRoles = async (user) => {
    try {
      // Fetch the latest user data to get current roles
      const response = await fetch(`${import.meta.env.VITE_API_URL}/roles/${user.user_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      
      const userData = await response.json();
      setSelectedUser(userData);
      setUserRoles(userData.roles || []);
      setShowRoleModal(true);
    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError('Failed to load user roles. Please try again.');
    }
  };

  const handleRoleToggle = (role) => {
    setUserRoles(prevRoles => {
      const hasRole = prevRoles.some(r => r.name === role.name);
      if (hasRole) {
        return prevRoles.filter(r => r.name !== role.name);
      } else {
        return [...prevRoles, role];
      }
    });
  };

  const handleSaveRoles = async () => {
    if (!selectedUser || !token) return;

    try {
      // Get current roles and new roles
      const currentRoleNames = (selectedUser.roles || []).map(r => r.name);
      const newRoleNames = userRoles.map(r => r.name);

      // Find roles to add and remove
      const rolesToAdd = newRoleNames.filter(name => !currentRoleNames.includes(name));
      const rolesToRemove = currentRoleNames.filter(name => !newRoleNames.includes(name));

      // Add new roles
      await Promise.all(
        rolesToAdd.map(roleName =>
          fetch(
            `${import.meta.env.VITE_API_URL}/roles/${selectedUser.user_id}/${roleName}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          )
        )
      );

      // Remove old roles
      await Promise.all(
        rolesToRemove.map(roleName =>
          fetch(
            `${import.meta.env.VITE_API_URL}/roles/${selectedUser.user_id}/${roleName}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          )
        )
      );

      // Refresh user list
      await fetchUsers();
      setShowRoleModal(false);
      setSelectedUser(null);
      setUserRoles([]);
    } catch (err) {
      setError(err.message);
      console.error('Error managing roles:', err);
    }
  };

  const getRoleColor = (securityLevel) => {
    if (securityLevel >= 10) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (securityLevel >= 8) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    if (securityLevel >= 5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
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
              <option value={SORT_OPTIONS.ROLE_DESC}>Security Level (High to Low)</option>
              <option value={SORT_OPTIONS.ROLE_ASC}>Security Level (Low to High)</option>
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
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getRoleColor(role.security_level)}`}
                      >
                        {role.name}
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
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Manage Roles for {selectedUser.first_name} {selectedUser.last_name}
              </h2>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setUserRoles([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {roles.map((role) => (
                <label key={role.role_id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                  <input
                    type="checkbox"
                    checked={userRoles.some(r => r.name === role.name)}
                    onChange={() => handleRoleToggle(role)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {role.name} (Level {role.security_level})
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
        </div>
      )}
    </div>
  );
}

export default UserManagement; 