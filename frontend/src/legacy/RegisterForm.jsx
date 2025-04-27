import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';

function RegisterForm({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirmation: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState('');
  const { register, checkEmailExists } = useAuth();
  const [emailError, setEmailError] = useState('');

  const [passwordRequirements, setPasswordRequirements] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false,
  });

  const validatePassword = (password, confirmPassword) => {
    setPasswordRequirements({
      hasMinLength: password.length >= 12,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      passwordsMatch: password === confirmPassword && password !== '',
    });
  };

  const handleEmailCheck = async (email) => {
    if (!email) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    try {
      const result = await checkEmailExists(email);
      if (result.error) {
        setEmailError(result.error);
      } else if (result.exists) {
        setEmailError(
          <div>
            This email is already registered. 
            <button 
              onClick={() => onSwitchToLogin()}
              className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Login instead?
            </button>
          </div>
        );
      } else {
        setEmailError('');
      }
    } catch {
      // Don't show errors to user, just clear any existing error
      setEmailError('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password' || name === 'password_confirmation') {
      validatePassword(
        name === 'password' ? value : formData.password,
        name === 'password_confirmation' ? value : formData.password_confirmation
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError) {
      setError('Please use a different email address or login instead.');
      return;
    }
    try {
      // Check if all password requirements are met
      const allRequirementsMet = Object.values(passwordRequirements).every(requirement => requirement);
      if (!allRequirementsMet) {
        setError('Please meet all password requirements');
        return;
      }
      const result = await register(formData);
      if (result.success) {
        onSwitchToLogin('Please login with your new account');
      } else {
        if (result.error?.toLowerCase().includes('already exists')) {
          setError(
            <div className="flex flex-col items-center">
              <p>An account with this email already exists.</p>
              <button 
                onClick={() => onSwitchToLogin()}
                className="mt-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                Click here to login instead
              </button>
            </div>
          );
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes('already exists')) {
        setError(
          <div className="flex flex-col items-center">
            <p>An account with this email already exists.</p>
            <button 
              onClick={() => onSwitchToLogin()}
              className="mt-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Click here to login instead
            </button>
          </div>
        );
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Register</h2>
      {error && (
        <div className="mb-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {typeof error === 'string' && error.includes('\n') ? (
            <ul className="list-disc list-inside">
              {error.split('\n').map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          ) : (
            error
          )}
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
            onBlur={(e) => handleEmailCheck(e.target.value)}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 ${
              emailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
            required
          />
          {emailError && (
            <div className="mt-1 text-sm text-red-600 dark:text-red-400">
              {emailError}
            </div>
          )}
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
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            name="password_confirmation"
            value={formData.password_confirmation}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <div className="mt-2 text-sm">
            <p className="text-gray-600 dark:text-gray-400 mb-2">Password Requirements:</p>
            <ul className="space-y-1">
              <li className={`flex items-center ${passwordRequirements.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="mr-2">{passwordRequirements.hasMinLength ? '✓' : '•'}</span>
                At least 12 characters
              </li>
              <li className={`flex items-center ${passwordRequirements.hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="mr-2">{passwordRequirements.hasUpperCase ? '✓' : '•'}</span>
                At least one uppercase letter
              </li>
              <li className={`flex items-center ${passwordRequirements.hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="mr-2">{passwordRequirements.hasLowerCase ? '✓' : '•'}</span>
                At least one lowercase letter
              </li>
              <li className={`flex items-center ${passwordRequirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="mr-2">{passwordRequirements.hasNumber ? '✓' : '•'}</span>
                At least one number
              </li>
              <li className={`flex items-center ${passwordRequirements.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="mr-2">{passwordRequirements.hasSpecialChar ? '✓' : '•'}</span>
                At least one special character (!@#$%^&amp;*(),.?&quot;:{}|&lt;&gt;)
              </li>
              <li className={`flex items-center ${passwordRequirements.passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="mr-2">{passwordRequirements.passwordsMatch ? '✓' : '•'}</span>
                Passwords match
              </li>
            </ul>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            First Name
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            Last Name
          </label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="flex flex-col items-center gap-4">
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => onSwitchToLogin()}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Already have an account? Login
          </button>
        </div>
      </form>
    </div>
  );
}

RegisterForm.propTypes = {
  onSwitchToLogin: PropTypes.func.isRequired
};

export default RegisterForm; 