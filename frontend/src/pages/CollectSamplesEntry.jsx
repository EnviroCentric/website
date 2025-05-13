import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';

export default function CollectSamplesEntry() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [previousAddresses, setPreviousAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({ name: '', date: new Date().toISOString().split('T')[0] });
  const [newSample, setNewSample] = useState({ description: '' });
  const [project, setProject] = useState(null);

  useEffect(() => {
    fetchProjectDetails();
    fetchAddresses();
    fetchPreviousAddresses();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      setProject(response.data);
    } catch (err) {
      setError('Failed to fetch project details');
      console.error('Error fetching project details:', err);
    }
  };

  const fetchAddresses = async () => {
    try {
      const response = await api.get(`/api/v1/projects/${projectId}/addresses`);
      setAddresses(response.data);
    } catch (err) {
      setError('Failed to fetch addresses');
      console.error('Error fetching addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousAddresses = async () => {
    try {
      // Get all addresses for the project without date filter
      const response = await api.get(`/api/v1/projects/${projectId}/addresses`);
      // Filter out today's addresses and get unique names
      const today = new Date().toISOString().split('T')[0];
      const uniqueNames = [...new Set(
        response.data
          .filter(addr => addr.date !== today)
          .map(addr => addr.name)
      )].sort(); // Sort alphabetically
      setPreviousAddresses(uniqueNames);
    } catch (err) {
      console.error('Error fetching previous addresses:', err);
      setError('Failed to fetch previous addresses');
    }
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/api/v1/projects/${projectId}/addresses`, {
        name: newAddress.name,
        date: newAddress.date
      });
      setAddresses([...addresses, response.data]);
      setIsModalOpen(false);
      setNewAddress({ name: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      setError('Failed to create address');
      console.error('Error creating address:', err);
    }
  };

  const handleSelectAddress = (addressId) => {
    navigate(`/projects/${projectId}/collect-samples/${addressId}`);
  };

  const handleCreateSample = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/api/v1/samples/`, {
        address_id: selectedAddress.id,
        description: newSample.description
      });
      setIsSampleModalOpen(false);
      setNewSample({ description: '' });
      // Refresh addresses to show new sample
      fetchAddresses();
    } catch (err) {
      setError('Failed to create sample');
      console.error('Error creating sample:', err);
    }
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
      {/* Project Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {project?.name || 'Loading...'}
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Collect samples for addresses in this project
        </p>
      </div>

      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Project
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Create New Address Button */}
      <div className="mb-8">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Address
        </button>
      </div>

      {/* Add Sample Button */}
      {selectedAddress && (
        <div className="mb-8">
          <button
            onClick={() => setIsSampleModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Sample
          </button>
        </div>
      )}

      {/* Existing Addresses */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Today's Addresses
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {addresses.length === 0 ? (
            <div className="px-6 py-4 text-gray-500 dark:text-gray-400">
              No addresses created for today
            </div>
          ) : (
            addresses.map((address) => (
              <div
                key={address.id}
                onClick={() => {
                  handleSelectAddress(address.id);
                  setSelectedAddress(address);
                }}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {address.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Created: {new Date(address.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Address Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Address"
      >
        <form onSubmit={handleCreateAddress} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address Name
            </label>
            <input
              type="text"
              id="name"
              value={newAddress.name}
              onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={newAddress.date}
              onChange={(e) => setNewAddress({ ...newAddress, date: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Sample Modal */}
      <Modal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        title="Add New Sample"
      >
        <form onSubmit={handleCreateSample} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sample Description
            </label>
            <textarea
              id="description"
              value={newSample.description}
              onChange={(e) => setNewSample({ ...newSample, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows="3"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsSampleModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Add Sample
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 