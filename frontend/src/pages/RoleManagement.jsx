import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCachedToken } from '../components/Auth';
import DraggableModal from '../components/DraggableModal';

const SORT_OPTIONS = {
  ALPHA_ASC: 'alpha_asc',
  ALPHA_DESC: 'alpha_desc',
};

function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.ALPHA_ASC);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoles();
  }, []);

  // Filter and sort roles when search query or sort option changes
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    let filtered = roles.filter(role => 
      role.name.toLowerCase().includes(query) ||
      (role.description && role.description.toLowerCase().includes(query))
    );

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.ALPHA_ASC:
          return a.name.localeCompare(b.name);
        case SORT_OPTIONS.ALPHA_DESC:
          return b.name.localeCompare(a.name);
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

  const formatRoleName = (name) => {
    // Split by spaces, underscores, or hyphens
    return name
      .split(/[\s_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
    });
    setIsModalOpen(true);
  };

  // Reset form data when modal is closed
  useEffect(() => {
    if (!isModalOpen) {
      setFormData({
        name: '',
        description: '',
      });
    }
  }, [isModalOpen]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Role Management</h1>
      
      {/* Sticky Search and Sort Bar */}
      <div className="sticky top-16 z-10 bg-gray-800 shadow-lg rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Search by name or description..."
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

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRoles.map((role) => (
                <tr key={role.role_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatRoleName(role.name)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {role.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.role_id, role.name)}
                        className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRoles.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No roles found matching your search' : 'No roles found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DraggableModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRole(null);
        }}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            {selectedRole ? 'Edit Role' : 'Create New Role'}
          </h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateOrUpdateRole(formData);
          }}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                Role Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="shadow appearance-none border dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="shadow appearance-none border dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                rows="3"
              />
            </div>
            <div className="flex justify-center mt-6">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-200"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </DraggableModal>
    </div>
  );
}

export default RoleManagement; 