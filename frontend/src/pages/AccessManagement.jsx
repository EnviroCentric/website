import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useToken from "@galvanize-inc/jwtdown-for-react";

export default function AccessManagement() {
  const [pages, setPages] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [pendingRoles, setPendingRoles] = useState([]);
  const [pendingSecurityLevel, setPendingSecurityLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pageSearch, setPageSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const { token } = useToken();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const [pagesResponse, rolesResponse] = await Promise.all([
          fetch(`${apiUrl}/pages`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${apiUrl}/roles`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!pagesResponse.ok || !rolesResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [pagesData, rolesData] = await Promise.all([
          pagesResponse.json(),
          rolesResponse.json(),
        ]);

        setPages(pagesData);
        setRoles(rolesData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  const handlePageSelect = async (pageId) => {
    const newSelectedPages = selectedPages.includes(pageId)
      ? selectedPages.filter(id => id !== pageId)
      : [...selectedPages, pageId];

    setSelectedPages(newSelectedPages);

    if (newSelectedPages.length === 0) {
      setSelectedRoles([]);
      setPendingRoles([]);
      setPendingSecurityLevel(null);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const responses = await Promise.all(
        newSelectedPages.map(pageId =>
          fetch(`${apiUrl}/pages/${pageId}/roles`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
      );

      const data = await Promise.all(responses.map(r => r.json()));
      
      const commonRoles = data.reduce((acc, pageData) => {
        if (acc.length === 0) return pageData.roles;
        return acc.filter(roleId => pageData.roles.includes(roleId));
      }, []);

      // Find the highest minimum security level among selected pages
      const maxSecurityLevel = data.reduce((max, pageData) => {
        return Math.max(max, pageData.min_security_level || 0);
      }, 0);

      setSelectedRoles(commonRoles);
      setPendingRoles(commonRoles);
      setPendingSecurityLevel(maxSecurityLevel);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoleToggle = (roleId) => {
    const newPendingRoles = pendingRoles.includes(roleId)
      ? pendingRoles.filter(id => id !== roleId)
      : [...pendingRoles, roleId];

    setPendingRoles(newPendingRoles);
  };

  const handleSecurityLevelChange = (level) => {
    setPendingSecurityLevel(level);
  };

  const handleSubmit = async () => {
    if (selectedPages.length === 0) {
      setError('Please select at least one page');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      await Promise.all(
        selectedPages.map(pageId =>
          fetch(`${apiUrl}/pages/${pageId}/roles`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              role_ids: pendingRoles,
              min_security_level: pendingSecurityLevel 
            }),
          })
        )
      );

      setSelectedRoles(pendingRoles);
      setSuccess('Access permissions updated successfully');
      setError(null);
    } catch (err) {
      setError(err.message);
      setSuccess(null);
    }
  };

  const filteredPages = pages.filter(page =>
    page.name.toLowerCase().includes(pageSearch.toLowerCase())
  );

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(roleSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Access Management</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Pages</h2>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search pages..."
              value={pageSearch}
              onChange={(e) => setPageSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPages.map((page) => (
              <label
                key={page.page_id}
                className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedPages.includes(page.page_id)}
                  onChange={() => handlePageSelect(page.page_id)}
                  className="form-checkbox h-5 w-5 text-green-600 dark:text-green-400"
                />
                <span className="text-gray-900 dark:text-white">{page.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Access</h2>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search roles..."
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredRoles.map((role) => (
              <label
                key={role.role_id}
                className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={pendingRoles.includes(role.role_id)}
                  onChange={() => handleRoleToggle(role.role_id)}
                  className="form-checkbox h-5 w-5 text-green-600 dark:text-green-400"
                  disabled={selectedPages.length === 0}
                />
                <span className="text-gray-900 dark:text-white">{role.name}</span>
              </label>
            ))}
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Minimum Security Level</h3>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="10"
                value={pendingSecurityLevel || 0}
                onChange={(e) => handleSecurityLevelChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={selectedPages.length === 0}
              />
              <span className="text-gray-900 dark:text-white min-w-[2rem] text-center">
                {pendingSecurityLevel || 0}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Users must have at least this security level to access the selected pages
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={selectedPages.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
} 