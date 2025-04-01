import { useState } from "react";
import PropTypes from 'prop-types';
import { useAuthContext } from "@galvanize-inc/jwtdown-for-react";

export default function RegisterForm({ onClose, onSwitchToLogin }) {
  const { baseUrl, login } = useAuthContext();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [alert, setAlert] = useState(null);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
    match: false
  });

  const checkPasswordRequirements = (password, confirmPassword) => {
    setPasswordChecks({
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      match: password === confirmPassword && password !== ""
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);

    if (name === "password" || name === "confirmPassword") {
      checkPasswordRequirements(
        name === "password" ? value : formData.password,
        name === "confirmPassword" ? value : formData.confirmPassword
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!Object.values(passwordChecks).every(check => check)) {
      setAlert({ 
        type: "error", 
        message: "Please ensure all password requirements are met" 
      });
      return;
    }

    const data = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email.toLowerCase(),
      password: formData.password,
      password_confirmation: formData.confirmPassword
    };

    try {
      const response = await fetch(`${baseUrl}/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.detail && errorData.detail.includes("already exists")) {
          setAlert({
            type: "info",
            message: "An account with this email address already exists.",
            showLogin: true
          });
        } else {
          setAlert({
            type: "error",
            message: errorData.detail || `Registration failed: ${response.statusText}`
          });
        }
        // Reset password checks on any error
        setPasswordChecks({
          length: false,
          uppercase: false,
          number: false,
          special: false,
          match: false
        });
        throw new Error(errorData.detail || `Registration failed: ${response.statusText}`);
      }

      // Registration successful, immediately redirect to login with success message
      onSwitchToLogin("Account created successfully! Please log in with your new credentials.");
    } catch (error) {
      setFormData(prev => ({
        ...prev,
        password: "",
        confirmPassword: ""
      }));
    }
  };

  const PasswordRequirement = ({ met, text }) => (
    <div className="flex items-center space-x-2 text-sm">
      <span className={`${met ? 'text-green-500' : 'text-red-500'}`}>
        {met ? '✓' : '✗'}
      </span>
      <span className={`${met ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
        {text}
      </span>
    </div>
  );

  PasswordRequirement.propTypes = {
    met: PropTypes.bool.isRequired,
    text: PropTypes.string.isRequired
  };

  return (
    <div className="p-6 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create Account</h2>
      <form onSubmit={handleSubmit} id="registerform">
        <div className="space-y-4">
          <div>
            <label
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
              htmlFor="first_name"
            >
              First Name
            </label>
            <input
              onChange={handleInputChange}
              required
              type="text"
              id="first_name"
              name="first_name"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={formData.first_name}
              placeholder="First Name"
            />
          </div>
          <div>
            <label
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
              htmlFor="last_name"
            >
              Last Name
            </label>
            <input
              onChange={handleInputChange}
              required
              type="text"
              id="last_name"
              name="last_name"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={formData.last_name}
              placeholder="Last Name"
            />
          </div>
          <div>
            <label
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              onChange={handleInputChange}
              required
              type="email"
              id="email"
              name="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={formData.email}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              onChange={handleInputChange}
              required
              type="password"
              id="password"
              name="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              value={formData.password}
              placeholder="******************"
            />
            <div className="mt-2 space-y-1">
              <PasswordRequirement met={passwordChecks.length} text="At least 12 characters long" />
              <PasswordRequirement met={passwordChecks.uppercase} text="Contains at least one uppercase letter" />
              <PasswordRequirement met={passwordChecks.number} text="Contains at least one number" />
              <PasswordRequirement met={passwordChecks.special} text="Contains at least one special character" />
            </div>
          </div>
          <div>
            <label
              className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <input
              onChange={handleInputChange}
              required
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              value={formData.confirmPassword}
              placeholder="******************"
            />
            <div className="mt-2">
              <PasswordRequirement met={passwordChecks.match} text="Passwords match" />
            </div>
          </div>
          {alert && (
            <div
              className={`${
                alert.type === "error"
                  ? "bg-red-100 border-red-400 text-red-700"
                  : "bg-blue-100 border-blue-400 text-blue-700"
              } border px-4 py-3 rounded relative`}
              role="alert"
            >
              <strong className="font-bold">
                {alert.type === "error" ? "Error: " : "Info: "}
              </strong>
              <span className="block sm:inline">{alert.message}</span>
              {alert.showLogin && (
                <div className="mt-2">
                  <button
                    onClick={onSwitchToLogin}
                    type="button"
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Click here to login
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col space-y-4">
            <button
              className="w-full bg-gray-500 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Create Account
            </button>
            <button
              onClick={onSwitchToLogin}
              type="button"
              className="w-full text-center font-bold text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
            >
              Back to Login
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

RegisterForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSwitchToLogin: PropTypes.func.isRequired
}; 