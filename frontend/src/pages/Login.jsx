import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { isValidEmail } from '../utils/validation';

export default function Login({ isOpen, onClose, onSwitchToRegister, successMessage }) {
  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem('loginFormData');
    return savedData ? JSON.parse(savedData) : {
      email: '',
      password: '',
    };
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('loginFormData', JSON.stringify(formData));
    }
  }, [formData, isOpen]);

  // Check email when component mounts
  useEffect(() => {
    if (isOpen && formData.email && isValidEmail(formData.email)) {
      checkEmailAvailability(formData.email);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const checkEmailAvailability = async (email) => {
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await api.get(`/users/check-email/${encodeURIComponent(email)}`);
      if (!response.data.exists) {
        setEmailError('This email is not registered. Would you like to create an account?');
      } else {
        setEmailError('');
      }
    } catch (err) {
      setEmailError('Error checking email availability');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailBlur = (e) => {
    const email = e.target.value;
    if (email) {
      checkEmailAvailability(email);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // If we already know this email isn't registered, prevent the login attempt
    if (emailError && emailError.includes('not registered')) {
      setIsLoading(false);
      return;
    }

    try {
      const formPayload = new FormData();
      formPayload.append('username', formData.email);
      formPayload.append('password', formData.password);
      
      const res = await api.post('/auth/login', formPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (res.data.access_token) {
        login(res.data.access_token);
        localStorage.removeItem('loginFormData');
        onClose();
        navigate(from, { replace: true });
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
        </div>
        {successMessage && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
            <div className="text-sm text-green-700 dark:text-green-400">
              {successMessage}
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                onBlur={handleEmailBlur}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  emailError ? 'border-red-300' : 'border-gray-300'
                } dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
              />
              {isCheckingEmail && (
                <div className="absolute right-0 top-0 mt-2 mr-2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            {emailError && (
              <div className="relative z-10 mb-4">
                <div className="mt-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shadow-sm">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-400 dark:text-red-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {emailError}
                      {emailError.includes('not registered') && (
                        <button
                          type="button"
                          onClick={onSwitchToRegister}
                          className="ml-1 font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          Create account
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                className="absolute inset-y-0 right-0 pr-3 flex items-center z-20"
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : null}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
            >
              Need an account? Register
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 