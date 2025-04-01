import { getToken } from "@galvanize-inc/jwtdown-for-react";

/**
 * Check if an email exists in the system
 * @param email - Email address to check
 * @param baseUrl - API base URL
 */
export const checkEmailExists = async (email, baseUrl) => {
  if (!baseUrl) {
    throw new Error("API URL not configured. Please check your environment variables.");
  }

  try {
    const response = await fetch(`${baseUrl}/accounts/check-email/${email}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error("Email check error:", error);
    throw new Error("Unable to verify email. Please try again later.");
  }
};

/**
 * Login to set API token.
 * @param email - Email address of existing account
 * @param password - Password of existing account
 */
const login = async (email, password, baseUrl) => {
  if (!baseUrl) {
    throw new Error("API URL not configured. Please check your environment variables.");
  }

  // First check if the email exists
  try {
    const emailExists = await checkEmailExists(email, baseUrl);
    if (!emailExists) {
      throw new Error("email_not_found");
    }
  } catch (error) {
    if (error.message === "email_not_found") {
      throw error;
    }
    // If there's an error checking email, continue with login attempt
    console.warn("Email check failed, proceeding with login attempt");
  }

  const url = `${baseUrl}/token`;
  const form = new FormData();
  form.append("username", email);
  form.append("password", password);
  
  try {
    let result = await fetch(url, {
      method: "post",
      credentials: "include",
      body: form,
    });

    if (!result.ok) {
      if (result.status === 401) {
        // Since we already checked email exists, 401 means wrong password
        throw new Error("invalid_password");
      }
      
      // For any other error, try to get a meaningful message
      try {
        const errorData = await result.json();
        if (errorData.detail) {
          throw new Error(errorData.detail);
        }
      } catch {
        // If we can't parse the error, use a generic message
        throw new Error("Password is incorrect");
      }
    }

    const token = await getToken(baseUrl);
    
    // Cache the token and its expiry
    localStorage.setItem('authToken', token);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    return token;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Function to check if token is still valid (not expired)
export const isTokenValid = () => {
  const tokenTimestamp = localStorage.getItem('tokenTimestamp');
  if (!tokenTimestamp) return false;
  
  // Check if token is less than 1 hour old
  const ONE_HOUR = 1 * 60 * 60 * 1000;
  return (Date.now() - parseInt(tokenTimestamp)) < ONE_HOUR;
};

// Function to get cached token
export const getCachedToken = () => {
  if (isTokenValid()) {
    return localStorage.getItem('authToken');
  }
  return null;
};

export default login;