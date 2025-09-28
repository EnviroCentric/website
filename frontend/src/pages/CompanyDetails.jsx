import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';
import { formatDate } from '../utils/dateUtils';

const CompanyDetails = () => {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [companyProjects, setCompanyProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAssignUserModalOpen, setIsAssignUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [companyData, setCompanyData] = useState({
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: ''
  });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get the highest role level from user's roles
  const userRoleLevel = Math.max(...(user?.roles?.map(role => role.level) || [0]));
  const isAdmin = userRoleLevel >= 100; // Admin level is 100

  useEffect(() => {
    // Redirect non-admins
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchCompanyDetails();
    fetchAllUsers();
  }, [companyId, isAdmin, navigate]);

  const fetchCompanyDetails = async () => {
    try {
      // Fetch company info
      const companyResponse = await api.get(`/api/v1/companies/${companyId}`);
      setCompany(companyResponse.data);

      // Fetch company users
      const usersResponse = await api.get(`/api/v1/companies/${companyId}/users`);
      setCompanyUsers(usersResponse.data.users || []);

      // Fetch company projects
      const projectsResponse = await api.get(`/api/v1/companies/${companyId}/projects`);
      setCompanyProjects(projectsResponse.data.projects || []);
    } catch (err) {
      setError('Failed to fetch company details');
      console.error('Error fetching company details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // Fetch all users for assignment - we'll filter for Client role only
      const response = await api.get('/api/v1/users/');
      // Filter to show only users with Client role who are not already assigned to this company
      const availableUsers = response.data.filter(u => {
        const hasClientRole = u.roles?.some(role => role.name.toLowerCase() === 'client');
        const isNotAssignedToThisCompany = !u.company_id || u.company_id !== parseInt(companyId);
        return hasClientRole && isNotAssignedToThisCompany;
      });
      setAllUsers(availableUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserId) return;

    try {
      // Update user's company_id - we'll need to use the user update endpoint
      await api.patch(`/api/v1/users/${selectedUserId}`, {
        company_id: parseInt(companyId)
      });
      
      await fetchCompanyDetails();
      await fetchAllUsers();
      setIsAssignUserModalOpen(false);
      setSelectedUserId('');
      setUserSearchTerm('');
    } catch (err) {
      setError('Failed to assign user to company');
      console.error('Error assigning user:', err);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (window.confirm('Are you sure you want to remove this user from the company?')) {
      try {
        // Remove user from company by setting company_id to null
        await api.patch(`/api/v1/users/${userId}`, {
          company_id: null
        });
        
        await fetchCompanyDetails();
        await fetchAllUsers();
      } catch (err) {
        setError('Failed to remove user from company');
        console.error('Error removing user:', err);
      }
    }
  };

  const openEditModal = () => {
    setCompanyData({
      name: company.name || '',
      address_line1: company.address_line1 || '',
      address_line2: company.address_line2 || '',
      city: company.city || '',
      state: company.state || '',
      zip: company.zip || ''
    });
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditCompany = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/v1/companies/${companyId}`, companyData);
      await fetchCompanyDetails();
      setIsEditModalOpen(false);
    } catch (err) {
      setError('Failed to update company');
      console.error('Error updating company:', err);
    }
  };

  const resetForm = () => {
    setCompanyData({
      name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: ''
    });
  };



  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'reopened':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Filter available users for assignment modal
  const filteredUsers = allUsers.filter(u => {
    if (!userSearchTerm.trim()) return true;
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const search = userSearchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Company not found
        </h3>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/companies')}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {company.name}
          </h1>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={openEditModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Edit Company
          </button>
          <button
            onClick={() => navigate('/projects', { state: { selectedCompanyId: companyId } })}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Create Project
          </button>
          <button
            onClick={() => setIsAssignUserModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Assign Client
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Company Information */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Company Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Company Name</label>
            <p className="text-gray-900 dark:text-white">{company.name}</p>
          </div>
          {company.address_line1 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
              <p className="text-gray-900 dark:text-white">
                {[company.address_line1, company.address_line2, company.city, company.state, company.zip]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
            <p className="text-gray-900 dark:text-white">{formatDate(company.created_at)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Total Projects</label>
            <p className="text-gray-900 dark:text-white">{companyProjects.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Users Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Users ({companyUsers.length})</h2>
          </div>
          
          {companyUsers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No users assigned</p>
          ) : (
            <div className="space-y-3">
              {companyUsers.map((companyUser) => (
                <div key={companyUser.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {companyUser.first_name} {companyUser.last_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{companyUser.email}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveUser(companyUser.id)}
                    className="text-red-600 hover:text-red-500 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Projects ({companyProjects.length})</h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              View All Projects
            </button>
          </div>
          
          {companyProjects.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No projects created</p>
          ) : (
            <div className="space-y-3">
              {companyProjects.slice(0, 5).map((project) => (
                <div 
                  key={project.id} 
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created: {formatDate(project.created_at)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  {project.visit_count !== undefined && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Visits: {project.visit_count} | Samples: {project.sample_count || 0}
                    </p>
                  )}
                </div>
              ))}
              {companyProjects.length > 5 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
                  And {companyProjects.length - 5} more projects...
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assign User Modal */}
      <Modal
        isOpen={isAssignUserModalOpen}
        onClose={() => {
          setIsAssignUserModalOpen(false);
          setSelectedUserId('');
          setUserSearchTerm('');
        }}
        title="Assign Client to Company"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Clients
            </label>
            <input
              type="text"
              id="userSearch"
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
            />
          </div>

          <div>
            <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Client
            </label>
            <select
              id="userSelect"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
            >
              <option value="">Select a client...</option>
              {filteredUsers.map((availableUser) => (
                <option key={availableUser.id} value={availableUser.id}>
                  {availableUser.first_name} {availableUser.last_name} ({availableUser.email})
                </option>
              ))}
            </select>
          </div>

          {filteredUsers.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {userSearchTerm.trim() ? 'No clients match your search' : 'No available clients to assign'}
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={() => {
              setIsAssignUserModalOpen(false);
              setSelectedUserId('');
              setUserSearchTerm('');
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleAssignUser}
            disabled={!selectedUserId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Assign Client
          </button>
        </div>
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Company"
      >
        <form onSubmit={handleEditCompany} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Company Name *
            </label>
            <input
              type="text"
              id="edit-name"
              name="name"
              value={companyData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-address_line1" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address Line 1
            </label>
            <input
              type="text"
              id="edit-address_line1"
              name="address_line1"
              value={companyData.address_line1}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
            />
          </div>

          <div>
            <label htmlFor="edit-address_line2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address Line 2
            </label>
            <input
              type="text"
              id="edit-address_line2"
              name="address_line2"
              value={companyData.address_line2}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                City
              </label>
              <input
                type="text"
                id="edit-city"
                name="city"
                value={companyData.city}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
              />
            </div>

            <div>
              <label htmlFor="edit-state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                State
              </label>
              <input
                type="text"
                id="edit-state"
                name="state"
                value={companyData.state}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-zip" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ZIP Code
            </label>
            <input
              type="text"
              id="edit-zip"
              name="zip"
              value={companyData.zip}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update Company
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CompanyDetails;
