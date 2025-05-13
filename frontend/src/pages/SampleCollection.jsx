import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';

export default function SampleCollection() {
  const { projectId, addressId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [address, setAddress] = useState(null);
  const [project, setProject] = useState(null);
  const [editingDescriptions, setEditingDescriptions] = useState({});
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [newSampleDescription, setNewSampleDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchAddressAndSamples();
    fetchProjectDetails();
  }, [projectId, addressId]);

  const fetchProjectDetails = async () => {
    try {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      setProject(response.data);
    } catch (err) {
      console.error('Error fetching project details:', err);
    }
  };

  const fetchAddressAndSamples = async () => {
    try {
      // Fetch address details
      const addressResponse = await api.get(`/api/v1/projects/${projectId}/addresses/${addressId}`);
      setAddress(addressResponse.data);

      // Fetch samples for this address
      const samplesResponse = await api.get(`/api/v1/samples?address_id=${addressId}`);
      setSamples(samplesResponse.data);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSample = async (e) => {
    e.preventDefault();
    if (!newSampleDescription.trim()) return;
    setIsCreating(true);
    try {
      const response = await api.post('/api/v1/samples', {
        address_id: addressId,
        description: newSampleDescription
      });
      setSamples([...samples, response.data]);
      setNewSampleDescription('');
      setIsSampleModalOpen(false);
    } catch (err) {
      setError('Failed to create sample');
      console.error('Error creating sample:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartTimer = async (sampleId) => {
    try {
      const now = new Date().toISOString();
      await api.patch(`/api/v1/samples/${sampleId}`, {
        start_time: now
      });
      await fetchAddressAndSamples(); // Refresh to get updated times
    } catch (err) {
      setError('Failed to start timer');
      console.error('Error starting timer:', err);
    }
  };

  const handleStopTimer = async (sampleId) => {
    try {
      const now = new Date().toISOString();
      await api.patch(`/api/v1/samples/${sampleId}`, {
        stop_time: now
      });
      await fetchAddressAndSamples(); // Refresh to get updated times
    } catch (err) {
      setError('Failed to stop timer');
      console.error('Error stopping timer:', err);
    }
  };

  const handleUpdateDescription = async (sampleId, newDescription) => {
    try {
      await api.patch(`/api/v1/samples/${sampleId}`, {
        description: newDescription
      });
      await fetchAddressAndSamples(); // Refresh to get updated description
    } catch (err) {
      setError('Failed to update description');
      console.error('Error updating description:', err);
    }
  };

  const handleDescriptionChange = (sampleId, value) => {
    setEditingDescriptions(prev => ({
      ...prev,
      [sampleId]: value
    }));
  };

  const handleSaveDescription = async (sampleId) => {
    const newDescription = editingDescriptions[sampleId];
    if (newDescription !== undefined) {
      await handleUpdateDescription(sampleId, newDescription);
      setEditingDescriptions(prev => {
        const newState = { ...prev };
        delete newState[sampleId];
        return newState;
      });
    }
  };

  const formatDuration = (startTime, stopTime) => {
    if (!startTime) return 'Not started';
    if (!stopTime) return 'In progress';
    const start = new Date(startTime);
    const stop = new Date(stopTime);
    const duration = (stop - start) / 1000; // Convert to seconds
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
      <div className="mb-8">
        <button
          onClick={() => navigate(`/projects/${projectId}/collect-samples`)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Addresses
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
          {project?.name} - {address?.name}
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Collect samples at this address
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add Sample Button */}
      <div className="mb-8">
        <button
          onClick={() => setIsSampleModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Sample
        </button>
      </div>

      {/* Add Sample Modal */}
      <Modal isOpen={isSampleModalOpen} onClose={() => setIsSampleModalOpen(false)} title="Create New Sample">
        <form onSubmit={handleCreateSample} className="space-y-4">
          <div>
            <label htmlFor="sample-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sample Description
            </label>
            <textarea
              id="sample-description"
              value={newSampleDescription}
              onChange={(e) => setNewSampleDescription(e.target.value)}
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
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Sample'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Samples List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Samples
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {samples.length === 0 ? (
            <div className="px-6 py-4 text-gray-500 dark:text-gray-400">
              No samples collected yet
            </div>
          ) : (
            samples.map((sample) => (
              <div key={sample.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingDescriptions[sample.id] !== undefined 
                          ? editingDescriptions[sample.id] 
                          : sample.description || ''}
                        onChange={(e) => handleDescriptionChange(sample.id, e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white"
                      />
                      {editingDescriptions[sample.id] !== undefined && (
                        <button
                          onClick={() => handleSaveDescription(sample.id)}
                          className="px-2 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Save
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Duration: {formatDuration(sample.start_time, sample.stop_time)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!sample.start_time ? (
                      <button
                        onClick={() => handleStartTimer(sample.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Start
                      </button>
                    ) : !sample.stop_time ? (
                      <button
                        onClick={() => handleStopTimer(sample.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Stop
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 