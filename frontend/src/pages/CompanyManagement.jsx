import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';

const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
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
    fetchCompanies();
  }, [isAdmin, navigate]);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/api/v1/companies/');
      setCompanies(response.data);
    } catch (err) {
      setError('Failed to fetch companies');
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/v1/companies/', companyData);
      await fetchCompanies();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setError('Failed to create company');
      console.error('Error creating company:', err);
    }
  };

  const handleEditCompany = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/api/v1/companies/${editingCompany.id}`, companyData);
      await fetchCompanies();
      setIsEditModalOpen(false);
      setEditingCompany(null);
      resetForm();
    } catch (err) {
      setError('Failed to update company');
      console.error('Error updating company:', err);
    }
  };


  const openEditModal = (company) => {
    setEditingCompany(company);
    setCompanyData({
      name: company.name,
      address_line1: company.address_line1 || '',
      address_line2: company.address_line2 || '',
      city: company.city || '',
      state: company.state || '',
      zip: company.zip || ''
    });
    setIsEditModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Management</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create New Company
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {companies.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No companies created yet
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Create your first company to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 relative"
              onClick={() => navigate(`/companies/${company.id}`)}
            >
              {/* Action buttons - positioned absolutely to avoid triggering parent click */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering parent click
                    openEditModal(company);
                  }}
                  className="p-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                  title="Edit Company"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>

              <div className="pr-16"> {/* Add padding-right to avoid overlap with action buttons */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {company.name}
                </h3>
                {(company.address_line1 || company.city || company.state) && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                    {[company.address_line1, company.city, company.state, company.zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created: {formatDate(company.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Company Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create New Company"
      >
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Company Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={companyData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address Line 1
            </label>
            <input
              type="text"
              id="address_line1"
              name="address_line1"
              value={companyData.address_line1}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
            />
          </div>

          <div>
            <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address Line 2
            </label>
            <input
              type="text"
              id="address_line2"
              name="address_line2"
              value={companyData.address_line2}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={companyData.city}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={companyData.state}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="zip" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ZIP Code
            </label>
            <input
              type="text"
              id="zip"
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
                setIsCreateModalOpen(false);
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
              Create Company
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCompany(null);
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
                setEditingCompany(null);
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

export default CompanyManagement;