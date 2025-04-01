import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import login from "./Auth";
import { useAuthContext } from "@galvanize-inc/jwtdown-for-react";
import { useNavigate } from "react-router-dom";

export default function LoginForm({ onClose, onSwitchToRegister, onLoginSuccess, successMessage }) {
  const { setToken, baseUrl } = useAuthContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [alert, setAlert] = useState({ type: "", message: "" });

  useEffect(() => {
    if (successMessage) {
      setAlert({
        type: "success",
        message: successMessage
      });
    }
  }, [successMessage]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear alert when user starts typing
    setAlert({ type: "", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAlert({ type: "", message: "" }); // Clear any existing alerts
    
    try {
      const token = await login(formData.email.toLowerCase(), formData.password, baseUrl);
      setToken(token);
      onLoginSuccess();
      onClose();
      navigate("/");
    } catch (error) {
      if (error.message === "email_not_found") {
        setAlert({
          type: "not_found",
          message: "We couldn't find an account with this email address."
        });
        // Keep the email but clear password
        setFormData(prev => ({ ...prev, password: "" }));
      } else if (error.message === "invalid_password") {
        setAlert({
          type: "error",
          message: "The password you entered is incorrect."
        });
        // Keep the email but clear password
        setFormData(prev => ({ ...prev, password: "" }));
      } else {
        setAlert({
          type: "error",
          message: error.message
        });
        // Clear both email and password for other errors
        setFormData({ email: "", password: "" });
      }
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    onSwitchToRegister();
  };

  return (
    <div className="p-6 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Login</h2>
      <form onSubmit={handleSubmit} id="loginform">
        <div className="space-y-4">
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
          </div>
          {alert.message && (
            <div
              className={`${
                alert.type === "not_found" 
                  ? "bg-blue-50 border-blue-400 text-blue-700" 
                  : alert.type === "success"
                  ? "bg-green-100 border-green-400 text-green-700"
                  : "bg-red-100 border-red-400 text-red-700"
              } border px-4 py-3 rounded relative`}
              role="alert"
            >
              <div className="flex flex-col">
                <div className="flex items-center">
                  <strong className="font-bold mr-2">
                    {alert.type === "not_found" ? "Notice:" : alert.type === "success" ? "Success:" : "Error:"}
                  </strong>
                  <span className="block sm:inline">{alert.message}</span>
                </div>
                {alert.type === "not_found" && (
                  <div className="mt-2">
                    <span className="text-sm">Need an account? </span>
                    <button
                      onClick={handleRegister}
                      type="button"
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                    >
                      Sign up now →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col space-y-4">
            <button 
              className="w-full bg-gray-500 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" 
              type="submit"
            >
              Login
            </button>
            <button 
              onClick={handleRegister}
              type="button"
              className="w-full text-center font-bold text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
            >
              Create account
            </button>
          </div>
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