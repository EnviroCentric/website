import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCachedToken } from '../components/Auth';
import RoleModal from '../components/RoleModal';

const SORT_OPTIONS = {
  LEVEL_DESC: 'level_desc',
  LEVEL_ASC: 'level_asc',
  ALPHA_ASC: 'alpha_asc',
  ALPHA_DESC: 'alpha_desc',
  NEWEST: 'newest',
  OLDEST: 'oldest',
};

function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.LEVEL_DESC);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoles();
  }, []);

  // Filter and sort roles when search query or sort option changes
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    let filtered = roles.filter(role => 
      role.name.toLowerCase().includes(query) ||
      (role.description && role.description.toLowerCase().includes(query)) ||
      role.security_level.toString().includes(query)
    );

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.LEVEL_DESC:
          return b.security_level - a.security_level;
        case SORT_OPTIONS.LEVEL_ASC:
          return a.security_level - b.security_level;
        case SORT_OPTIONS.ALPHA_ASC:
          return a.name.localeCompare(b.name);
        case SORT_OPTIONS.ALPHA_DESC:
          return b.name.localeCompare(a.name);
        case SORT_OPTIONS.NEWEST:
          return new Date(b.created_at) - new Date(a.created_at);
        case SORT_OPTIONS.OLDEST:
          return new Date(a.created_at) - new Date(b.created_at);
        default:
          return 0;
      }
    });

    setFilteredRoles(filtered);
  }, [searchQuery, roles, sortBy]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchRoles = async () => {
    try {
      const token = getCachedToken();
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view roles');
          navigate('/');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateOrUpdateRole = async (formData) => {
    try {
      const token = getCachedToken();
      if (!token) {
        navigate('/');
        return;
      }

      const isEditing = selectedRole !== null;
      const url = isEditing 
        ? `${import.meta.env.VITE_API_URL}/roles/${selectedRole.role_id}`
        : `${import.meta.env.VITE_API_URL}/roles`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError(`You do not have permission to ${isEditing ? 'edit' : 'create'} roles`);
          return;
        }
        throw new Error(data.detail || `Failed to ${isEditing ? 'update' : 'create'} role`);
      }

      setSuccess(`Role "${formData.name}" ${isEditing ? 'updated' : 'created'} successfully`);
      setIsModalOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = getCachedToken();
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to delete roles');
          return;
        }
        if (response.status === 404) {
          setError(`Role "${roleName}" not found`);
          await fetchRoles();
          return;
        }
        throw new Error(data.detail || 'Failed to delete role');
      }

      setSuccess(data.message || `Role "${roleName}" deleted successfully`);
      await fetchRoles();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Role Management</h1>
      
      {/* Sticky Search and Sort Bar */}
      <div className="sticky top-16 z-10 bg-gray-800 shadow-lg rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Search by name, description, or security level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 border-none text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-2.5">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="min-w-[200px] py-2 px-3 rounded-lg bg-gray-700 text-white border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={SORT_OPTIONS.LEVEL_DESC}>Security Level (High to Low)</option>
            <option value={SORT_OPTIONS.LEVEL_ASC}>Security Level (Low to High)</option>
            <option value={SORT_OPTIONS.ALPHA_ASC}>Name (A to Z)</option>
            <option value={SORT_OPTIONS.ALPHA_DESC}>Name (Z to A)</option>
          </select>
          <button
            onClick={() => {
              setSelectedRole(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Role
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-500 text-green-700 dark:text-green-400 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRoles.map((role) => (
              <li key={role.role_id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">{role.description}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Security Level: {role.security_level}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.role_id, role.name)}
                      className="bg-red-500 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {filteredRoles.length === 0 && (
              <li className="p-6 text-center text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No roles found matching your search' : 'No roles found'}
              </li>
            )}
          </ul>
        </div>
      </div>

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRole(null);
        }}
        onSubmit={handleCreateOrUpdateRole}
        role={selectedRole}
      />
    </div>
  );
}

export default RoleManagement; 