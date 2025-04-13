import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Define RoleItem component outside of the Profile component
const RoleItem = ({ role }) => (
  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mb-2">
    <div className="font-medium text-gray-900 dark:text-white">{role.name}</div>
    {role.description && (
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {role.description}
      </div>
    )}
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Security Level: {role.security_level}
    </div>
  </div>
);

const Profile = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/self`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        setUserData(data);
      } catch (err) {
        setError('Failed to load user data. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchUserData();
    }
  }, [token]);
  
  // Add a new useEffect to handle token changes
  useEffect(() => {
    if (!token) {
      navigate('/');
    }
  }, [token, navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Notice!</strong>
          <span className="block sm:inline"> No user data available.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <div className="bg-blue-500 dark:bg-blue-700 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">User Profile</h1>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Personal Information</h2>
                  <div className="mt-2">
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Full Name</span>
                      <div className="text-base font-medium text-gray-900 dark:text-white">
                        {userData.first_name} {userData.last_name}
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
                      <div className="text-base font-medium text-gray-900 dark:text-white">
                        {userData.email}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Account Information</h2>
                  <div className="mt-2">
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Created At</span>
                      <div className="text-base font-medium text-gray-900 dark:text-white">
                        {userData.created_at ? new Date(userData.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Last Updated</span>
                      <div className="text-base font-medium text-gray-900 dark:text-white">
                        {userData.updated_at ? new Date(userData.updated_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Last Login</span>
                      <div className="text-base font-medium text-gray-900 dark:text-white">
                        {userData.last_login ? new Date(userData.last_login).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Roles</h2>
                <div className="mt-2">
                  {!userData.roles || userData.roles.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400">No roles assigned</div>
                  ) : (
                    <div>
                      {userData.roles.map((role, index) => (
                        <RoleItem key={role.id || role.role_id || `role-${index}`} role={role} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <Link 
                to="/profile/update" 
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 