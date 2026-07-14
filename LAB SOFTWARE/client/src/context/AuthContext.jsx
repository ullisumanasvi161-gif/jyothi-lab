import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user credentials exist in localStorage
    const savedToken = localStorage.getItem('jyothi_token');
    const savedUser = localStorage.getItem('jyothi_user');

    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('jyothi_token');
        localStorage.removeItem('jyothi_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (phone, password, rememberMe) => {
    try {
      const response = await api.post('/auth/login', { phone, password, rememberMe });
      const { token, user: loggedUser } = response.data;

      localStorage.setItem('jyothi_token', token);
      localStorage.setItem('jyothi_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('jyothi_token');
    localStorage.removeItem('jyothi_user');
    setUser(null);
  };

  const forgotPassword = async (phone) => {
    try {
      await api.post('/auth/forgot-password', { phone });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send OTP. Please try again.';
      return { success: false, error: errorMsg };
    }
  };

  const resetPassword = async (phone, otp, newPassword) => {
    try {
      await api.post('/auth/reset-password', { phone, otp, newPassword });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to reset password. Please check your OTP.';
      return { success: false, error: errorMsg };
    }
  };

  // Helper check for role authorization
  const hasRole = (allowedRoles = []) => {
    if (!user) return false;
    if (user.role === 'Admin') return true; // Admins have absolute clearance
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, forgotPassword, resetPassword, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
