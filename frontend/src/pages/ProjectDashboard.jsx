import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import api from '../services/api';
import Modal from '../components/Modal';

export default function ProjectDashboard() {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableTechnicians, setAvailableTechnicians] = useState([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState([]);
  const { projectId } = useParams();
  const { user } = useAuth();
  const { roles } = useRoles();
  const navigate = useNavigate();

  // Get the highest role level from user's roles
  const userRoleLevel = Math.max(...(user?.roles?.map(role => role.level) || [0]));
  const isSupervisorOrHigher = userRoleLevel >= 80; // Supervisor level is 80

  useEffect(() => {
    fetchProjectDetails();
    if (isSupervisorOrHigher) {
      fetchTechnicians();
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      setProject(response.data);
      // Get assigned technicians
      const techResponse = await api.get(`/api/v1/projects/${projectId}/technicians`);
      setAssignedTechnicians(techResponse.data);
    } catch (err) {
      setError('Failed to fetch project details');
      console.error('Error fetching project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      // Get users with role level >= 50 (technician level)
      const response = await api.get('/api/v1/users?min_role_level=50');
      setAvailableTechnicians(response.data);
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleAssignTechnicians = async () => {
    try {
      // Get currently assigned technician IDs
      const currentAssignedIds = assignedTechnicians.map(tech => tech.id);
      
      // Find technicians to add (selected but not currently assigned)
      const techniciansToAdd = selectedTechnicians.filter(id => !currentAssignedIds.includes(id));
      
      // Find technicians to remove (currently assigned but not selected)
      const techniciansToRemove = currentAssignedIds.filter(id => !selectedTechnicians.includes(id));
      
      // Add new technicians
      for (const techId of techniciansToAdd) {
        await api.post(`/api/v1/projects/${projectId}/technicians`, {
          user_id: techId
        });
      }
      
      // Remove unselected technicians
      for (const techId of techniciansToRemove) {
        await api.delete(`/api/v1/projects/${projectId}/technicians/${techId}`);
      }
      
      // Refresh project details to get updated technician list
      await fetchProjectDetails();
      setIsAssignModalOpen(false);
      setSelectedTechnicians([]);
    } catch (err) {
      setError('Failed to assign technicians');
      console.error('Error assigning technicians:', err);
    }
  };

  const handleUnassignTechnician = async (userId) => {
    try {
      await api.delete(`/api/v1/projects/${projectId}/technicians/${userId}`);
      // Refresh project details to get updated technician list
      await fetchProjectDetails();
    } catch (err) {
      setError('Failed to unassign technician');
      console.error('Error unassigning technician:', err);
    }
  };

  // Update selected technicians when modal opens
  useEffect(() => {
    if (isAssignModalOpen) {
      setSelectedTechnicians(assignedTechnicians.map(tech => tech.id));
    }
  }, [isAssignModalOpen, assignedTechnicians]);

  const handleAction = (action) => {
    // These functions will be implemented later
    switch (action) {
      case 'collect':
        console.log('Collect samples functionality to be implemented');
        break;
      case 'analyze':
        console.log('Analyze samples functionality to be implemented');
        break;
      case 'reports':
        console.log('View reports functionality to be implemented');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project not found
          </h2>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Projects
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {project.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Created: {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
          {isSupervisorOrHigher && (
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Manage Technicians
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => handleAction('collect')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 text-left"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Collect Samples
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Record and manage sample collection for this project
          </p>
        </button>

        <button
          onClick={() => handleAction('analyze')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 text-left"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Analyze Samples
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Process and analyze collected samples
          </p>
        </button>

        <button
          onClick={() => handleAction('reports')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 text-left"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            View Reports
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Access and generate project reports
          </p>
        </button>
      </div>

      {project.addresses && project.addresses.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Project Addresses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.addresses.map((address) => (
              <div
                key={address.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {address.name}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Date: {new Date(address.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      >
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage Technicians
          </h2>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Assign Technicians
            </h3>
            <div className="space-y-3">
              {availableTechnicians.map((tech) => (
                <label key={tech.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTechnicians.includes(tech.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTechnicians([...selectedTechnicians, tech.id]);
                      } else {
                        setSelectedTechnicians(selectedTechnicians.filter(id => id !== tech.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    {tech.first_name} {tech.last_name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignTechnicians}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 