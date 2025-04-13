import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PropTypes from 'prop-types';

function LoginForm({ onClose, onSwitchToRegister, onLoginSuccess, successMessage }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Login</h2>
      {successMessage && (
        <div className="mb-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-500 text-green-700 dark:text-green-400 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Login
          </button>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Need an account? Register
          </button>
        </div>
      </form>
    </div>
  );
}

LoginForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSwitchToRegister: PropTypes.func.isRequired,
  onLoginSuccess: PropTypes.func.isRequired,
  successMessage: PropTypes.string
};

export default LoginForm;